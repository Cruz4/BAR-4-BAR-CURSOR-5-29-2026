/** Anonymous guest try-sheet funnel events (no Firebase auth required). */

export const GUEST_FUNNEL_EVENTS = {
  OPEN: 'guest_try_open',
  WROTE_BAR: 'guest_wrote_bar',
  DEMO_AI_REQUEST: 'guest_demo_ai_request',
  DEMO_AI_SUCCESS: 'guest_demo_ai_success',
  DEMO_AI_LIMIT: 'guest_demo_ai_limit',
  DEMO_AI_ERROR: 'guest_demo_ai_error',
  OPTION_ACCEPT: 'guest_demo_option_accept',
  OPTION_DISMISS: 'guest_demo_option_dismiss',
  LOCKED_FEATURE: 'guest_locked_feature_tap',
  SIGNUP_CTA: 'guest_signup_cta_click',
} as const;

export type GuestFunnelEventName = (typeof GUEST_FUNNEL_EVENTS)[keyof typeof GUEST_FUNNEL_EVENTS];

export const GUEST_FUNNEL_EVENT_SET = new Set<string>(Object.values(GUEST_FUNNEL_EVENTS));

export type GuestFunnelMetadata = Record<string, string | number | boolean | null>;
