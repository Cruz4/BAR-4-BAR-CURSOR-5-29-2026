/**
 * Server-authoritative Stripe price catalog for Bar 4 Bar.
 * Suno-calibrated ink economy. Override price IDs via env (see .env.example).
 */

const env = (key: string, fallback: string) => process.env[key]?.trim() || fallback;

export const PRO_MONTHLY_RESIDENCY = 1100;
export const PRO_YEARLY_RESIDENCY = 2500;

export const STRIPE_PRICE_IDS = {
  PRO_MONTHLY: env('STRIPE_PRICE_PRO_MONTHLY', 'price_1TcEHIR1AVjROqp3n5ARXBOo'),
  PRO_YEARLY: env('STRIPE_PRICE_PRO_YEARLY', 'price_1TcDtcR1AVjROqp3yy51oUYx'),
  INK_STARTER: env('STRIPE_PRICE_INK_STARTER', 'price_1TcDYkR1AVjROqp3bbps3bS5'),
  INK_REFILL: env('STRIPE_PRICE_INK_REFILL', 'price_1TcDYlR1AVjROqp3dVwsVof0'),
  INK_ARTIST: env('STRIPE_PRICE_INK_ARTIST', 'price_1TcDYlR1AVjROqp3Rt3UjuTN'),
  INK_VAULT: env('STRIPE_PRICE_INK_VAULT', 'price_1TcDYmR1AVjROqp3S0hy1WOd'),
} as const;

export const STRIPE_PRICE_CATALOG: Record<
  string,
  | { type: 'subscription'; tier: 'monthly' | 'yearly'; residencyRefill: number }
  | { type: 'one_time'; inkAmount: number }
> = {
  [STRIPE_PRICE_IDS.PRO_MONTHLY]: {
    type: 'subscription',
    tier: 'monthly',
    residencyRefill: PRO_MONTHLY_RESIDENCY,
  },
  [STRIPE_PRICE_IDS.PRO_YEARLY]: {
    type: 'subscription',
    tier: 'yearly',
    residencyRefill: PRO_YEARLY_RESIDENCY,
  },
  [STRIPE_PRICE_IDS.INK_STARTER]: { type: 'one_time', inkAmount: 280 },
  [STRIPE_PRICE_IDS.INK_REFILL]: { type: 'one_time', inkAmount: 1000 },
  [STRIPE_PRICE_IDS.INK_ARTIST]: { type: 'one_time', inkAmount: 1800 },
  [STRIPE_PRICE_IDS.INK_VAULT]: { type: 'one_time', inkAmount: 4000 },
};

export function getCatalogEntry(priceId: string) {
  return STRIPE_PRICE_CATALOG[priceId];
}

export function getResidencyRefillForTier(tier: 'monthly' | 'yearly') {
  return tier === 'yearly' ? PRO_YEARLY_RESIDENCY : PRO_MONTHLY_RESIDENCY;
}

/** Client-safe price keys → IDs (display/checkout labels only; server validates). */
export const STRIPE_PRICE_KEYS = STRIPE_PRICE_IDS;
