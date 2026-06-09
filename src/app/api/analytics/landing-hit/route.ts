import { NextResponse } from 'next/server';
import { normalizeMarketingRef } from '@/lib/marketing-attribution';
import { enqueueAdminAlert } from '@/lib/server/admin-alerts';
import { recordLandingHit } from '@/lib/server/record-landing-hit';
import { checkRateLimit } from '@/lib/server/rate-limit';

export const runtime = 'nodejs';

const WINDOW_MS = 5 * 60_000;
const MAX_PER_WINDOW = 8;

function clientIp(req: Request): string {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0]?.trim() || 'unknown';
  return req.headers.get('x-real-ip')?.trim() || 'unknown';
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const ref = normalizeMarketingRef(typeof body?.ref === 'string' ? body.ref : null);
    if (!ref) {
      return NextResponse.json({ error: 'Missing ref' }, { status: 400 });
    }

    const path =
      typeof body?.path === 'string' && body.path.startsWith('/')
        ? body.path.slice(0, 120)
        : '/';

    const ip = clientIp(req);
    const { allowed } = checkRateLimit(`landing-hit:${ip}:${ref}`, MAX_PER_WINDOW, WINDOW_MS);
    if (!allowed) {
      return NextResponse.json({ ok: true, throttled: true });
    }

    await enqueueAdminAlert({ kind: 'landing_hit', ref, path });
    await recordLandingHit(ref, path);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[analytics/landing-hit]', err);
    return NextResponse.json({ error: 'Failed to record landing hit' }, { status: 500 });
  }
}
