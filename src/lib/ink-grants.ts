import { FREE_MONTHLY_RESIDENCY_INK, SIGNUP_INK } from '@/lib/subscription';

/** First calendar month (YYYY-MM) when a free user may receive the monthly residency grant. */
export function getFirstFreeMonthlyGrantMonthKey(createdAt?: string | null): string | null {
  if (!createdAt) return null;
  const signup = new Date(createdAt);
  if (Number.isNaN(signup.getTime())) return null;
  const next = new Date(Date.UTC(signup.getUTCFullYear(), signup.getUTCMonth() + 1, 1));
  return next.toISOString().slice(0, 7);
}

/** UTC date when the next free monthly residency grant becomes available. */
export function getNextFreeMonthlyGrantDate(createdAt?: string | null, now = new Date()): Date | null {
  if (!createdAt) return null;
  const signup = new Date(createdAt);
  if (Number.isNaN(signup.getTime())) return null;

  const nowKey = now.toISOString().slice(0, 7);
  const firstGrantKey = getFirstFreeMonthlyGrantMonthKey(createdAt);

  if (firstGrantKey && nowKey < firstGrantKey) {
    const [y, m] = firstGrantKey.split('-').map(Number);
    return new Date(Date.UTC(y, m - 1, 1));
  }

  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
}

export function getDaysUntilFreeMonthlyGrant(
  createdAt?: string | null,
  now = new Date()
): number | null {
  const next = getNextFreeMonthlyGrantDate(createdAt, now);
  if (!next) return null;
  const diffMs = next.getTime() - now.getTime();
  return Math.max(0, Math.ceil(diffMs / (24 * 60 * 60 * 1000)));
}

export function formatFreeMonthlyRefillLabel(createdAt?: string | null, now = new Date()): string {
  const days = getDaysUntilFreeMonthlyGrant(createdAt, now);
  if (days === null) return `+${FREE_MONTHLY_RESIDENCY_INK} residency Ink each month`;
  if (days === 0) {
    return `Next +${FREE_MONTHLY_RESIDENCY_INK} residency refill available soon`;
  }
  if (days === 1) {
    return `Next +${FREE_MONTHLY_RESIDENCY_INK} residency refill in 1 day`;
  }
  return `Next +${FREE_MONTHLY_RESIDENCY_INK} residency refill in ${days} days`;
}

export function getVisitorInkGrantSummary(): string {
  return `${SIGNUP_INK} welcome Ink on signup · +${FREE_MONTHLY_RESIDENCY_INK}/mo from month two`;
}

export function isEligibleForFreeMonthlyGrant(
  createdAt: string | null | undefined,
  monthKey: string
): boolean {
  const first = getFirstFreeMonthlyGrantMonthKey(createdAt);
  if (!first) return false;
  if (isSignupMonth(createdAt, monthKey)) return false;
  return monthKey >= first;
}

export function isSignupMonth(createdAt: string | null | undefined, monthKey: string): boolean {
  if (!createdAt) return false;
  const signup = new Date(createdAt);
  if (Number.isNaN(signup.getTime())) return false;
  return signup.toISOString().slice(0, 7) === monthKey;
}

/** Residency Ink a brand-new Visitor should have before any monthly refill. */
export function expectedSignupResidencyInk(): number {
  return SIGNUP_INK;
}

/** Detect erroneous signup-month monthly bump (welcome + monthly) that was never spent down. */
export function isLikelyErroneousSignupMonthGrant(
  residencyBalance: number,
  createdAt: string | null | undefined,
  monthKey: string
): boolean {
  if (!isSignupMonth(createdAt, monthKey)) return false;
  const expectedBump = SIGNUP_INK + FREE_MONTHLY_RESIDENCY_INK;
  return residencyBalance >= expectedBump - 2;
}

/**
 * Signup month received only the monthly-sized grant (e.g. 111) without welcome ink.
 * Monthly residency is meant to start calendar month two.
 */
/** Signup month balance matches monthly drip only — welcome ink never landed (or was fully reversed). */
export function isErroneousSignupMonthMonthlyOnly(
  residencyBalance: number,
  createdAt: string | null | undefined,
  monthKey: string
): boolean {
  if (!isSignupMonth(createdAt, monthKey)) return false;
  return (
    residencyBalance > 0 &&
    residencyBalance <= FREE_MONTHLY_RESIDENCY_INK + 5 &&
    residencyBalance < SIGNUP_INK - 5
  );
}

/** Visitor should still have welcome ink in the signup month when it was never granted. */
export function missingSignupWelcomeInk(
  residencyBalance: number,
  createdAt: string | null | undefined,
  monthKey: string,
  signupGrantSkipped?: boolean
): boolean {
  if (signupGrantSkipped) return false;
  if (!isSignupMonth(createdAt, monthKey)) return false;
  return residencyBalance < SIGNUP_INK - 5;
}
