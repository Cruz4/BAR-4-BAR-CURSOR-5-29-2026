/**
 * Single source of truth for Studio tier pricing, ink economy, and feature copy.
 * Aligns with stripe-catalog.ts and subscription.ts.
 */

import {
  SIGNUP_INK,
  FREE_MONTHLY_RESIDENCY_INK,
  FREE_ALBUM_LIMIT,
  FREE_TRACK_LIMIT,
} from '@/lib/subscription';
import { PRO_MONTHLY_RESIDENCY, PRO_YEARLY_RESIDENCY } from '@/lib/stripe-catalog';

export const PRO_MONTHLY_PRICE_AMOUNT = 7.77;
export const PRO_YEARLY_PRICE_AMOUNT = 4.44;
export const PRO_YEARLY_BILLED_AMOUNT = 53.28;

export const PRO_MONTHLY_PRICE = `$${PRO_MONTHLY_PRICE_AMOUNT.toFixed(2)}`;
export const PRO_YEARLY_PRICE = `$${PRO_YEARLY_PRICE_AMOUNT.toFixed(2)}`;
export const PRO_YEARLY_BILLED = `$${PRO_YEARLY_BILLED_AMOUNT.toFixed(2)}`;

/** vs paying $7.77/mo × 12 ($93.24) — yearly is $53.28/yr */
export const PRO_YEARLY_SUBSCRIPTION_SAVINGS_PERCENT = Math.round(
  (1 - PRO_YEARLY_BILLED_AMOUNT / (PRO_MONTHLY_PRICE_AMOUNT * 12)) * 100
);

export const PRO_YEARLY_ANNUAL_SAVINGS_DOLLARS =
  Math.round((PRO_MONTHLY_PRICE_AMOUNT * 12 - PRO_YEARLY_BILLED_AMOUNT) * 100) / 100;

export const PRO_YEARLY_SAVINGS_BADGE = `SAVE ${PRO_YEARLY_SUBSCRIPTION_SAVINGS_PERCENT}% VS MONTHLY · BILLED ANNUALLY`;

export const PRO_YEARLY_TOGGLE_LABEL = `Save ${PRO_YEARLY_SUBSCRIPTION_SAVINGS_PERCENT}% on Yearly · Most Popular`;

/** Yearly Pro ink-store checkout discount — separate from subscription savings */
export const INK_PACK_YEARLY_DISCOUNT_PERCENT = 50;
export const INK_PACK_YEARLY_DISCOUNT_SHORT = `${INK_PACK_YEARLY_DISCOUNT_PERCENT}% off Permanent Ink packs`;
export const INK_PACK_YEARLY_DISCOUNT_LABEL = `${INK_PACK_YEARLY_DISCOUNT_PERCENT}% Yearly Pro Ink Savings`;

export const PRO_MONTHLY_INK = PRO_MONTHLY_RESIDENCY;
export const PRO_YEARLY_INK = PRO_YEARLY_RESIDENCY;

export const PRO_FULL_UNLOCK_LINE = 'Full app unlocked — unlimited albums & tracks';

export const PRO_YEARLY_INCLUDES_LINE = 'Everything in Pro Monthly included';

/** Short perk lines shown directly under tier price (also kept in full feature lists below) */
export function getProMonthlyHeadlinePerks(): readonly string[] {
  return [
    `${PRO_MONTHLY_INK.toLocaleString()} residency Ink every month`,
    PRO_FULL_UNLOCK_LINE,
    'All Creative Effects, Performance Mode, vault saves & share links',
  ];
}

export function getProYearlyHeadlinePerks(): readonly string[] {
  return [
    `${PRO_YEARLY_INK.toLocaleString()} residency Ink every month`,
    INK_PACK_YEARLY_DISCOUNT_SHORT,
    `Best price — ${PRO_YEARLY_PRICE}/mo effective (${PRO_YEARLY_BILLED}/year · save ${PRO_YEARLY_SUBSCRIPTION_SAVINGS_PERCENT}% vs ${PRO_MONTHLY_PRICE}/mo)`,
  ];
}

export function getVisitorHeadlinePerks(): readonly string[] {
  return [
    `${SIGNUP_INK} signup + ${FREE_MONTHLY_RESIDENCY_INK} monthly residency Ink`,
    `${FREE_ALBUM_LIMIT} album · ${FREE_TRACK_LIMIT} tracks — demo-scale projects`,
  ];
}

