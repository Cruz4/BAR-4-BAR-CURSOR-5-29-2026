/** Shared analytics event names — client + server. */
export const ANALYTICS_EVENTS = {
  SIGNUP: 'signup',
  SESSION_START: 'session_start',
  PAGE_VIEW: 'page_view',
  TRACK_EDITOR_OPEN: 'track_editor_open',
  PRICING_VIEW: 'pricing_view',
  CHECKOUT_STARTED: 'checkout_started',
  CHECKOUT_COMPLETED: 'checkout_completed',
  UPGRADE_CLICK: 'upgrade_click',
  FREE_LIMIT_HIT: 'free_limit_hit',
  AI_ACTION: 'ai_action',
} as const;

export type AnalyticsEventName = (typeof ANALYTICS_EVENTS)[keyof typeof ANALYTICS_EVENTS];

export type AnalyticsEventPayload = {
  event: AnalyticsEventName;
  metadata?: Record<string, string | number | boolean | null>;
};
