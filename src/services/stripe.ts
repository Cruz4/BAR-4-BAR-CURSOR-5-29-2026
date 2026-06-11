'use client';

/**
 * Stripe Checkout client for Bar 4 Bar (ink packs + Pro subscriptions).
 */

import { useCallback, useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { auth } from '@/lib/firebase/client/firebase';
import { STRIPE_PRICE_IDS, type StripePriceKey } from '@/lib/stripe-catalog';

export type { StripePriceKey };

const STRIPE_PRICES = STRIPE_PRICE_IDS;

async function getAuthHeaders(): Promise<HeadersInit> {
  const user = auth.currentUser;
  if (!user) throw new Error('Sign in to purchase or upgrade.');
  const token = await user.getIdToken();
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };
}

export function useStripe() {
  const { toast } = useToast();
  const [isCheckingOut, setIsCheckingOut] = useState(false);

  const checkout = useCallback(
    async (
      priceKey: StripePriceKey,
      userId: string,
      email?: string,
      _options?: { withTrial?: boolean }
    ) => {
      const isPreview = typeof window !== 'undefined' && window.location.hostname.includes('cloudworkstations.dev');

      if (isPreview) {
        toast({
          title: 'Studio Preview Mode',
          description: 'Opening Stripe checkout…',
          duration: 5000,
        });
      }

      setIsCheckingOut(true);
      try {
        const headers = await getAuthHeaders();
        const response = await fetch('/api/stripe/checkout', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            priceKey,
            userId,
            email,
            withTrial: false,
          }),
        });

        const data = await response.json();
        if (!response.ok || data.error) throw new Error(data.error || 'Checkout failed');

        if (data.url) window.location.href = data.url;
        else throw new Error('No checkout URL returned');
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Checkout failed';
        toast({ variant: 'destructive', title: 'Checkout Failed', description: message });
      } finally {
        setIsCheckingOut(false);
      }
    },
    [toast]
  );

  const fulfillCheckoutReturn = useCallback(
    async (sessionId: string, userId: string) => {
      const headers = await getAuthHeaders();
      const response = await fetch('/api/stripe/fulfill-session', {
        method: 'POST',
        headers,
        body: JSON.stringify({ sessionId, userId }),
      });
      const data = await response.json();
      if (!response.ok || data.error) throw new Error(data.error || 'Could not credit Ink');
      return data as { fulfilled: boolean; duplicate: boolean; inkAmount: number };
    },
    []
  );

  const openBillingPortal = useCallback(
    async (userId: string, returnTab: 'cloud' | 'settings' = 'settings') => {
      setIsCheckingOut(true);
      try {
        const headers = await getAuthHeaders();
        const response = await fetch('/api/stripe/portal', {
          method: 'POST',
          headers,
          body: JSON.stringify({ userId, returnTab }),
        });
        const data = await response.json();
        if (!response.ok || data.error) throw new Error(data.error || 'Could not open billing portal');
        if (data.url) window.location.href = data.url;
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Billing portal failed';
        toast({ variant: 'destructive', title: 'Billing Portal', description: message });
      } finally {
        setIsCheckingOut(false);
      }
    },
    [toast]
  );

  return { checkout, fulfillCheckoutReturn, openBillingPortal, isCheckingOut, STRIPE_PRICES };
}