export function getProHeadlinePerks(billing: 'monthly' | 'yearly'): readonly string[] {
  return billing === 'yearly' ? getProYearlyHeadlinePerks() : getProMonthlyHeadlinePerks();
}

export const VISITOR_INK_SUMMARY = `${SIGNUP_INK} signup Ink + ${FREE_MONTHLY_RESIDENCY_INK} monthly residency`;

/** Free tier limits — shown on comparison charts */
export const VISITOR_FEATURES = [
  `${SIGNUP_INK} signup Ink + ${FREE_MONTHLY_RESIDENCY_INK} monthly residency (resets monthly)`,
  `${FREE_ALBUM_LIMIT} album · ${FREE_TRACK_LIMIT} tracks — demo-scale projects only`,
  'DNA & REMIX + Generation Workstation — available (uses Ink; system vault presets)',
  'System DNA / Vibe / Style presets — load-only, no custom saves',
  '3 Creative Effects only: Simile, Metaphor & Sound-Alike',
  'PDF & track export available · locked: Performance Mode, Freestyle, full vault I/O & share links',
] as const;

/** Everything Pro unlocks + why it matters vs Visitor */
export const PRO_UNLOCKS = [
  `UNLOCK: Unlimited albums & tracks — full catalog vs ${FREE_ALBUM_LIMIT} album / ${FREE_TRACK_LIMIT} tracks`,
  'UNLOCK: Custom DNA / Vibe / Style vault saves — archive your strains, not just load system presets',
  'UNLOCK: All 9 Creative Effects — Twist, Image Chain, POV, Blend & more (free tier: 3 only)',
  'UNLOCK: Performance Mode — teleprompter + rhyme-focus for rehearsal & stage',
  'UNLOCK: Freestyle capture — record flows straight into your rhyme book',
  'UNLOCK: Full-studio vault import / export — merge JSON blueprints across devices',
  'UNLOCK: Shareable project links — DNA Drop live links for collab & feedback',
  `${PRO_MONTHLY_INK.toLocaleString()} monthly residency Ink — refreshes each cycle`,
] as const;

/** Yearly Pro-only perks on top of full Pro unlocks */
export const PRO_YEARLY_EXCLUSIVES = [
  `${PRO_YEARLY_INK.toLocaleString()} residency Ink/mo — upgraded from ${PRO_MONTHLY_INK.toLocaleString()} on monthly Pro`,
  `${INK_PACK_YEARLY_DISCOUNT_SHORT} — forever, not a limited promo`,
  'BYO Google AI key — bypass platform rate limits on your generations',
  'Studio Roadmap Input — direct feature feedback & vote on what we ship next (yearly only)',
  `Best price: ${PRO_YEARLY_BILLED}/yr (${PRO_YEARLY_PRICE}/mo effective · save $${PRO_YEARLY_ANNUAL_SAVINGS_DOLLARS.toFixed(2)}/yr vs monthly · ${PRO_YEARLY_SUBSCRIPTION_SAVINGS_PERCENT}% off)`,
] as const;

/** @deprecated Use PRO_UNLOCKS — kept for imports */
export const PRO_MONTHLY_FEATURES = PRO_UNLOCKS;

/** @deprecated Use PRO_YEARLY_EXCLUSIVES — kept for imports */
export const PRO_YEARLY_FEATURES = PRO_YEARLY_EXCLUSIVES;

export function getProTierFeatures(billing: 'monthly' | 'yearly'): readonly string[] {
  if (billing === 'monthly') return PRO_UNLOCKS;
  return [PRO_YEARLY_INCLUDES_LINE, ...PRO_YEARLY_EXCLUSIVES];
}

/** Visual emphasis for tier comparison lists */
export type TierFeatureHighlight = 'none' | 'pro' | 'yearly';

export function getTierFeatureHighlight(
  feature: string,
  tierName: string
): TierFeatureHighlight {
  if (tierName === 'Visitor') return 'none';
  if (/50%|BYO|Best price|Roadmap|roadmap|yearly only|upgraded from|save \$|vs monthly/i.test(feature)) return 'yearly';
  if (/Everything in Pro Monthly/i.test(feature)) return 'pro';
  if (tierName === 'Pro Yearly' && PRO_YEARLY_EXCLUSIVES.some((e) => e === feature)) return 'yearly';
  return 'pro';
}

