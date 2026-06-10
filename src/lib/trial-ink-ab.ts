/** A/B: trial Ink grant — control (400) vs H1 (0). Workflow trial unchanged; Visitor Ink unchanged. */

export type TrialInkAbVariant = 'control' | 'h1_zero';

export const TRIAL_INK_GRANT_CONTROL = 400;
export const TRIAL_INK_GRANT_H1_ZERO = 0;

export type TrialInkAbMode = 'control' | 'split' | 'h1';

/** Env `TRIAL_INK_AB_MODE`: `control` (default) | `split` (50/50) | `h1` (force zero trial Ink). */
export function getTrialInkAbMode(): TrialInkAbMode {
  const raw = process.env.TRIAL_INK_AB_MODE?.trim().toLowerCase();
  if (raw === 'split' || raw === 'h1') return raw;
  return 'control';
}

/** Deterministic variant for a user when mode is `split`; otherwise mode dictates the grant. */
export function assignTrialInkAbVariant(userId: string, mode?: TrialInkAbMode): TrialInkAbVariant {
  const m = mode ?? getTrialInkAbMode();
  if (m === 'h1') return 'h1_zero';
  if (m === 'control') return 'control';

  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = (hash * 31 + userId.charCodeAt(i)) >>> 0;
  }
  return hash % 2 === 0 ? 'control' : 'h1_zero';
}

export function getTrialInkGrantForVariant(
  variant: TrialInkAbVariant | string | null | undefined
): number {
  return variant === 'h1_zero' ? TRIAL_INK_GRANT_H1_ZERO : TRIAL_INK_GRANT_CONTROL;
}
