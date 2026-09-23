import { NextResponse } from 'next/server';
import { getDb } from '@/lib/firebase/server';
import { requireBearerUid } from '@/lib/server/render/auth';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  try {
    const uid = await requireBearerUid(request);
    const url = new URL(request.url);
    const approvedOnly = url.searchParams.get('approved') === '1';
    const db = await getDb();
    const snap = await db
      .collection(`users/${uid}/generatedTakes`)
      .orderBy('createdAt', 'desc')
      .limit(100)
      .get();
    let takes = snap.docs.map((d) => d.data());
    if (approvedOnly) {
      takes = takes.filter((t) => Boolean(t.approvedAt));
    }
    return NextResponse.json({ takes });
  } catch (err) {
    if (err instanceof Response) return err;
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