export const SEO = {
  siteName: 'Bar 4 Bar Studio',
  title: 'Bar 4 Bar Studio | AI Lyric Workstation & Rhyme Book',
  description:
    'Professional AI-powered lyric workstation. Write, rhyme, remix, and archive DNA strains. Free tier with 300 Ink; Studio Pro from $4.44/mo yearly with unlimited projects.',
  keywords: [
    'AI lyric writer',
    'rhyme book app',
    'songwriting studio',
    'rap lyrics generator',
    'lyric workstation',
    'Bar 4 Bar',
    'DNA remix lyrics',
    'creative writing AI',
  ],
  url: 'https://lyricai-studio-otgxn.web.app',
} as const;

/** Ink pack rows for Ink Store (amounts from stripe-catalog) */
export function getInkPackRows(isYearlyPro: boolean) {
  const discount = isYearlyPro ? INK_PACK_YEARLY_DISCOUNT_PERCENT / 100 : 1;
  const fmt = (n: number) => `$${(n * discount).toFixed(2)}`;
  const yearlyLabel = isYearlyPro ? INK_PACK_YEARLY_DISCOUNT_LABEL : null;
  return [
    {
      name: 'Session Pack',
      ink: 280,
      originalPrice: '$3.44',
      price: fmt(3.44),
      priceKey: 'INK_STARTER' as const,
      description: 'Quick permanent refill. Never expires — used after residency runs out.',
      icon: 'Zap' as const,
      discount: yearlyLabel,
    },
    {
      name: 'Studio Pack',
      ink: 1000,
      originalPrice: '$8.88',
      price: fmt(8.88),
      priceKey: 'INK_REFILL' as const,
      description: 'Standard permanent refill for active sessions.',
      popular: true,
      icon: 'Sparkles' as const,
      discount: yearlyLabel,
    },
    {
      name: 'Artist Bundle',
      ink: 1800,
      originalPrice: '$14.44',
      price: fmt(14.44),
      priceKey: 'INK_ARTIST' as const,
      description: 'Professional permanent ink for heavy studio weeks.',
      icon: 'Star' as const,
      discount: yearlyLabel,
    },
    {
      name: 'Studio Vault',
      ink: 4000,
      originalPrice: '$24.44',
      price: fmt(24.44),
      priceKey: 'INK_VAULT' as const,
      description: 'Maximum permanent capacity. Best value on packs.',
      bestValue: true,
      icon: 'History' as const,
      discount: yearlyLabel,
    },
  ];
}

export function getStudioTierPlans(isCloudSyncActive: boolean, subscriptionTier?: string) {
  return [
    {
      name: 'Visitor',
      price: '$0',
      period: '',
      description: 'Entry-level studio demo.',
      headlinePerks: getVisitorHeadlinePerks(),
      billedText: undefined as string | undefined,
      isCurrent: !isCloudSyncActive,
      priceKey: null as const,
      features: [...VISITOR_FEATURES],
      cta: 'Continue Writing',
    },
    {
      name: 'Pro Monthly',
      price: PRO_MONTHLY_PRICE,
      period: '/mo',
      description: `${PRO_MONTHLY_INK.toLocaleString()} residency Ink/mo · all Pro unlocks below`,
      headlinePerks: getProMonthlyHeadlinePerks(),
      billedText: 'Billed monthly',
      isCurrent: isCloudSyncActive && subscriptionTier === 'monthly',
      priceKey: 'PRO_MONTHLY' as const,
      features: [...PRO_UNLOCKS],
      cta: 'Upgrade to Monthly',
    },
    {
      name: 'Pro Yearly',
      price: PRO_YEARLY_PRICE,
      period: '/mo',
      badge: PRO_YEARLY_SAVINGS_BADGE,
      description: `${PRO_YEARLY_INK.toLocaleString()} residency Ink/mo · everything in Pro Monthly + yearly exclusives below`,
      headlinePerks: getProYearlyHeadlinePerks(),
      billedText: `${PRO_YEARLY_BILLED}/year · one charge annually`,
      isCurrent: isCloudSyncActive && subscriptionTier === 'yearly',
      priceKey: 'PRO_YEARLY' as const,
      features: [PRO_YEARLY_INCLUDES_LINE, ...PRO_YEARLY_EXCLUSIVES],
      cta: 'Upgrade to Yearly',
    },
  ];
}
