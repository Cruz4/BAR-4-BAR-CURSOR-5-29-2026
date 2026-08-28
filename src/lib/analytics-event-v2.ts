/**
 * AnalyticsEventV2 — Phase 0 field inventory (CEO funnel spec).
 * Writers and daily aggregates ship only after Phase 0 acceptance.
 */

export type AnalyticsEventV2Entity = {
  type: string;
  id: string;
};

export type AnalyticsEventV2Meta = Record<string, string | number | boolean | null>;

/**
 * Append-only first-party analytics event (v2 schema).
 * Privacy: no lyrics, CRM notes, raw emails, or unnecessary PII in `meta`.
 */
export type AnalyticsEventV2 = {
  v: 2;
  eventId: string;
  /** e.g. activation.meaningful_bar_saved */
  name: string;
  /** ISO timestamp */
  at: string;
  anonId?: string;
  sessionId?: string;
  /** Omit when anonymous-only */
  userId?: string;
  /** landing, scene, share, song, … */
  source?: string;
  /** UI surface id */
  surface?: string;
  entity?: AnalyticsEventV2Entity;
  /** Share attribution — never raw peer UIDs */
  campaignCode?: string;
  meta?: AnalyticsEventV2Meta;
};

/** Planned priority event names from the CEO funnel spec. */
export const ANALYTICS_EVENT_V2_PRIORITY_NAMES = [
  'activation.meaningful_bar_saved',
  'activation.first_ai_legacy',
  'retention.session_day',
  'share.artifact_created',
  'share.channel_selected',
  'share.link_opened',
  'referral.signup',
  'referral.rewarded',
  'commerce.offer_viewed',
  'commerce.checkout_started',
  'commerce.checkout_completed',
  'commerce.checkout_canceled',
  'commerce.purchase_failed',
  'release.view',
  'release.preview',
  'release.purchase',
  'listen.qualified',
  'room.rsvp',
  'room.attend',
  'room.complete',
] as const;

export type AnalyticsEventV2PriorityName = (typeof ANALYTICS_EVENT_V2_PRIORITY_NAMES)[number];

export function isAnalyticsEventV2(value: unknown): value is AnalyticsEventV2 {
  if (!value || typeof value !== 'object') return false;
  const e = value as Record<string, unknown>;
  return (
    e.v === 2 &&
    typeof e.eventId === 'string' &&
    e.eventId.length > 0 &&
    typeof e.name === 'string' &&
    e.name.length > 0 &&
    typeof e.at === 'string' &&
    e.at.length > 0
  );
}
