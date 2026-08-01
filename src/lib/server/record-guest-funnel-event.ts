import 'server-only';

import { getDb, hasAdminFirestoreCredentials } from '@/lib/firebase/server';
import { normalizeMarketingRef } from '@/lib/marketing-attribution';
import {
  GUEST_FUNNEL_EVENTS,
  type GuestFunnelEventName,
  type GuestFunnelMetadata,
} from '@/lib/guest-funnel-events';
import { enqueueAdminAlert } from '@/lib/server/admin-alerts';

const COLLECTION = 'studio_guest_funnel_events';

/** High-signal steps → Telegram / in-app admin feed (skip noisy request/dismiss). */
const TELEGRAM_ALERT_EVENTS = new Set<GuestFunnelEventName>([
  GUEST_FUNNEL_EVENTS.OPEN,
  GUEST_FUNNEL_EVENTS.WROTE_BAR,
  GUEST_FUNNEL_EVENTS.DEMO_AI_SUCCESS,
  GUEST_FUNNEL_EVENTS.DEMO_AI_LIMIT,
  GUEST_FUNNEL_EVENTS.DEMO_AI_ERROR,
  GUEST_FUNNEL_EVENTS.OPTION_ACCEPT,
  GUEST_FUNNEL_EVENTS.LOCKED_FEATURE,
  GUEST_FUNNEL_EVENTS.SIGNUP_CTA,
]);

function sanitizeMetadata(meta: GuestFunnelMetadata | undefined): GuestFunnelMetadata {
  if (!meta || typeof meta !== 'object') return {};
  const out: GuestFunnelMetadata = {};
  for (const [key, value] of Object.entries(meta).slice(0, 12)) {
    const k = key.slice(0, 40);
    if (typeof value === 'string') out[k] = value.slice(0, 120);
    else if (typeof value === 'number' && Number.isFinite(value)) out[k] = value;
    else if (typeof value === 'boolean') out[k] = value;
    else if (value === null) out[k] = null;
  }
  return out;
}

function resolveRef(raw?: string | null): string {
  const rawRef = raw?.trim().toLowerCase();
  if (!rawRef || rawRef === 'organic') return 'organic';
  return normalizeMarketingRef(rawRef) || 'organic';
}

function guestAlertCopy(
  event: GuestFunnelEventName,
  metadata: GuestFunnelMetadata
): { method: string; detail: string | null } {
  switch (event) {
    case GUEST_FUNNEL_EVENTS.OPEN:
      return { method: 'Opened try sheet', detail: null };
    case GUEST_FUNNEL_EVENTS.WROTE_BAR: {
      const n = metadata.barCount;
      return {
        method: 'Wrote a bar',
        detail: typeof n === 'number' ? `${n} line${n === 1 ? '' : 's'} on sheet` : null,
      };
    }
    case GUEST_FUNNEL_EVENTS.DEMO_AI_SUCCESS: {
      const left = metadata.remaining;
      const use = metadata.useNumber;
      const parts: string[] = [];
      if (typeof use === 'number') parts.push(`assist #${use}`);
      if (typeof left === 'number') parts.push(`${left} left`);
      return {
        method: 'Generate Next succeeded',
        detail: parts.length ? parts.join(' · ') : null,
      };
    }
    case GUEST_FUNNEL_EVENTS.DEMO_AI_LIMIT: {
      const reason = typeof metadata.reason === 'string' ? metadata.reason : 'capped';
      return { method: 'Generate Next blocked', detail: `limit: ${reason}` };
    }
    case GUEST_FUNNEL_EVENTS.DEMO_AI_ERROR:
      return {
        method: 'Generate Next failed',
        detail: typeof metadata.reason === 'string' ? metadata.reason : null,
      };
    case GUEST_FUNNEL_EVENTS.OPTION_ACCEPT:
      return { method: 'Accepted an AI line', detail: null };
    case GUEST_FUNNEL_EVENTS.LOCKED_FEATURE: {
      const feature = typeof metadata.feature === 'string' ? metadata.feature : 'AI tool';
      return { method: 'Tapped locked feature', detail: feature };
    }
    case GUEST_FUNNEL_EVENTS.SIGNUP_CTA: {
      const source = typeof metadata.source === 'string' ? metadata.source : 'cta';
      return { method: 'Tapped signup CTA', detail: source };
    }
    default:
      return { method: event, detail: null };
  }
}

/** Persist an anonymous guest try-sheet funnel step + Telegram for high-signal actions. */
export async function recordGuestFunnelEvent(
  event: GuestFunnelEventName,
  options?: { ref?: string | null; metadata?: GuestFunnelMetadata }
): Promise<void> {
  const ref = resolveRef(options?.ref);
  const metadata = sanitizeMetadata(options?.metadata);

  if (TELEGRAM_ALERT_EVENTS.has(event)) {
    const { method, detail } = guestAlertCopy(event, metadata);
    await enqueueAdminAlert({
      kind: 'guest_try',
      ref,
      method,
      detail,
      path: '/albums/try/tracks/guest-sheet',
    });
  }

  if (!hasAdminFirestoreCredentials()) return;

  try {
    const db = await getDb();
    await db.collection(COLLECTION).add({
      event,
      ref,
      metadata,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.warn('[recordGuestFunnelEvent] skipped:', (error as Error).message);
  }
}
