/** Stripe subscription trial length — card required; no automatic signup trial. */
export const STRIPE_PRO_TRIAL_DAYS = 3;

export function getStripeTrialDurationLabel(): string {
  return `${STRIPE_PRO_TRIAL_DAYS}-day`;
}

export function getStripeTrialTitle(): string {
  return `${STRIPE_PRO_TRIAL_DAYS}-Day Pro Trial`;
}

export function getStripeTrialMarketingLine(): string {
  return `Try Pro free ${STRIPE_PRO_TRIAL_DAYS} days — card required`;
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

/** Internal signup trial removed — Pro access is paid or Stripe trial only. */
export function isTrialActive(): boolean {
  return false;
}

export function getTrialDaysRemaining(): null {
  return null;
}
