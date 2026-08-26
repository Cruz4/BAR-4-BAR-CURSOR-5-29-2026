import { NextResponse } from 'next/server';
import { getAuth, getDb } from '@/lib/firebase/server';
import {
  audioForPlay,
  isReleaseShareLive,
  loadShare,
  priceFromShare,
  userCanStreamFull,
} from '@/lib/server/drop-entitlements';
import { isFirstDropsEnabled } from '@/lib/server/first-drops-feature';

export const runtime = 'nodejs';

async function optionalUid(req: Request): Promise<string | null> {
  const header = req.headers.get('authorization');
  if (!header?.startsWith('Bearer ')) return null;
  try {
    return (await (await getAuth()).verifyIdToken(header.slice('Bearer '.length))).uid;
  } catch {
    return null;
  }
}

export async function GET(req: Request) {
  if (!(await isFirstDropsEnabled())) {
    return NextResponse.json({ error: 'First Drops is off' }, { status: 404 });
  }
  try {
    const { searchParams } = new URL(req.url);
    const shareId = (searchParams.get('shareId') || '').trim();
    const trackId = (searchParams.get('trackId') || '').trim() || undefined;
    if (!shareId) return NextResponse.json({ error: 'Missing release.' }, { status: 400 });

    const db = await getDb();
    const share = await loadShare(db, shareId);
    if (!share) return NextResponse.json({ error: 'Release not found.' }, { status: 404 });

    const viewerId = await optionalUid(req);
    const entitled = await userCanStreamFull({ db, share, userId: viewerId, trackId });
    const live = isReleaseShareLive(share);
    if (!live && !entitled) {
      return NextResponse.json({ error: 'This release is not public.' }, { status: 404 });
    }

    const audio = audioForPlay(share, trackId);
    const priced = priceFromShare(share, share.type === 'album' ? trackId : undefined);
    return NextResponse.json({
      shareId,
      ...(trackId ? { trackId } : {}),
      title: priced.title,
      artistName: share.ownerName || 'Bar4Bar artist',
      ownerId: share.ownerId,
      scope: share.type === 'album' && !trackId ? 'album' : 'track',
      price: priced.price,
      hasAudio: Boolean(audio?.storagePath),
      live,
    }, {
      headers: {
        'Cache-Control': viewerId ? 'private, no-store' : 'public, max-age=20, s-maxage=30',
        Vary: 'Authorization',
      },
    });
  } catch (error) {
    console.error('[drops/metadata]', error);
    return NextResponse.json({ error: 'Could not load release metadata.' }, { status: 500 });
  }
}
