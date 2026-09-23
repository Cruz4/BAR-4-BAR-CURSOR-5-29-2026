import { NextResponse } from 'next/server';
import { getDb } from '@/lib/firebase/server';
import { requireBearerUid } from '@/lib/server/render/auth';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  try {
    const uid = await requireBearerUid(request);
    const url = new URL(request.url);
    const albumId = url.searchParams.get('albumId')?.trim() || '';
    const trackId = url.searchParams.get('trackId')?.trim() || '';
    const jobId = url.searchParams.get('jobId')?.trim() || '';

    const db = await getDb();
    const snap = await db
      .collection(`users/${uid}/generatedTakes`)
      .orderBy('createdAt', 'desc')
      .limit(80)
      .get();
    let takes = snap.docs.map((d) => d.data());
    if (albumId) takes = takes.filter((t) => t.albumId === albumId);
    if (trackId) takes = takes.filter((t) => t.trackId === trackId);
    if (jobId) takes = takes.filter((t) => t.jobId === jobId);

    return NextResponse.json({ takes });
  } catch (err) {
    if (err instanceof Response) return err;
    console.error('[render/takes GET]', err);
    return NextResponse.json({ error: 'Failed to load takes' }, { status: 500 });
  }
}
