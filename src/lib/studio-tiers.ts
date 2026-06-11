/**
 * Single source of truth for Studio tier pricing, ink economy, and feature copy.
 * Aligns with stripe-catalog.ts and subscription.ts.
 */

import {
  SIGNUP_INK,
  FREE_MONTHLY_RESIDENCY_INK,
  FREE_RESIDENCY_POOL_CAP,
  FREE_ALBUM_LIMIT,
  FREE_TRACK_LIMIT,
  isProUser,
  isYearlyPro,
} from '@/lib/subscription';
import type { User } from '@/lib/types';
import { PRO_MONTHLY_RESIDENCY, PRO_YEARLY_RESIDENCY } from '@/lib/stripe-catalog';
import { getVisitorInkGrantSummary } from '@/lib/ink-grants';
import { MAX_REFERRAL_REWARDS, REFERRAL_INK_REWARD } from '@/lib/referrals';
import {
  getStripeTrialDurationLabel,
  getStripeTrialMarketingLine,
  getStripeTrialTitle,
} from '@/lib/trial';

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

/** Pro Monthly residency refill vs Visitor monthly grant (1,777 ÷ 111 ≈ 16). */
export const PRO_VS_VISITOR_MONTHLY_INK_MULTIPLIER = Math.round(
  PRO_MONTHLY_INK / FREE_MONTHLY_RESIDENCY_INK
);

/** Residency progress bar denominator (Visitor: signup + monthly grant, pool capped). */
export function getResidencyPoolCap(
  user: Pick<User, 'subscriptionStatus' | 'subscriptionTier'> | null | undefined
): number {
  if (isProUser(user)) {
    return isYearlyPro(user) ? PRO_YEARLY_INK : PRO_MONTHLY_INK;
  }
  return FREE_RESIDENCY_POOL_CAP;
}

export function getResidencyProgressPercent(residencyBalance: number, cap: number): number {
  if (cap <= 0) return 0;
  return Math.min(100, Math.round((residencyBalance / cap) * 100));
}

/** Approximate Ink for one full Studio Draft song (Calibration Hub default). */
export const STUDIO_DRAFT_INK_PER_SONG = 104;

/** Friendly Ink tip — Studio Draft vs line-by-line (shown in onboarding surfaces). */
export const STUDIO_DRAFT_INK_TIP =
  `Ink tip: a full default song is about ${STUDIO_DRAFT_INK_PER_SONG} Ink with Studio Draft in the Calibration Hub — line-by-line adds up faster if you use Next/Previous on every bar.`;

/** Shown above Ink Store pack grid */
export const INK_STORE_PACK_CONTEXT = `Pro includes monthly residency Ink (${PRO_MONTHLY_INK.toLocaleString()}/mo on ${PRO_MONTHLY_PRICE}); packs are permanent top-ups when your pool runs out.`;

export const INK_PACK_STUDIO_AMOUNT = 1000;
export const INK_PACK_STUDIO_PRICE = 7.77;
export const INK_PACK_ARTIST_AMOUNT = 1800;
export const INK_PACK_ARTIST_PRICE = 11.11;
export const INK_PACK_VAULT_AMOUNT = 4500;
export const INK_PACK_VAULT_PRICE = 19.44;

export type InkPackPriceKey = 'INK_REFILL' | 'INK_ARTIST' | 'INK_VAULT';

export type InkPackDefinition = {
  name: string;
  ink: number;
  priceAmount: number;
  priceKey: InkPackPriceKey;
  description: string;
  popular?: boolean;
  bestValue?: boolean;
  icon: 'Sparkles' | 'Star' | 'History';
};

