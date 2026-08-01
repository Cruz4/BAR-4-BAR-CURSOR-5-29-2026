import { NextResponse } from 'next/server';
import { GUEST_FUNNEL_EVENT_SET, type GuestFunnelEventName } from '@/lib/guest-funnel-events';
import { recordGuestFunnelEvent } from '@/lib/server/record-guest-funnel-event';
import { checkRateLimit } from '@/lib/server/rate-limit';

export const runtime = 'nodejs';

const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 40;

function clientIp(req: Request): string {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0]?.trim() || 'unknown';
  return req.headers.get('x-real-ip')?.trim() || 'unknown';
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const event = typeof body?.event === 'string' ? body.event : '';
    if (!GUEST_FUNNEL_EVENT_SET.has(event)) {
      return NextResponse.json({ error: 'Invalid event' }, { status: 400 });
    }

    const ip = clientIp(req);
    const { allowed } = checkRateLimit(`guest-funnel:${ip}`, MAX_PER_WINDOW, WINDOW_MS);
    if (!allowed) {
      return NextResponse.json({ ok: true, throttled: true });
    }

    const ref = typeof body?.ref === 'string' ? body.ref : 'organic';
    const metadata =
      body?.metadata && typeof body.metadata === 'object' && !Array.isArray(body.metadata)
        ? body.metadata
        : {};

    await recordGuestFunnelEvent(event as GuestFunnelEventName, { ref, metadata });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[analytics/guest-funnel]', err);
    return NextResponse.json({ error: 'Failed to record event' }, { status: 500 });
  }
}
