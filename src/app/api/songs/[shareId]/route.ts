import { NextResponse } from 'next/server';
import { getAuth, getDb } from '@/lib/firebase/server';
import { getPressedSongSummary } from '@/lib/server/pressed-song';
import { loadShare } from '@/lib/server/drop-entitlements';

export const runtime = 'nodejs';

async function viewerId(req: Request): Promise<string | null> {
  const header = req.headers.get('authorization');
  if (!header?.startsWith('Bearer ')) return null;
  try {
    return (await (await getAuth()).verifyIdToken(header.slice('Bearer '.length))).uid;
  } catch {
    return null;
  }
}

export async function GET(req: Request, { params }: { params: Promise<{ shareId: string }> }) {
  try {
    const { shareId } = await params;
    const uid = await viewerId(req);
    const summary = await getPressedSongSummary(await getDb(), shareId, uid);
    if (!summary) return NextResponse.json({ error: 'Music release not found' }, { status: 404 });
    return NextResponse.json(summary, {
      headers: {
        'Cache-Control': uid ? 'private, no-store' : 'public, max-age=30, s-maxage=60',
        Vary: 'Authorization',
      },
    });
  } catch (error) {
    console.error('[songs/summary]', error);
    return NextResponse.json({ error: 'Could not load pressed song' }, { status: 500 });
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ shareId: string }> }) {
  try {
    const uid = await viewerId(req);
    if (!uid) return NextResponse.json({ error: 'Sign in required' }, { status: 401 });
    const { shareId } = await params;
    const body = (await req.json()) as { supporterCreditPublic?: unknown };
    if (typeof body.supporterCreditPublic !== 'boolean') {
      return NextResponse.json({ error: 'Invalid supporter credit setting' }, { status: 400 });
    }
    const db = await getDb();
    const [share, library] = await Promise.all([
      loadShare(db, shareId),
      db.collection('users').doc(uid).collection('dropLibrary').doc(shareId).get(),
    ]);
    if (!share || !library.exists || share.ownerId === uid) {
      return NextResponse.json({ error: 'A verified purchase is required' }, { status: 403 });
    }
    const sales = await db
      .collection('users')
      .doc(share.ownerId)
      .collection('dropEarnings')
      .where('shareId', '==', shareId)
      .get();
    const verifiedBuyer = sales.docs.some((sale) => {
      const data = sale.data();
      return data.status !== 'failed' && data.buyerId === uid && Number(data.amountCents || 0) > 0;
    });
    if (!verifiedBuyer) {
      return NextResponse.json({ error: 'A verified purchase is required' }, { status: 403 });
    }
    await library.ref.set({ supporterCreditPublic: body.supporterCreditPublic }, { merge: true });
    return NextResponse.json({ supporterCreditPublic: body.supporterCreditPublic });
  } catch (error) {
    console.error('[songs/supporter-credit]', error);
    return NextResponse.json({ error: 'Could not update supporter credit' }, { status: 500 });
  }
}
