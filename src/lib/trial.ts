/** @deprecated Stripe subscription trial removed — Pro is pay-now only. */
export const STRIPE_PRO_TRIAL_DAYS = 0;

/** @deprecated */
export function getStripeTrialDurationLabel(): string {
  return '0-day';
}

/** @deprecated */
export function getStripeTrialTitle(): string {
  return 'Pro Membership';
}

/** @deprecated */
export function getStripeTrialMarketingLine(): string {
  return 'Go Pro — pay at checkout';
}

/** @deprecated Use STRIPE_PRO_TRIAL_DAYS */
export const TRIAL_DURATION_DAYS = STRIPE_PRO_TRIAL_DAYS;

/** @deprecated Use getStripeTrialDurationLabel */
export function getTrialDurationLabel(): string {
  return getStripeTrialDurationLabel();
}

/** @deprecated Use getStripeTrialTitle */
export function getTrialDurationTitle(): string {
  return getStripeTrialTitle();
}

export { TRIAL_INK_GRANT } from '@/lib/trial-ink-ab';
export { getTrialInkGrantForVariant } from '@/lib/trial-ink-ab';

/** Internal signup trial removed — Pro access is paid only. */
export function isTrialActive(): boolean {
  return false;
}

export function getTrialDaysRemaining(): null {
  return null;
}
