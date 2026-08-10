/** Anonymous LOCK / finish-the-bar funnel events (guest or signed-in). */

export const LOCK_FUNNEL_EVENTS = {
  OPEN: 'lock_open',
  TYPED: 'lock_typed',
  SUBMIT: 'lock_submit',
  /** Locked a bar branching from someone else's echo */
  BRANCH: 'lock_branch',
  SHARE_CARD: 'lock_share_card',
  NAME_CTA: 'lock_name_cta',
  WHERE_NEXT: 'lock_where_next',
  STUDIO: 'lock_studio',
  WRITE_ANOTHER: 'lock_write_another',
  BLOODLINE: 'lock_bloodline',
  SIGNUP_CTA: 'lock_signup_cta',
} as const;

export type LockFunnelEventName = (typeof LOCK_FUNNEL_EVENTS)[keyof typeof LOCK_FUNNEL_EVENTS];

export const LOCK_FUNNEL_EVENT_SET = new Set<string>(Object.values(LOCK_FUNNEL_EVENTS));

export type LockFunnelMetadata = Record<string, string | number | boolean | null>;
