import { NextResponse } from 'next/server';
import { getAuth, getDb } from '@/lib/firebase/server';
import { canManageReleaseShare } from '@/lib/house-artist-link';
import { getShareReachAnalytics, parseReachAnalyticsDays } from '@/lib/server/reach-analytics';

export const runtime = 'nodejs';

async function requireUid(req: Request): Promise<string | null> {
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

export async function GET(
  req: Request,
  context: { params: Promise<{ shareId: string }> }
) {
  try {
    const uid = await requireUid(req);
    if (!uid) {
      return NextResponse.json({ error: 'Sign in required.' }, { status: 401 });
    }

    const shareId = (await context.params).shareId?.trim().toUpperCase().slice(0, 200);
    if (!shareId) {
      return NextResponse.json({ error: 'Invalid share.' }, { status: 400 });
    }

    const days = parseReachAnalyticsDays(new URL(req.url).searchParams.get('days'));

    const db = await getDb();
    const snap = await db.doc(`shares/${shareId}`).get();
    if (!snap.exists) {
      return NextResponse.json({ error: 'Not found.' }, { status: 404 });
    }
    const raw = snap.data() as Record<string, unknown>;
    if (!canManageReleaseShare(raw, uid)) {
      return NextResponse.json({ error: 'Not allowed.' }, { status: 403 });
    }

    const analytics = await getShareReachAnalytics(db, shareId, days);
    if (!analytics) {
      return NextResponse.json({ error: 'Not found.' }, { status: 404 });
    }

    return NextResponse.json(analytics);
  } catch (err) {
    console.error('[shares/reach]', err);
    return NextResponse.json({ error: 'Could not load reach.' }, { status: 500 });
  }
}
