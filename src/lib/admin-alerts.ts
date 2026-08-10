/** In-app admin alert feed (signup, visits, funnel, guest try, LOCK). */

export type AdminAlertKind =
  | 'signup'
  | 'landing_hit'
  | 'pricing_view'
  | 'checkout_started'
  | 'guest_try'
  | 'lock_funnel';

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
