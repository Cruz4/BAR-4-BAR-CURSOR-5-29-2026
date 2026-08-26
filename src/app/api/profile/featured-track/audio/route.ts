import { NextResponse } from 'next/server';
import { getAuth, getDb } from '@/lib/firebase/server';
import { DROP_PREVIEW_SECONDS } from '@/lib/drop-commerce';
import { getArtistHomeConfig } from '@/lib/server/artist-home';
import { loadAudioForPlay, loadShare, userCanStreamFull } from '@/lib/server/drop-entitlements';
import { dropAudioFileUrl, mintDropAudioTicket } from '@/lib/server/drop-audio-stream';
import { isFirstDropsEnabled } from '@/lib/server/first-drops-feature';
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
    const profileUserId = (searchParams.get('profileUserId') || '').trim();
    const shareId = (searchParams.get('shareId') || '').trim();
    const trackId = (searchParams.get('trackId') || '').trim() || undefined;
    if (!profileUserId || !shareId) {
      return NextResponse.json({ error: 'Missing featured track.' }, { status: 400 });
    }

    const config = await getArtistHomeConfig(profileUserId);
    const selected = config.featured.featuredTrack;
    if (!selected || selected.shareId !== shareId || (selected.trackId || undefined) !== trackId) {
      return NextResponse.json({ error: 'This track is no longer featured.' }, { status: 404 });
    }

    const db = await getDb();
    const share = await loadShare(db, shareId);
    if (!share) return NextResponse.json({ error: 'This drop is offline.' }, { status: 404 });
    const audio = await loadAudioForPlay(db, share, trackId);
    if (!audio?.storagePath) {
      return NextResponse.json({ error: 'No audio on this drop yet.' }, { status: 404 });
    }

    const userId = await optionalUid(req);
    const full = await userCanStreamFull({ db, share, userId, trackId });
    const excerptStartSec = Math.max(0, Number(selected.excerptStartSec) || 0);
    const path = full
      ? audio.storagePath
      : selected.previewPath || audio.previewPath || audio.storagePath;
    const contentType = full
      ? audio.contentType || 'audio/mpeg'
      : selected.previewPath
        ? 'audio/wav'
        : audio.previewPath
          ? 'audio/wav'
          : audio.contentType || 'audio/mpeg';
    const durationSec = Math.max(1, Number(audio.durationSec) || DROP_PREVIEW_SECONDS);
    const playbackStartSec = full ? Math.min(excerptStartSec, Math.max(0, durationSec - 1)) : 0;
    const eligibleDurationSec = full
      ? Math.max(1, durationSec - playbackStartSec)
      : Math.max(1, Math.min(DROP_PREVIEW_SECONDS, durationSec - excerptStartSec));
    const pathOwnerId = path.startsWith('profile-previews/') ? profileUserId : share.ownerId;
    const ticket = mintDropAudioTicket({ storagePath: path, ownerId: pathOwnerId, contentType, full });
    const listener = resolveDropListenerIdentity(req, userId);
    const listenProof = mintDropListenProof({
      shareId,
      trackId,
      listenerKey: listener.key,
      authenticated: listener.authenticated,
      full,
      eligibleDurationSec,
      ...(profileUserId !== share.ownerId ? { referralUserId: profileUserId } : {}),
    });
    const response = NextResponse.json({
      url: dropAudioFileUrl(ticket),
      full,
      preview: !full,
      houseRelease: share.houseRelease === true,
      durationSec,
      eligibleDurationSec,
      playbackStartSec,
      excerptStartSec,
      listenProof,
      contentType,
    });
    if (listener.setCookie) response.headers.append('Set-Cookie', listener.setCookie);
    return response;
  } catch (err) {
    console.error('[profile/featured-track/audio]', err);
    return NextResponse.json({ error: 'Could not open this featured track.' }, { status: 500 });
  }
}
