import { NextResponse } from 'next/server';
import { getAuth, getDb } from '@/lib/firebase/server';
import { audioForPlay, loadShare, userCanStreamFull } from '@/lib/server/drop-entitlements';
import { isFirstDropsEnabled } from '@/lib/server/first-drops-feature';
import { dropAudioFileUrl, mintDropAudioTicket } from '@/lib/server/drop-audio-stream';

export const runtime = 'nodejs';

async function optionalUid(req: Request): Promise<string | null> {
  const header = req.headers.get('authorization');
  if (!header?.startsWith('Bearer ')) return null;
  try {
    const auth = await getAuth();
    const decoded = await auth.verifyIdToken(header.slice('Bearer '.length));
    return decoded.uid;
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
    if (!shareId) return NextResponse.json({ error: 'Missing drop.' }, { status: 400 });

    const db = await getDb();
    const share = await loadShare(db, shareId);
    if (!share) return NextResponse.json({ error: 'This drop is offline.' }, { status: 404 });

    const audio = audioForPlay(share, trackId);
    if (!audio?.storagePath) {
      return NextResponse.json({ error: 'No audio on this drop yet.' }, { status: 404 });
    }

    const userId = await optionalUid(req);
    const full = await userCanStreamFull({ db, share, userId, trackId });
    const path = full ? audio.storagePath : audio.previewPath || audio.storagePath;
    if (!path) return NextResponse.json({ error: 'Audio is not ready.' }, { status: 404 });

    const contentType = full ? audio.contentType || 'audio/mpeg' : 'audio/wav';
    const ticket = mintDropAudioTicket({ storagePath: path, contentType, full });
    return NextResponse.json({
      url: dropAudioFileUrl(ticket),
      full,
      preview: !full,
      durationSec: audio.durationSec ?? null,
      contentType,
    });
  } catch (err: unknown) {
    const raw = err instanceof Error ? err.message : 'Stream failed';
    console.error('[drops/audio]', err);
    const message = /iam\.|signBlob|Permission denied/i.test(raw)
      ? 'Could not open this stream.'
      : raw;
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
