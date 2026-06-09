/** In-app admin alert feed (signup + marketing landing hits). */

export type AdminAlertKind = 'signup' | 'landing_hit';

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
};
