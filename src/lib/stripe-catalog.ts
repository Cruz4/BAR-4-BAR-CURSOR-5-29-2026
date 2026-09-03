/**
 * Server-authoritative Stripe price catalog for AKAsheet.
 * Suno-calibrated ink economy. Override price IDs via env (see .env.example).
 */

const env = (key: string, fallback: string) => process.env[key]?.trim() || fallback;

export const PRO_MONTHLY_RESIDENCY = 1777;
export const PRO_YEARLY_RESIDENCY = 3444;

/** Active checkout price keys (Ink Store UI). Session Pack removed — legacy ID kept for webhooks only. */
export const STRIPE_PRICE_IDS = {
  PRO_MONTHLY: env('STRIPE_PRICE_PRO_MONTHLY', 'price_1TcEHIR1AVjROqp3n5ARXBOo'),
  PRO_YEARLY: env('STRIPE_PRICE_PRO_YEARLY', 'price_1TcDtcR1AVjROqp3yy51oUYx'),
  INK_REFILL: env('STRIPE_PRICE_INK_REFILL', 'price_1TcDYlR1AVjROqp3dVwsVof0'),
  INK_ARTIST: env('STRIPE_PRICE_INK_ARTIST', 'price_1TcDYlR1AVjROqp3Rt3UjuTN'),
  INK_VAULT: env('STRIPE_PRICE_INK_VAULT', 'price_1TcDYmR1AVjROqp3S0hy1WOd'),
} as const;

/** Deprecated Session Pack — fulfill historical checkouts only */
export const LEGACY_STRIPE_PRICE_INK_STARTER = env(
  'STRIPE_PRICE_INK_STARTER',
  'price_1TcDYkR1AVjROqp3bbps3bS5'
);

/** Legacy Artist/Vault packs — fulfill historical checkouts at old ink amounts */
export const LEGACY_STRIPE_PRICE_INK_ARTIST = env(
  'STRIPE_PRICE_INK_ARTIST_LEGACY',
  'price_1TcDYlR1AVjROqp3Rt3UjuTN'
);
export const LEGACY_STRIPE_PRICE_INK_VAULT = env(
  'STRIPE_PRICE_INK_VAULT_LEGACY',
  'price_1TcDYmR1AVjROqp3S0hy1WOd'
);

/** Ink pack price keys gated behind active Pro subscription */
export const PRO_GATED_INK_PACK_KEYS = new Set(['INK_ARTIST', 'INK_VAULT']);

type CatalogEntry =
  | { type: 'subscription'; tier: 'monthly' | 'yearly'; residencyRefill: number }
  | { type: 'one_time'; inkAmount: number };

const ACTIVE_CATALOG: Record<string, CatalogEntry> = {
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
  [STRIPE_PRICE_IDS.INK_REFILL]: { type: 'one_time', inkAmount: 1000 },
  [STRIPE_PRICE_IDS.INK_ARTIST]: { type: 'one_time', inkAmount: 2500 },
  [STRIPE_PRICE_IDS.INK_VAULT]: { type: 'one_time', inkAmount: 5000 },
};

const LEGACY_CATALOG: Record<string, CatalogEntry> = {
  ...(LEGACY_STRIPE_PRICE_INK_STARTER
    ? { [LEGACY_STRIPE_PRICE_INK_STARTER]: { type: 'one_time', inkAmount: 280 } }
    : {}),
  ...(LEGACY_STRIPE_PRICE_INK_ARTIST &&
  LEGACY_STRIPE_PRICE_INK_ARTIST !== STRIPE_PRICE_IDS.INK_ARTIST
    ? { [LEGACY_STRIPE_PRICE_INK_ARTIST]: { type: 'one_time', inkAmount: 1800 } }
    : {}),
  ...(LEGACY_STRIPE_PRICE_INK_VAULT &&
  LEGACY_STRIPE_PRICE_INK_VAULT !== STRIPE_PRICE_IDS.INK_VAULT
    ? { [LEGACY_STRIPE_PRICE_INK_VAULT]: { type: 'one_time', inkAmount: 4500 } }
    : {}),
};

export const STRIPE_PRICE_CATALOG: Record<string, CatalogEntry> = {
  ...ACTIVE_CATALOG,
  ...LEGACY_CATALOG,
};

export function getCatalogEntry(priceId: string) {
  return STRIPE_PRICE_CATALOG[priceId];
}

export function getResidencyRefillForTier(tier: 'monthly' | 'yearly') {
  return tier === 'yearly' ? PRO_YEARLY_RESIDENCY : PRO_MONTHLY_RESIDENCY;
}

/** Client-safe price keys → IDs (display/checkout labels only; server validates). */
export const STRIPE_PRICE_KEYS = STRIPE_PRICE_IDS;

export type StripePriceKey = keyof typeof STRIPE_PRICE_IDS;

/** Resolve checkout price from server env (authoritative — do not trust client-side price IDs). */
export function resolveStripePriceId(priceKey: string): string | undefined {
  if (!(priceKey in STRIPE_PRICE_IDS)) return undefined;
  return STRIPE_PRICE_IDS[priceKey as StripePriceKey];
}

export function isProGatedInkPackKey(priceKey: string): boolean {
  return PRO_GATED_INK_PACK_KEYS.has(priceKey as StripePriceKey);
}

/** Resolved Stripe price IDs (active + legacy) behind the Pro-gated Ink packs. */
const PRO_GATED_INK_PACK_PRICE_IDS = new Set<string>(
  [
    STRIPE_PRICE_IDS.INK_ARTIST,
    STRIPE_PRICE_IDS.INK_VAULT,
    LEGACY_STRIPE_PRICE_INK_ARTIST,
    LEGACY_STRIPE_PRICE_INK_VAULT,
  ].filter(Boolean)
);

/**
 * Authoritative Pro-gate check keyed off the resolved Stripe price ID rather
 * than the client-supplied `priceKey` label — a request that sends a raw
 * `priceId` (skipping `priceKey` entirely) must still be gated correctly.
 */
export function isProGatedInkPackPriceId(priceId: string): boolean {
  return PRO_GATED_INK_PACK_PRICE_IDS.has(priceId);
}
