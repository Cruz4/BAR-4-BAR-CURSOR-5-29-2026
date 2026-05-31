export const REFERRAL_INK_REWARD = 150;
export const MAX_REFERRAL_REWARDS = 4;
export const REFERRAL_STORAGE_KEY = 'b4b_referral_code';

export function buildReferralLink(origin: string, referralCode: string): string {
  const base = origin.replace(/\/$/, '');
  return `${base}/login?ref=${encodeURIComponent(referralCode)}`;
}

export function normalizeReferralCode(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const code = raw.trim().toUpperCase();
  if (!/^[A-Z0-9]{6,12}$/.test(code)) return null;
  return code;
}
