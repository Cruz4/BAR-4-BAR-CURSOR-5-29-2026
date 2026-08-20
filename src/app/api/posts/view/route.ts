import { NextResponse } from 'next/server';
import { getAuth, getDb } from '@/lib/firebase/server';
import { normalizeGuestId } from '@/lib/guest-identity';
import { recordPostView } from '@/lib/server/post-views';
import { checkRateLimit } from '@/lib/server/rate-limit';

export const runtime = 'nodejs';

const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 40;

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

/** Count a unique viewer on a wall post / reverb. Owner is ignored. */
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const postId = typeof body.postId === 'string' ? body.postId.trim() : '';
    if (!postId || postId.length > 80) {
      return NextResponse.json({ error: 'Missing post.' }, { status: 400 });
    }

    const viewerId = await optionalUid(req);
    const guestId = normalizeGuestId(body?.guestId);
    const ip = clientIp(req);
    const rateKey = viewerId
      ? `post-view:${viewerId}`
      : guestId
        ? `post-view:${guestId}`
        : `post-view:${ip}`;
    const { allowed } = await checkRateLimit(rateKey, MAX_PER_WINDOW, WINDOW_MS);
    if (!allowed) {
      return NextResponse.json({ ok: true, counted: false, throttled: true });
    }

    if (!viewerId && !guestId) {
      return NextResponse.json({ ok: true, counted: false });
    }

    const db = await getDb();
    const result = await recordPostView(db, { postId, viewerId, guestId });
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    console.error('[posts/view]', err);
    return NextResponse.json({ error: 'Could not record view.' }, { status: 500 });
  }
}
