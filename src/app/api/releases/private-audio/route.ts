import { NextResponse } from 'next/server';
import { getDb } from '@/lib/firebase/server';
import { normalizeDropAudio } from '@/lib/drop-commerce';
import { dropAudioFileUrl, mintDropAudioTicket } from '@/lib/server/drop-audio-stream';
import { CheckoutAuthError, verifyCheckoutUser } from '@/lib/stripe-server';
import { loadShareForManager } from '@/lib/server/house-release-manage';

export const runtime = 'nodejs';

function safeId(value: string): boolean {
  return value.length > 0 && value.length <= 200 && !value.includes('/');
}

export async function GET(req: Request) {
  try {
    const params = new URL(req.url).searchParams;
    const userId = (params.get('userId') || '').trim();
    const shareId = (params.get('shareId') || '').trim();
    let albumId = (params.get('albumId') || '').trim();
    let trackId = (params.get('trackId') || '').trim();
    if (!userId) {
      return NextResponse.json({ error: 'Invalid private song request.' }, { status: 400 });
    }
    try {
      await verifyCheckoutUser(req, userId);
    } catch (error) {
      if (error instanceof CheckoutAuthError) {
        return NextResponse.json({ error: error.message }, { status: 401 });
      }
      throw error;
    }
    const db = await getDb();
    let ownerId = userId;
    if (shareId) {
      const loaded = await loadShareForManager(db, shareId, userId);
      if (!loaded) return NextResponse.json({ error: 'You cannot open this recording.' }, { status: 403 });
      if (loaded.ref) {
        ownerId = loaded.ref.ownerId;
        albumId = loaded.ref.albumId;
        if (loaded.ref.trackId) trackId = loaded.ref.trackId;
      }
    }
    if (!safeId(albumId) || !safeId(trackId)) {
      return NextResponse.json({ error: 'Invalid private song request.' }, { status: 400 });
    }
    const snap = await db.doc(`users/${ownerId}/albums/${albumId}/tracks/${trackId}`).get();
    if (!snap.exists) return NextResponse.json({ error: 'Song was not found.' }, { status: 404 });
    const audio = normalizeDropAudio(snap.data()?.dropAudio);
    if (!audio?.storagePath) return NextResponse.json({ error: 'No private audio is attached.' }, { status: 404 });
    const kind = params.get('kind') === 'preview' ? 'preview' : 'full';
    const storagePath = kind === 'preview' ? audio.previewPath : audio.storagePath;
    if (!storagePath) return NextResponse.json({ error: 'That private audio file is not available.' }, { status: 404 });
    const ticket = mintDropAudioTicket({
      storagePath,
      ownerId,
      contentType: kind === 'preview' ? 'audio/wav' : audio.contentType || 'audio/mpeg',
      full: kind === 'full',
    });
    return NextResponse.json({
      url: dropAudioFileUrl(ticket),
      durationSec: audio.durationSec || null,
      fileName: kind === 'preview' ? 'preview.wav' : audio.fileName || 'Private recording',
      contentType: kind === 'preview' ? 'audio/wav' : audio.contentType || 'audio/mpeg',
    });
  } catch (error) {
    console.error('[releases/private-audio]', error);
    return NextResponse.json({ error: 'Could not open private audio.' }, { status: 500 });
  }
}