export const INK_PACK_DEFINITIONS: readonly InkPackDefinition[] = [
  {
    name: 'Studio Pack',
    ink: INK_PACK_STUDIO_AMOUNT,
    priceAmount: INK_PACK_STUDIO_PRICE,
    priceKey: 'INK_REFILL',
    description: 'Entry permanent refill — same sticker as one month of Pro, never expires after residency.',
    popular: true,
    icon: 'Sparkles',
  },
  {
    name: 'Artist Bundle',
    ink: INK_PACK_ARTIST_AMOUNT,
    priceAmount: INK_PACK_ARTIST_PRICE,
    priceKey: 'INK_ARTIST',
    description: 'Professional permanent ink for heavy studio weeks.',
    icon: 'Star',
  },
  {
    name: 'Studio Vault',
    ink: INK_PACK_VAULT_AMOUNT,
    priceAmount: INK_PACK_VAULT_PRICE,
    priceKey: 'INK_VAULT',
    description: 'Maximum permanent capacity. Best $/ink on packs.',
    bestValue: true,
    icon: 'History',
  },
] as const;

export function formatInkPackDollars(amount: number): string {
  return `$${amount.toFixed(2)}`;
}

/** Vault savings vs buying the same ink via Studio Pack pricing */
export function getVaultPackSavingsPercent(): number {
  const studio = INK_PACK_DEFINITIONS[0];
  const vault = INK_PACK_DEFINITIONS[2];
  const equivStudioCost = (vault.ink / studio.ink) * studio.priceAmount;
  if (equivStudioCost <= vault.priceAmount) return 0;
  return Math.round(((equivStudioCost - vault.priceAmount) / equivStudioCost) * 100);
}

/** Why Bar 4 Bar vs full-song AI apps (pricing / FAQ). */
export const COMPETITOR_ANCHOR_COPY =
  'Unlike Suno or Udio, Bar 4 Bar is a lyric and rhyme workstation — you own the words, DNA strains, and vault; Ink powers drafting and analysis, not finished audio renders.';

export const PRO_FULL_UNLOCK_LINE = 'Full app unlocked — unlimited albums & tracks';

export const PRO_YEARLY_INCLUDES_LINE = 'Everything in Pro Monthly included';

/** Short perk lines shown directly under tier price (also kept in full feature lists below) */
export function getProMonthlyHeadlinePerks(): readonly string[] {
  return [
    PRO_FULL_UNLOCK_LINE,
    'Custom DNA vault saves, Performance Mode, Freestyle & DNA Drop links',
    `${PRO_MONTHLY_INK.toLocaleString()} residency Ink every month`,
  ];
}

export function getProYearlyHeadlinePerks(): readonly string[] {
  return [
    PRO_FULL_UNLOCK_LINE,
    'Custom DNA vault saves, Performance Mode, Freestyle & DNA Drop links',
    `${PRO_YEARLY_INK.toLocaleString()} residency Ink every month`,
    INK_PACK_YEARLY_DISCOUNT_SHORT,
    `Best price — ${PRO_YEARLY_PRICE}/mo effective (${PRO_YEARLY_BILLED}/year · save ${PRO_YEARLY_SUBSCRIPTION_SAVINGS_PERCENT}% vs ${PRO_MONTHLY_PRICE}/mo)`,
  ];
}

export function getVisitorHeadlinePerks(): readonly string[] {
  return [
    getVisitorInkGrantSummary(),
    'Full bar-by-bar AI workstation — all 9 Creative Effects included',
  ];
}

export function getProHeadlinePerks(billing: 'monthly' | 'yearly'): readonly string[] {
  return billing === 'yearly' ? getProYearlyHeadlinePerks() : getProMonthlyHeadlinePerks();
}

export const VISITOR_INK_SUMMARY = getVisitorInkGrantSummary();

/** Usage / tier cards — Visitor residency pool subcaption */
export const VISITOR_RESIDENCY_POOL_CAPTION = `${SIGNUP_INK} welcome Ink · +${FREE_MONTHLY_RESIDENCY_INK}/mo from month two (pool caps at ${FREE_RESIDENCY_POOL_CAP})`;

/** Welcome dialog — grant summary with pool cap */
export function getVisitorResidencyPoolCapLine(): string {
  return `${getVisitorInkGrantSummary()} — pool caps at ${FREE_RESIDENCY_POOL_CAP}.`;
}

/** Pro trial workflow unlock — shared across marketing and welcome surfaces */
export const PRO_TRIAL_WORKFLOW_DETAIL = 'unlimited projects, vault saves & full workflow';

