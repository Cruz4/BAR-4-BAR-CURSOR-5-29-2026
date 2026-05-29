import { NextResponse } from 'next/server';
import { verifyCheckoutUser, CheckoutAuthError } from '@/lib/stripe-server';
import { recordStudioEvent } from '@/lib/server/studio-analytics';
import type { AnalyticsEventName } from '@/lib/analytics-events';

export const runtime = 'nodejs';

const ALLOWED_EVENTS: AnalyticsEventName[] = [
  'signup',
  'session_start',
  'page_view',
  'track_editor_open',
  'pricing_view',
  'checkout_started',
  'checkout_completed',
  'upgrade_click',
  'free_limit_hit',
  'ai_action',
];

export async function POST(req: Request) {
  try {
    const { event, userId, metadata, userName } = await req.json();
    if (!event || !userId || !ALLOWED_EVENTS.includes(event)) {
      return NextResponse.json({ error: 'Invalid event payload' }, { status: 400 });
    }

    try {
      await verifyCheckoutUser(req, userId);
    } catch (e) {
      if (e instanceof CheckoutAuthError) {
        return NextResponse.json({ error: e.message }, { status: 401 });
      }
      throw e;
    }

    await recordStudioEvent(userId, event, metadata || {}, userName);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[analytics/event]', err);
    return NextResponse.json({ error: 'Failed to record event' }, { status: 500 });
  }
}
