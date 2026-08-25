import { NextResponse } from 'next/server';
import { normalizeMarketingRef } from '@/lib/marketing-attribution';
import { guestAliasFromId, normalizeGuestAlias, normalizeGuestId } from '@/lib/guest-identity';
import { enqueueAdminAlert } from '@/lib/server/admin-alerts';
import { recordLandingHit } from '@/lib/server/record-landing-hit';
import { checkRateLimit } from '@/lib/server/rate-limit';

export const runtime = 'nodejs';

const WINDOW_MS = 5 * 60_000;
const MAX_PER_WINDOW = 12;
const VISIT_ALERT_PATHS = new Set(['/', '/pricing', '/login', '/welcome', '/discover']);

function clientIp(req: Request): string {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0]?.trim() || 'unknown';
  return req.headers.get('x-real-ip')?.trim() || 'unknown';
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const path =
      typeof body?.path === 'string' && body.path.startsWith('/')
        ? body.path.slice(0, 120)
        : '/';

    if (!VISIT_ALERT_PATHS.has(path)) {
      return NextResponse.json({ error: 'Unsupported path' }, { status: 400 });
    }

    const rawRef = typeof body?.ref === 'string' ? body.ref.trim().toLowerCase() : '';
    let ref =
      rawRef === 'organic'
        ? 'organic'
        : normalizeMarketingRef(typeof body?.ref === 'string' ? body.ref : null);
    if (!ref) ref = 'organic';

    const guestId = normalizeGuestId(body?.guestId);
    const guestAlias =
      normalizeGuestAlias(body?.guestAlias) || (guestId ? guestAliasFromId(guestId) : null);

    const ip = clientIp(req);
    const rateKey = guestId
      ? `landing-hit:${guestId}:${ref}:${path}`
      : `landing-hit:${ip}:${ref}:${path}`;
    const { allowed } = await checkRateLimit(rateKey, MAX_PER_WINDOW, WINDOW_MS);
    if (!allowed) {
      return NextResponse.json({ ok: true, throttled: true });
    }

    await enqueueAdminAlert({
      kind: 'landing_hit',
      ref,
      path,
      guestId,
      guestAlias,
    });
    await recordLandingHit(ref, path, { guestId, guestAlias });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[analytics/landing-hit]', err);
    return NextResponse.json({ error: 'Failed to record landing hit' }, { status: 500 });
  }
}
