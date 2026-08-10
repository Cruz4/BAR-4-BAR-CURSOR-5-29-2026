import { NextResponse } from 'next/server';
import { LOCK_FUNNEL_EVENT_SET, type LockFunnelEventName } from '@/lib/lock-funnel-events';
import { recordLockFunnelEvent } from '@/lib/server/record-lock-funnel-event';
import { checkRateLimit } from '@/lib/server/rate-limit';
import { isLockFeatureEnabled } from '@/lib/server/lock-feature';

export const runtime = 'nodejs';

const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 50;

function clientIp(req: Request): string {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0]?.trim() || 'unknown';
  return req.headers.get('x-real-ip')?.trim() || 'unknown';
}

export async function POST(req: Request) {
  try {
    if (!(await isLockFeatureEnabled())) {
      return NextResponse.json({ ok: true, skipped: true });
    }

    const body = await req.json();
    const event = typeof body?.event === 'string' ? body.event : '';
    if (!LOCK_FUNNEL_EVENT_SET.has(event)) {
      return NextResponse.json({ error: 'Invalid event' }, { status: 400 });
    }

    const ip = clientIp(req);
    const { allowed } = checkRateLimit(`lock-funnel:${ip}`, MAX_PER_WINDOW, WINDOW_MS);
    if (!allowed) {
      return NextResponse.json({ ok: true, throttled: true });
    }

    const ref = typeof body?.ref === 'string' ? body.ref : 'organic';
    const metadata =
      body?.metadata && typeof body.metadata === 'object' && !Array.isArray(body.metadata)
        ? body.metadata
        : {};

    await recordLockFunnelEvent(event as LockFunnelEventName, { ref, metadata });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[analytics/lock-funnel]', err);
    return NextResponse.json({ error: 'Failed to record event' }, { status: 500 });
  }
}
