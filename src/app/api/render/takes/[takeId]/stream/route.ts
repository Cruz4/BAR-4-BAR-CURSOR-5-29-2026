import { NextResponse } from 'next/server';
import { getDb } from '@/lib/firebase/server';
import { requireBearerUid } from '@/lib/server/render/auth';
import { downloadTakeAudio } from '@/lib/server/render/take-audio-storage';
import type { GeneratedTakeRecord } from '@/lib/song-generation/types';

export const runtime = 'nodejs';

export async function GET(
  request: Request,
  context: { params: Promise<{ takeId: string }> }
) {
  try {
    const uid = await requireBearerUid(request);
    const { takeId } = await context.params;
    const url = new URL(request.url);
    const delivery = url.searchParams.get('delivery');

    const db = await getDb();
    const snap = await db.doc(`users/${uid}/generatedTakes/${takeId}`).get();
    if (!snap.exists) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    const take = snap.data() as GeneratedTakeRecord;
    if (take.modelFamily !== 'ace-step') {
      const msg = 'This take is not a full ACE song. Generate again to render your lyrics.';
      return delivery === 'binary'
        ? new NextResponse(msg, { status: 409 })
        : NextResponse.json({ available: false, reason: 'preview_stub', error: msg });
    }
    if (!take.streamStoragePath) {
      return delivery === 'binary'
        ? new NextResponse('No audio file', { status: 404 })
        : NextResponse.json({ available: false, reason: 'no_path' });
    }

    const audio = await downloadTakeAudio(take.streamStoragePath);
    if (!audio) {
      const msg =
        'No audio file for this take — it was created before ACE was connected or the render failed. Generate a new take after FAL_KEY is installed.';
      return delivery === 'binary'
        ? new NextResponse(msg, { status: 404 })
        : NextResponse.json({ available: false, reason: 'not_uploaded_yet', error: msg });
    }

    const mime = take.streamStoragePath.endsWith('.mp3')
      ? 'audio/mpeg'
      : take.streamStoragePath.endsWith('.m4a')
        ? 'audio/mp4'
        : 'audio/wav';

    if (delivery === 'binary') {
      return new NextResponse(new Uint8Array(audio), {
        status: 200,
        headers: {
          'Content-Type': mime,
          'Content-Length': String(audio.length),
          'Cache-Control': 'private, max-age=120',
          'X-Akasheet-Preview-Stub': '0',
        },
      });
    }

    return NextResponse.json({
      available: true,
      previewStub: false,
      useBinaryUrl: `/api/render/takes/${takeId}/stream?delivery=binary`,
    });
  } catch (err) {
    if (err instanceof Response) return err;
    console.error('[render/takes/stream]', err);
    return NextResponse.json({ error: 'Failed to load stream' }, { status: 500 });
  }
}
