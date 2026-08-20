import { NextResponse } from 'next/server';
import { verifyCheckoutUser, CheckoutAuthError } from '@/lib/stripe-server';
import { enqueueAdminAlert } from '@/lib/server/admin-alerts';
import { enqueueSignupAlertOnce } from '@/lib/server/signup-alert';
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
  'low_ink_hit',
  'ink_depletion',
  'trial_quest_complete',
  'free_limit_hit',
  'achievement_unlocked',
  'quest_step_complete',
  'streak_milestone',
  'share_card_generated',
  'share_card_opened',
  'leaderboard_view',
  'profile_post_created',
  'profile_reverb',
  'profile_friend_request',
  'profile_friend_accept',
  'profile_guestbook_signed',
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

    const { allowed } = await checkRateLimit(`analytics:${uid}`, ANALYTICS_MAX_PER_WINDOW, ANALYTICS_WINDOW_MS);
    if (!allowed) {
      return NextResponse.json({ error: 'Too many analytics events.' }, { status: 429 });
    }

    await recordStudioEvent(uid, event, metadata || {}, userName);

    const auth = await import('@/lib/firebase/server').then((m) => m.getAuth());
    const userRecord = await auth.getUser(uid).catch(() => null);
    const userEmail = userRecord?.email || null;

    if (event === 'signup') {
      const ref = typeof metadata?.ref === 'string' ? metadata.ref : null;
      const method = typeof metadata?.method === 'string' ? metadata.method : null;
      const { guestAliasFromId, normalizeGuestAlias, normalizeGuestId } = await import(
        '@/lib/guest-identity'
      );
      const guestId = normalizeGuestId(metadata?.guestId);
      const guestAlias =
        normalizeGuestAlias(metadata?.guestAlias) ||
        (guestId ? guestAliasFromId(guestId) : null);
      const barsWritten =
        typeof metadata?.barsWritten === 'number'
          ? metadata.barsWritten
          : typeof metadata?.barsWritten === 'string'
            ? Number.parseInt(metadata.barsWritten, 10)
            : null;
      const assistsUsed =
        typeof metadata?.assistsUsed === 'number'
          ? metadata.assistsUsed
          : typeof metadata?.assistsUsed === 'string'
            ? Number.parseInt(metadata.assistsUsed, 10)
            : null;
      await enqueueSignupAlertOnce({
        userId: uid,
        userEmail,
        userName: userRecord?.displayName || (typeof userName === 'string' ? userName : null),
        ref,
        method,
        guestId,
        guestAlias,
        barsWritten: Number.isFinite(barsWritten as number) ? (barsWritten as number) : null,
        assistsUsed: Number.isFinite(assistsUsed as number) ? (assistsUsed as number) : null,
      });
    }

    if (event === 'pricing_view') {
      const ref = typeof metadata?.ref === 'string' ? metadata.ref : null;
      const path = typeof metadata?.path === 'string' ? metadata.path : '/pricing';
      await enqueueAdminAlert({
        kind: 'pricing_view',
        userId: uid,
        userEmail,
        ref,
        path,
      });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[analytics/event]', err);
    return NextResponse.json({ error: 'Failed to record event' }, { status: 500 });
  }
}
