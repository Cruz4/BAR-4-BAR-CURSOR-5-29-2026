import type { User } from '@/lib/types';
import { isYearlyPro } from '@/lib/subscription';

export const API_KEY_STORAGE_KEY = 'bar4bar-custom-api-key';

/** Ink discount on AI actions when Yearly Pro supplies a valid Google AI key. */
export const BYO_API_INK_DISCOUNT_PERCENT = 50;

export function isValidGoogleApiKey(key: string | null | undefined): boolean {
  const trimmed = key?.trim();
  if (!trimmed) return false;
  return /^AIza[0-9A-Za-z_-]{20,}$/.test(trimmed);
}

export function applyByoInkDiscount(baseCost: number): number {
  const discounted = baseCost * (1 - BYO_API_INK_DISCOUNT_PERCENT / 100);
  return Math.max(1, Math.ceil(discounted));
}

export function isByoInkDiscountActive(
  user: Pick<User, 'subscriptionStatus' | 'subscriptionTier'> | null | undefined,
  customApiKey: string | null | undefined
): boolean {
  return isYearlyPro(user) && isValidGoogleApiKey(customApiKey);
}

export function isYearlyProFromData(
  data: { subscriptionStatus?: string; subscriptionTier?: string } | null | undefined
): boolean {
  return data?.subscriptionStatus === 'active' && data?.subscriptionTier === 'yearly';
}
