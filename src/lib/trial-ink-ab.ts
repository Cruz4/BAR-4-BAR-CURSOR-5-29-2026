/** Pro workflow trial unlocks features only — no separate trial Ink bucket. */

export const TRIAL_INK_GRANT = 0;

/** @deprecated Always 0 — kept for imports that referenced the old control arm. */
export const TRIAL_INK_GRANT_CONTROL = 0;

/** @deprecated Always 0 — kept for imports that referenced the old H1 arm. */
export const TRIAL_INK_GRANT_H1_ZERO = 0;

export function getTrialInkGrantForVariant(
  _variant?: string | null
): number {
  return TRIAL_INK_GRANT;
}
