import { NextResponse } from 'next/server';
import { getAuth, getDb } from '@/lib/firebase/server';
import { normalizeGuestId } from '@/lib/guest-identity';
import { resolvePublicProfileSlugDoc } from '@/lib/server/profile-slug';
import { recordProfileView } from '@/lib/server/profile-views';
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

/** Count a unique visitor on Artist Home. Owner is ignored. */
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const slugRaw = typeof body.slug === 'string' ? body.slug.trim() : '';
    if (!slugRaw || slugRaw.length > 80) {
      return NextResponse.json({ error: 'Missing profile.' }, { status: 400 });
    }

    const viewerId = await optionalUid(req);
    const guestId = normalizeGuestId(body?.guestId);
    const ip = clientIp(req);
    const rateKey = viewerId
      ? `profile-view:${viewerId}`
      : guestId
        ? `profile-view:${guestId}`
        : `profile-view:${ip}`;
    const { allowed } = await checkRateLimit(rateKey, MAX_PER_WINDOW, WINDOW_MS);
    if (!allowed) {
      return NextResponse.json({ ok: true, counted: false, throttled: true });
    }

    if (!viewerId && !guestId) {
      return NextResponse.json({ ok: true, counted: false });
    }

    const db = await getDb();
    const resolved = await resolvePublicProfileSlugDoc(db, slugRaw);
    if (!resolved?.userId) {
      return NextResponse.json({ ok: true, counted: false });
    }

    const result = await recordProfileView(db, {
      slug: resolved.slug,
      ownerId: resolved.userId,
      viewerId,
      guestId,
    });
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    console.error('[profile/view]', err);
    return NextResponse.json({ error: 'Could not record view.' }, { status: 500 });
  }
}
