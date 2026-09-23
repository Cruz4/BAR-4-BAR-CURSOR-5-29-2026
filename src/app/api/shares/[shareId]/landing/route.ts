import { NextResponse } from 'next/server';
import { getAuth, getDb } from '@/lib/firebase/server';
import { recordShareLanding, visitorContextFromRequest } from '@/lib/server/reach-analytics';
import { resolveVisitorGuestId } from '@/lib/server/visitor-guest';
import { checkRateLimit } from '@/lib/server/rate-limit';

export const runtime = 'nodejs';

const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 30;

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

function clientIp(req: Request): string {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0]?.trim() || 'unknown';
  return req.headers.get('x-real-ip')?.trim() || 'unknown';
}

export async function POST(
  req: Request,
  context: { params: Promise<{ shareId: string }> }
) {
  try {
    const shareId = (await context.params).shareId?.trim().toUpperCase().slice(0, 200);
    if (!shareId) {
      return NextResponse.json({ error: 'Invalid share.' }, { status: 400 });
    }

    const viewerId = await optionalUid(req);
    const body = await req.json().catch(() => ({}));
    const guestId = resolveVisitorGuestId(req, body?.guestId);
    const ip = clientIp(req);
    const rateKey = viewerId
      ? `share-landing:${viewerId}:${shareId}`
      : guestId
        ? `share-landing:${guestId}:${shareId}`
        : `share-landing:${ip}:${shareId}`;
    const { allowed } = await checkRateLimit(rateKey, MAX_PER_WINDOW, WINDOW_MS);
    if (!allowed) {
      return NextResponse.json({ ok: true, counted: false, throttled: true });
    }

    if (!viewerId && !guestId) {
      return NextResponse.json({ ok: true, counted: false });
    }

    const db = await getDb();
    const snap = await db.doc(`shares/${shareId}`).get();
    if (!snap.exists) {
      return NextResponse.json({ ok: true, counted: false });
    }
    const raw = snap.data() as Record<string, unknown>;
    const ownerId = String(raw.ownerId || '');
    if (!ownerId) return NextResponse.json({ ok: true, counted: false });

    const ctx = await visitorContextFromRequest(req);
    const result = await recordShareLanding(db, {
      shareId,
      ownerId,
      viewerId,
      guestId,
      ctx,
    });
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    console.error('[shares/landing]', err);
    return NextResponse.json({ error: 'Could not record landing.' }, { status: 500 });
  }
}
