import 'server-only';

import { getDb, hasAdminFirestoreCredentials } from '@/lib/firebase/server';
import { normalizeMarketingRef } from '@/lib/marketing-attribution';
import {
  GUEST_FUNNEL_EVENTS,
  type GuestFunnelEventName,
  type GuestFunnelMetadata,
} from '@/lib/guest-funnel-events';
import { guestAliasFromId, normalizeGuestAlias, normalizeGuestId } from '@/lib/guest-identity';
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
  // Profile sandbox (/) — skip OPEN (landing_hit already fires); alert engage + leave.
  GUEST_FUNNEL_EVENTS.PRESSING_INTERACT,
  GUEST_FUNNEL_EVENTS.PRESSING_CLAIM_CTA,
  GUEST_FUNNEL_EVENTS.PRESSING_TRY_SHEET,
  GUEST_FUNNEL_EVENTS.PRESSING_LEAVE,
]);

function formatDwell(seconds: unknown): string | null {
  if (typeof seconds !== 'number' || !Number.isFinite(seconds) || seconds < 0) return null;
  const s = Math.round(seconds);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const rem = s % 60;
  return rem ? `${m}m ${rem}s` : `${m}m`;
}

function isPressingTelegramEvent(event: GuestFunnelEventName): boolean {
  return (
    event === GUEST_FUNNEL_EVENTS.PRESSING_INTERACT ||
    event === GUEST_FUNNEL_EVENTS.PRESSING_CLAIM_CTA ||
    event === GUEST_FUNNEL_EVENTS.PRESSING_TRY_SHEET ||
    event === GUEST_FUNNEL_EVENTS.PRESSING_LEAVE
  );
}

function sanitizeMetadata(meta: GuestFunnelMetadata | undefined): GuestFunnelMetadata {
  if (!meta || typeof meta !== 'object') return {};
  const out: GuestFunnelMetadata = {};
  for (const [key, value] of Object.entries(meta).slice(0, 16)) {
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

function resolveGuestLabel(metadata: GuestFunnelMetadata): {
  guestId: string | null;
  guestAlias: string | null;
} {
  const guestId = normalizeGuestId(metadata.guestId);
  const guestAlias =
    normalizeGuestAlias(metadata.guestAlias) || (guestId ? guestAliasFromId(guestId) : null);
  return { guestId, guestAlias };
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
    case GUEST_FUNNEL_EVENTS.PRESSING_INTERACT: {
      const action = typeof metadata.action === 'string' ? metadata.action : 'edit';
      const dwell = formatDwell(metadata.dwellSeconds);
      return {
        method: 'Engaged sandbox',
        detail: dwell ? `first: ${action} · after ${dwell}` : `first: ${action}`,
      };
    }
    case GUEST_FUNNEL_EVENTS.PRESSING_CLAIM_CTA: {
      const dwell = formatDwell(metadata.dwellSeconds);
      const actions = typeof metadata.actions === 'string' ? metadata.actions : '';
      const parts = [dwell ? `after ${dwell}` : null, actions ? `did: ${actions}` : 'no edits yet'].filter(
        Boolean
      );
      return { method: 'Tapped Claim profile', detail: parts.join(' · ') || null };
    }
    case GUEST_FUNNEL_EVENTS.PRESSING_TRY_SHEET: {
      const dwell = formatDwell(metadata.dwellSeconds);
      return {
        method: 'Tapped Write free',
        detail: dwell ? `after ${dwell}` : null,
      };
    }
    case GUEST_FUNNEL_EVENTS.PRESSING_LEAVE: {
      const dwell = formatDwell(metadata.dwellSeconds) || '0s';
      const engaged = metadata.engaged === true;
      const actions = typeof metadata.actions === 'string' ? metadata.actions : '';
      if (!engaged) {
        return {
          method: 'Left sandbox (idle)',
          detail: `stayed ${dwell} · no interaction`,
        };
      }
      return {
        method: 'Left sandbox',
        detail: `stayed ${dwell} · ${actions || 'engaged'}`,
      };
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
  const { guestId, guestAlias } = resolveGuestLabel(metadata);
  if (guestId) metadata.guestId = guestId;
  if (guestAlias) metadata.guestAlias = guestAlias;

  if (TELEGRAM_ALERT_EVENTS.has(event)) {
    const { method, detail } = guestAlertCopy(event, metadata);
    const who = guestAlias || 'Guest';
    const pressing = isPressingTelegramEvent(event);
    await enqueueAdminAlert({
      kind: pressing ? 'guest_pressing' : 'guest_try',
      ref,
      method: `${who} · ${method}`,
      detail,
      path: pressing ? '/' : '/albums/try/tracks/guest-sheet',
      guestId,
      guestAlias,
    });
  }

  if (!hasAdminFirestoreCredentials()) return;

  try {
    const db = await getDb();
    await db.collection(COLLECTION).add({
      event,
      ref,
      guestId: guestId || null,
      guestAlias: guestAlias || null,
      metadata,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.warn('[recordGuestFunnelEvent] skipped:', (error as Error).message);
  }
}
