export type AdminResidencyMode =
  | 'none'
  | 'admin-monthly'
  | 'admin-yearly'
  | 'admin-max-monthly'
  | 'admin-max-yearly'
  | 'stripe-monthly'
  | 'stripe-yearly';

export const ADMIN_RESIDENCY_MODES: AdminResidencyMode[] = [
  'none',
  'admin-monthly',
  'admin-yearly',
  'admin-max-monthly',
  'admin-max-yearly',
  'stripe-monthly',
  'stripe-yearly',
];

export function isAdminResidencyMode(value: string): value is AdminResidencyMode {
  return (ADMIN_RESIDENCY_MODES as string[]).includes(value);
}

export function isAdminHeldPro(user: {
  subscriptionStatus?: string | null;
  proSource?: string | null;
  subscriptionId?: string | null;
} | null | undefined): boolean {
  if (!user) return false;
  if (user.proSource === 'admin') return true;
  if (user.proSource === 'stripe') return false;
  return user.subscriptionStatus === 'active' && !user.subscriptionId;
}

/** What the roster dropdown should show — live Pro only, plus who owns it. */
export function rosterResidencyMode(user: {
  subscriptionStatus?: string | null;
  subscriptionTier?: string | null;
  subscriptionProduct?: string | null;
  proSource?: string | null;
  subscriptionId?: string | null;
  stripeCustomerId?: string | null;
}): AdminResidencyMode {
  if (user.subscriptionStatus !== 'active') return 'none';
  const yearly = user.subscriptionTier === 'yearly';
  const isMax = user.subscriptionProduct === 'max';
  if (isAdminHeldPro(user)) {
    if (isMax) return yearly ? 'admin-max-yearly' : 'admin-max-monthly';
    return yearly ? 'admin-yearly' : 'admin-monthly';
  }
  return yearly ? 'stripe-yearly' : 'stripe-monthly';
}

export function residencyModeLabel(mode: AdminResidencyMode): string {
  if (mode === 'admin-monthly') return 'ADMIN MO';
  if (mode === 'admin-yearly') return 'ADMIN YR';
  if (mode === 'admin-max-monthly') return 'MAX MO';
  if (mode === 'admin-max-yearly') return 'MAX YR';
  if (mode === 'stripe-monthly') return 'STRIPE MO';
  if (mode === 'stripe-yearly') return 'STRIPE YR';
  return 'LOCAL';
}
