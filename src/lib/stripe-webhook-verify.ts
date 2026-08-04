import 'server-only';
import type Stripe from 'stripe';

/** Live Dashboard endpoint signing secret (`whsec_...`). */
export function getStripeWebhookSecretLive(): string | undefined {
  return process.env.STRIPE_WEBHOOK_SECRET?.trim() || undefined;
}

/** Sandbox / test Dashboard endpoint signing secret (`whsec_...`). */
export function getStripeWebhookSecretTest(): string | undefined {
  return process.env.STRIPE_WEBHOOK_SECRET_TEST?.trim() || undefined;
}

/** Unique signing secrets to try (test first when both set — matches sandbox traffic on shared URL). */
export function getStripeWebhookSecrets(): string[] {
  const test = getStripeWebhookSecretTest();
  const live = getStripeWebhookSecretLive();
  const ordered = [test, live].filter(Boolean) as string[];
  return [...new Set(ordered)];
}

export function secretPrefix(secret: string): string {
  return secret.startsWith('whsec_') ? secret.slice(0, 12) : secret.slice(0, 8);
}

/**
 * Verify Stripe webhook signature against all configured endpoint secrets.
 * Test and live Dashboard endpoints each have their own `whsec_` — never mix CLI `stripe listen` secrets.
 */
export function constructStripeWebhookEvent(
  stripe: Stripe,
  body: string,
  signature: string
): { event: Stripe.Event; secretUsed: 'test' | 'live' | 'legacy' } {
  const test = getStripeWebhookSecretTest();
  const live = getStripeWebhookSecretLive();
  const candidates: Array<{ secret: string; label: 'test' | 'live' | 'legacy' }> = [];

  if (test) candidates.push({ secret: test, label: 'test' });
  if (live) {
    candidates.push({ secret: live, label: 'live' });
    if (!test) candidates[0] = { secret: live, label: 'legacy' };
  }

  if (candidates.length === 0) {
    throw new Error('No webhook signing secrets configured');
  }

  let lastError: unknown;
  for (const { secret, label } of candidates) {
    try {
      const event = stripe.webhooks.constructEvent(body, signature, secret);
      return { event, secretUsed: label };
    } catch (err) {
      lastError = err;
    }
  }

  throw lastError instanceof Error ? lastError : new Error('Invalid signature');
}

export function webhookSecretHealth(): {
  hasLiveSecret: boolean;
  hasTestSecret: boolean;
  livePrefix?: string;
  testPrefix?: string;
} {
  const live = getStripeWebhookSecretLive();
  const test = getStripeWebhookSecretTest();
  return {
    hasLiveSecret: Boolean(live),
    hasTestSecret: Boolean(test),
    livePrefix: live ? secretPrefix(live) : undefined,
    testPrefix: test ? secretPrefix(test) : undefined,
  };
}
