/** In-app admin alert feed (signup, visits, funnel, guest try, LOCK). */

export type AdminAlertKind =
  | 'signup'
  | 'landing_hit'
  | 'landing_burst'
  | 'probe'
  | 'pricing_view'
  | 'checkout_started'
  | 'guest_try'
  | 'guest_pressing'
  | 'lock_funnel'
  | 'admin_denied'
  | 'admin_role'
  | 'admin_action'
  | 'admin_device'
  | 'ink_spike'
  | 'signup_burst'
  | 'stripe_risk'
  | 'blocked_ai';

export type AdminAlert = {
  id: string;
  kind: AdminAlertKind;
  message: string;
  timestamp: string;
  ref?: string | null;
  path?: string | null;
  userEmail?: string | null;
  userId?: string | null;
  method?: string | null;
  detail?: string | null;
  guestId?: string | null;
  guestAlias?: string | null;
};
