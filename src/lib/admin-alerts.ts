/** In-app admin alert feed (signup, visits, funnel). */

export type AdminAlertKind =
  | 'signup'
  | 'landing_hit'
  | 'pricing_view'
  | 'checkout_started';

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
};