/** Top-of-funnel — Stripe Pro trial (card required). */
export function getProTrialMarketingLine(): string {
  return `${getStripeTrialMarketingLine()} — ${PRO_TRIAL_WORKFLOW_DETAIL}`;
}

/** Hero / pricing — Try Pro with Stripe trial */
export function getStripeTrialCheckoutCtaLine(): string {
  return `Try Pro ${getStripeTrialDurationLabel()} free`;
}

/** Direct Pro checkout CTA — yearly default (matches pricing page). */
export function getProIntentCtaLine(billing: 'monthly' | 'yearly' = 'yearly'): string {
  if (billing === 'yearly') {
    return `Go Pro Yearly — ${PRO_YEARLY_PRICE}/mo`;
  }
  return `Go Pro Monthly — ${PRO_MONTHLY_PRICE}/mo`;
}

export function getProIntentInkDetail(billing: 'monthly' | 'yearly'): string {
  const ink = billing === 'yearly' ? PRO_YEARLY_INK : PRO_MONTHLY_INK;
  return `${ink.toLocaleString()} residency Ink/mo`;
}

export function getProIntentBilledDetail(billing: 'monthly' | 'yearly'): string {
  if (billing === 'yearly') {
    return `${PRO_YEARLY_BILLED}/year billed annually`;
  }
  return 'billed monthly';
}

/** Free signup hero CTA */
export function getFreeSignupCtaLine(): string {
  return 'Start free demo';
}

/** Marketing signup CTAs — welcome Ink only (no +111/mo at top of funnel) */
export function getSignupInkMarketingLine(
  variant: 'login' | 'landing' | 'showcase' | 'social' | 'footnote' = 'login'
): string {
  switch (variant) {
    case 'landing':
      return `Free ${SIGNUP_INK} Ink to try the workstation — no credit card required.`;
    case 'showcase':
      return `Free ${SIGNUP_INK} Ink to try AI tools — no credit card. Initialize your session below.`;
    case 'social':
      return `${SIGNUP_INK} free Ink to try AI tools`;
    case 'footnote':
      return `${SIGNUP_INK} welcome Ink included — full residency details on Pricing & Usage`;
    default:
      return `Free ${SIGNUP_INK} Ink to try the workstation — no card required`;
  }
}

/** Login / landing subline — free demo + optional Stripe trial */
export function getTopFunnelSignupSubline(): string {
  return `${getSignupInkMarketingLine('login')} · ${getStripeTrialTitle()} available at checkout`;
}

/** Header ink dropdown — Visitor residency pool label */
export function getVisitorPoolHeaderCaption(): string {
  return `Visitor pool (${SIGNUP_INK} welcome · +${FREE_MONTHLY_RESIDENCY_INK}/mo from month two)`;
}

/** Usage page — Pro residency refill subcaption */
export function getProResidencyRefillCaption(isYearly: boolean): string {
  const ink = isYearly ? PRO_YEARLY_INK : PRO_MONTHLY_INK;
  const tier = isYearly ? 'Yearly' : 'Monthly';
  return `${tier} Pro residency (${ink.toLocaleString()}/mo refill)`;
}

/** Pricing FAQ — residency vs permanent Ink */
export function getResidencyVsPermanentFaqAnswer(): string {
  return `Residency Ink is included with your membership and refills each billing cycle (${PRO_MONTHLY_INK.toLocaleString()}/mo on Pro Monthly, ${PRO_YEARLY_INK.toLocaleString()}/mo on Pro Yearly). Permanent Ink is bought in packs, never expires, and is used after residency runs out.`;
}

/** Pricing FAQ — refer a friend */
export function getReferralFaqAnswer(): string {
  return `Copy your link from Ink Store → Refer a Friend. When a new artist signs up through it, you each get ${REFERRAL_INK_REWARD} permanent Ink (referrers earn up to ${MAX_REFERRAL_REWARDS} bonuses). Bonuses apply automatically at signup and are tracked on Stripe checkout when they upgrade.`;
}

