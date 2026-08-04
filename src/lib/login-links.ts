import { normalizeMarketingRef } from '@/lib/marketing-attribution';
import { normalizeReferralCode } from '@/lib/referrals';

export type LoginAuthMode = 'signin' | 'signup';

export function buildLoginUrl(options?: {
  mode?: LoginAuthMode;
  marketingRef?: string | null;
  /** Artist referral code — wins over marketingRef when both are set. */
  referralCode?: string | null;
  next?: string | null;
  intent?: string;
}): string {
  const params = new URLSearchParams();
  if (options?.mode === 'signup') params.set('mode', 'signup');
  const referral = normalizeReferralCode(options?.referralCode ?? null);
  if (referral) {
    params.set('ref', referral);
  } else {
    const ref = normalizeMarketingRef(options?.marketingRef ?? null);
    if (ref) params.set('ref', ref);
  }
  if (options?.next) params.set('next', options.next);
  if (options?.intent) params.set('intent', options.intent);
  const qs = params.toString();
  return qs ? `/login?${qs}` : '/login';
}

/** Signup CTA from the public landing — preserves ?ref= from the current page URL. */
export function buildLandingSignupUrl(search?: string | URLSearchParams | null): string {
  const params =
    search instanceof URLSearchParams
      ? search
      : new URLSearchParams(typeof search === 'string' ? search : '');
  return buildLoginUrl({
    mode: 'signup',
    marketingRef: params.get('ref'),
  });
}

export const SIGNUP_LOGIN_PATH = '/login?mode=signup';
