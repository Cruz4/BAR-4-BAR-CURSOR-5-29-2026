import { NextResponse } from 'next/server';
import { verifyCheckoutUser, CheckoutAuthError } from '@/lib/stripe-server';
import { recordStudioEvent } from '@/lib/server/studio-analytics';
import type { AnalyticsEventName } from '@/lib/analytics-events';
import { checkRateLimit } from '@/lib/server/rate-limit';

export const runtime = 'nodejs';

const ANALYTICS_WINDOW_MS = 60_000;
const ANALYTICS_MAX_PER_WINDOW = 60;

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
  'achievement_unlocked',
  'quest_step_complete',
  'streak_milestone',
  'share_card_generated',
  'share_card_opened',
  'leaderboard_view',
];

export async function POST(req: Request) {
  try {
    const { event, userId, metadata, userName } = await req.json();
    if (!event || !userId || !ALLOWED_EVENTS.includes(event)) {
      return NextResponse.json({ error: 'Invalid event payload' }, { status: 400 });
    }

    let uid: string;
    try {
      uid = await verifyCheckoutUser(req, userId);
    } catch (e) {
      if (e instanceof CheckoutAuthError) {
        return NextResponse.json({ error: e.message }, { status: 401 });
      }
      throw e;
    }

    const { allowed } = checkRateLimit(`analytics:${uid}`, ANALYTICS_MAX_PER_WINDOW, ANALYTICS_WINDOW_MS);
    if (!allowed) {
      return NextResponse.json({ error: 'Too many analytics events.' }, { status: 429 });
    }

    await recordStudioEvent(uid, event, metadata || {}, userName);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[analytics/event]', err);
    return NextResponse.json({ error: 'Failed to record event' }, { status: 500 });
  }
}