/** Shown on Ink Store for non-Pro artists */
export const VISITOR_INK_STORE_NOTICE = {
  headline: 'Visitor studio — full AI lyric workstation',
  body: `Every Ink-priced tool works on welcome + monthly residency Ink and permanent packs — Generate Next Line, Smart Structure, all 9 Creative Effects, and more. Pro unlocks your catalog workflow: custom DNA/Vibe/Style saves, Performance Mode, Freestyle, vault import/export, and DNA Drop share links — plus ${PRO_MONTHLY_INK.toLocaleString()} residency Ink/mo.`,
} as const;

/** Free tier limits — shown on comparison charts */
export const VISITOR_FEATURES = [
  VISITOR_RESIDENCY_POOL_CAPTION,
  `${FREE_ALBUM_LIMIT} album · ${FREE_TRACK_LIMIT} tracks — demo-scale projects`,
  'Full bar-by-bar AI on Ink — Generate Next/Previous, Smart Structure, Studio Draft & Rhyme Pulse',
  'All 9 Creative Effects — Simile, Metaphor, Twist, POV, Blend & more (10 Ink each)',
  'System DNA / Vibe / Style presets — load-only, no custom vault saves',
  'PDF & track export · locked: Performance Mode, Freestyle, vault import/export & DNA Drop links',
] as const;

/** Everything Pro unlocks + why it matters vs Visitor */
export const PRO_UNLOCKS = [
  `UNLOCK: Unlimited albums & tracks — full catalog vs ${FREE_ALBUM_LIMIT} album / ${FREE_TRACK_LIMIT} tracks`,
  'UNLOCK: Custom DNA / Vibe / Style vault saves — save your strains, not just load system presets',
  'UNLOCK: Performance Mode — teleprompter + rhyme-focus for rehearsal & stage',
  'UNLOCK: Freestyle capture — record flows straight into your rhyme book',
  'UNLOCK: Full-studio vault import / export — merge JSON blueprints across devices',
  'UNLOCK: Shareable project links — DNA Drop live links for collab & feedback',
  `${PRO_MONTHLY_INK.toLocaleString()} monthly residency Ink — refreshes each billing cycle`,
] as const;

/** Yearly Pro-only perks on top of full Pro unlocks */
export const PRO_YEARLY_EXCLUSIVES = [
  `${PRO_YEARLY_INK.toLocaleString()} residency Ink/mo — upgraded from ${PRO_MONTHLY_INK.toLocaleString()} on monthly Pro`,
  `${INK_PACK_YEARLY_DISCOUNT_SHORT} — forever, not a limited promo`,
  'BYO Google AI key — your API quota for model calls; Ink covers workstation orchestration (not double token billing)',
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

export { SEO } from '@/lib/seo';

/** Ink pack rows for Ink Store (amounts align with stripe-catalog fulfillment) */
export function getInkPackRows(isYearlyPro: boolean) {
  const discountMultiplier = isYearlyPro ? 1 - INK_PACK_YEARLY_DISCOUNT_PERCENT / 100 : 1;
  const yearlyLabel = isYearlyPro ? INK_PACK_YEARLY_DISCOUNT_LABEL : null;
  const vaultSavingsPercent = getVaultPackSavingsPercent();

  return INK_PACK_DEFINITIONS.map((pack) => {
    const discountedAmount = Math.round(pack.priceAmount * discountMultiplier * 100) / 100;
    return {
      ...pack,
      originalPrice: formatInkPackDollars(pack.priceAmount),
      price: formatInkPackDollars(discountedAmount),
      priceAmount: pack.priceAmount,
      discountedPriceAmount: discountedAmount,
      savingsPercent: pack.bestValue ? vaultSavingsPercent : null,
      discount: yearlyLabel,
    };
  });
}

export function getStudioTierPlans(isCloudSyncActive: boolean, subscriptionTier?: string) {
  return [
    {
      name: 'Visitor',
      price: '$0',
      period: '',
      description: 'Full AI lyric workstation on free Ink.',
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
