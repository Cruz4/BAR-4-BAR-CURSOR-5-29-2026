import { NextResponse } from 'next/server';
import { getAuth, getDb } from '@/lib/firebase/server';
import { isReleaseShareLive, loadAudioForPlay, loadShare, userCanStreamFull } from '@/lib/server/drop-entitlements';
import { isFirstDropsEnabled } from '@/lib/server/first-drops-feature';
import { dropAudioFileUrl, mintDropAudioTicket } from '@/lib/server/drop-audio-stream';
import { DROP_PREVIEW_SECONDS } from '@/lib/drop-commerce';
import { resolveDropListenerIdentity } from '@/lib/server/drop-listener-identity';
import { mintDropListenProof } from '@/lib/server/drop-listen-proof';

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
    return NextResponse.json({ error: 'Music Releases is off' }, { status: 404 });
  }
  try {
    const { searchParams } = new URL(req.url);
    const shareId = (searchParams.get('shareId') || '').trim();
    const trackId = (searchParams.get('trackId') || '').trim() || undefined;
    const referralPostId = (searchParams.get('referralPostId') || '').trim().slice(0, 128);
    if (!shareId) return NextResponse.json({ error: 'Missing drop.' }, { status: 400 });

    const db = await getDb();
    const share = await loadShare(db, shareId);
    if (!share) return NextResponse.json({ error: 'This drop is offline.' }, { status: 404 });

    const audio = await loadAudioForPlay(db, share, trackId);
    if (!audio?.storagePath) {
      return NextResponse.json({ error: 'No audio on this drop yet.' }, { status: 404 });
    }

    const userId = await optionalUid(req);
    const full = await userCanStreamFull({ db, share, userId, trackId });
    if (!isReleaseShareLive(share) && !full) {
      return NextResponse.json({ error: 'This release is no longer public.' }, { status: 404 });
    }
    const path = full ? audio.storagePath : audio.previewPath || audio.storagePath;
    if (!path) return NextResponse.json({ error: 'Audio is not ready.' }, { status: 404 });

    const contentType = full ? audio.contentType || 'audio/mpeg' : 'audio/wav';
    const ticket = mintDropAudioTicket({ storagePath: path, ownerId: share.ownerId, contentType, full });
    const listener = resolveDropListenerIdentity(req, userId);
    const eligibleDurationSec = full
      ? Math.max(1, audio.durationSec || DROP_PREVIEW_SECONDS)
      : Math.max(1, Math.min(DROP_PREVIEW_SECONDS, audio.durationSec || DROP_PREVIEW_SECONDS));
    let referralUserId: string | undefined;
    if (referralPostId) {
      const post = await db.doc(`posts/${referralPostId}`).get();
      const postData = post.data() || {};
      const embedded = typeof postData.embedUrl === 'string' ? postData.embedUrl : '';
      const linkedShareId = embedded.match(/\/(?:song|share)\/([^/?#]+)/)?.[1];
      const postOwnerId = typeof postData.ownerId === 'string' ? postData.ownerId : '';
      if (post.exists && linkedShareId && decodeURIComponent(linkedShareId) === shareId && postOwnerId && postOwnerId !== share.ownerId) {
        referralUserId = postOwnerId;
      }
    }
    const listenProof = mintDropListenProof({
      shareId,
      trackId,
      listenerKey: listener.key,
      authenticated: listener.authenticated,
      full,
      eligibleDurationSec,
      ...(referralUserId ? { referralUserId } : {}),
    });
    const response = NextResponse.json({
      url: dropAudioFileUrl(ticket),
      full,
      preview: !full,
      houseRelease: share.houseRelease === true,
      durationSec: audio.durationSec ?? null,
      eligibleDurationSec,
      listenProof,
      contentType,
    });
    if (listener.setCookie) response.headers.append('Set-Cookie', listener.setCookie);
    return response;
  } catch (err: unknown) {
    const raw = err instanceof Error ? err.message : 'Stream failed';
    console.error('[drops/audio]', err);
    const message = /iam\.|signBlob|Permission denied/i.test(raw)
      ? 'Could not open this stream.'
      : raw;
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
