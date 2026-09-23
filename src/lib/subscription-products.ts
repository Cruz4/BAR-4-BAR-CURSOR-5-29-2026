import type { User } from '@/lib/types';

export type SubscriptionProduct = 'writer' | 'max';

/** Grandfathered Stripe Pro = writer unless explicitly max. */
export function getSubscriptionProduct(
  user: Pick<User, 'subscriptionProduct' | 'subscriptionStatus'> | null | undefined
): SubscriptionProduct | null {
  if (user?.subscriptionStatus !== 'active') return null;
  if (user.subscriptionProduct === 'max') return 'max';
  return 'writer';
}

export function isStudioMaxUser(
  user: Pick<User, 'subscriptionProduct' | 'subscriptionStatus'> | null | undefined
): boolean {
  return getSubscriptionProduct(user) === 'max';
}

export function isProWriterUser(
  user: Pick<User, 'subscriptionProduct' | 'subscriptionStatus'> | null | undefined
): boolean {
  return getSubscriptionProduct(user) === 'writer';
}
