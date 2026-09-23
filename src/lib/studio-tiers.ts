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
  REFERRAL_INK_SPEND_THRESHOLD,
  isProUser,
  isYearlyPro,
} from '@/lib/subscription';
import type { User } from '@/lib/types';
import { MAX_MONTHLY_RESIDENCY, PRO_MONTHLY_RESIDENCY, PRO_YEARLY_RESIDENCY } from '@/lib/stripe-catalog';
import { isStudioMaxUser } from '@/lib/subscription-products';
import { QUOTE_PRESS_SLOT_LIMIT } from '@/lib/profile/quote-press';
import { getVisitorInkGrantSummary } from '@/lib/ink-grants';
import { MAX_REFERRAL_REWARDS, REFERRAL_INK_REWARD } from '@/lib/referrals';

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

/** Pro Monthly residency refill vs Visitor monthly grant (1,777 ÷ 150 ≈ 12). */
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

/** Approximate Ink for one full Studio Draft song (52 bars × 3 Ink/bar). */
export const STUDIO_DRAFT_INK_PER_SONG = 156;

/** Friendly Ink tip — Studio Draft vs line-by-line (shown in onboarding surfaces). */
export const STUDIO_DRAFT_INK_TIP =
  `Ink tip: a full default song is about ${STUDIO_DRAFT_INK_PER_SONG} Ink with Studio Draft in the Calibration Hub — line-by-line adds up faster if you use Next/Previous on every bar.`;

/** Shown above Ink Store pack grid */
export const INK_STORE_PACK_CONTEXT = `Pro includes monthly residency Ink (${PRO_MONTHLY_INK.toLocaleString()}/mo on ${PRO_MONTHLY_PRICE}); packs are permanent top-ups when your pool runs out.`;

export const STUDIO_MAX_MONTHLY_PRICE_AMOUNT = 9.77;
export const STUDIO_MAX_YEARLY_BILLED_AMOUNT = 93.24;
export const STUDIO_MAX_MONTHLY_PRICE = `$${STUDIO_MAX_MONTHLY_PRICE_AMOUNT.toFixed(2)}`;
export const STUDIO_MAX_YEARLY_EFFECTIVE_MONTHLY = 7.77;
export const STUDIO_MAX_MONTHLY_INK = MAX_MONTHLY_RESIDENCY;

export const STUDIO_MAX_FEATURES = [
  'Everything in Studio Pro',
  'Generate Song from your sheet (lyrics + co-writer rails)',
  'Vault → instrumental renders & private Approved Studio library',
  'Local render companion + included cloud render passes',
] as const;

export function getStudioMaxHeadlinePerks(): readonly string[] {
  return ['Pro Writer workflow + optional ACE-Step song rendering'];
}

export const INK_PACK_STUDIO_AMOUNT = 10_000;
export const INK_PACK_STUDIO_PRICE = 7.77;
export const INK_PACK_ARTIST_AMOUNT = 25_000;
export const INK_PACK_ARTIST_PRICE = 17.77;
export const INK_PACK_VAULT_AMOUNT = 50_000;
export const INK_PACK_VAULT_PRICE = 34.44;

/** Visitor artists may purchase Studio Pack only — bulk packs require Pro. */
export const VISITOR_INK_PACK_NOTICE =
  'Visitor artists can buy the Studio Pack. Go Pro to unlock Artist Bundle and Studio Vault bulk packs.';

export const PRO_GATED_INK_PACK_KEYS = new Set<InkPackPriceKey>(['INK_ARTIST', 'INK_VAULT']);

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
    description: 'Pro artists — professional permanent ink for heavy studio weeks.',
    icon: 'Star',
  },
  {
    name: 'Studio Vault',
    ink: INK_PACK_VAULT_AMOUNT,
    priceAmount: INK_PACK_VAULT_PRICE,
    priceKey: 'INK_VAULT',
    description: 'Pro artists — maximum permanent capacity. Best $/ink on packs.',
    bestValue: true,
    icon: 'History',
  },
] as const;

export function formatInkPackDollars(amount: number): string {
  return `$${amount.toFixed(2)}`;
}

/** Round Yearly Pro ink-pack discount to cents (matches Stripe percent_off checkout). */
export function applyYearlyInkPackDiscount(priceAmount: number): number {
  const multiplier = 1 - INK_PACK_YEARLY_DISCOUNT_PERCENT / 100;
  return Math.round(priceAmount * multiplier * 100) / 100;
}

/** Stripe `unit_amount` in cents — keep scripts/verify in sync with pack list prices. */
export const STRIPE_UNIT_AMOUNTS_CENTS = {
  PRO_MONTHLY: Math.round(PRO_MONTHLY_PRICE_AMOUNT * 100),
  PRO_YEARLY: Math.round(PRO_YEARLY_BILLED_AMOUNT * 100),
  INK_REFILL: Math.round(INK_PACK_STUDIO_PRICE * 100),
  INK_ARTIST: Math.round(INK_PACK_ARTIST_PRICE * 100),
  INK_VAULT: Math.round(INK_PACK_VAULT_PRICE * 100),
} as const;

export function getYearlyProInkPackCheckoutSummary(): string {
  return INK_PACK_DEFINITIONS.map((pack) => {
    const discounted = applyYearlyInkPackDiscount(pack.priceAmount);
    return `${pack.name} ${formatInkPackDollars(discounted)}`;
  }).join(' · ');
}

/** Vault savings vs buying the same ink via Studio Pack pricing */
export function getVaultPackSavingsPercent(): number {
  const studio = INK_PACK_DEFINITIONS[0];
  const vault = INK_PACK_DEFINITIONS[2];
  const equivStudioCost = (vault.ink / studio.ink) * studio.priceAmount;
  if (equivStudioCost <= vault.priceAmount) return 0;
  return Math.round(((equivStudioCost - vault.priceAmount) / equivStudioCost) * 100);
}

/** Why AKAsheet vs full-song AI apps (pricing / FAQ). */
export const COMPETITOR_ANCHOR_COPY_WRITER =
  'AKAsheet is a bar-by-bar songwriting workstation — you own the vault, DNA, and releases; Ink powers lyrics and drafting without a context-free prompt jukebox.';

export const COMPETITOR_ANCHOR_COPY =
  'AKAsheet is a bar-by-bar songwriting workstation with optional local-first sheet-to-song rendering on Studio Max — you own the vault, DNA, and releases; Ink powers lyrics and renders without a context-free prompt jukebox.';

export function getCompetitorAnchorCopy(includeSongGeneration: boolean): string {
  return includeSongGeneration ? COMPETITOR_ANCHOR_COPY : COMPETITOR_ANCHOR_COPY_WRITER;
}

/**
 * Three different products — keep these names distinct in UI copy:
 * - Music release / New release / press live = song or album audio (Free)
 * - Lyrics DNA Drop = shareable lyric snapshot link (Pro)
 * - The Pressing = Artist Home living background (Free)
 */
export const MUSIC_RELEASE_FREE_LINE = `Song and album music releases are Free. Open New release on The Scene, upload, set a price, and press live — within your catalog slots (${FREE_ALBUM_LIMIT} album · ${FREE_TRACK_LIMIT} tracks on Visitor).`;
export const DNA_DROP_PRO_LINE =
  'Lyrics DNA Drop is Studio Pro: publish, view, download, and import lyric snapshots (lyrics, structure, DNA). Guests sign in to check tier or create an account; Visitor members upgrade on Studio Tier. It is not the music sell desk.';
export const PRESSING_FREE_LINE =
  'The Pressing — your Artist Home living skin — is Free with your public page.';
export const MUSIC_RELEASE_PRO_PERKS_LINE =
  `Pro perks around music: unlimited catalog (${FREE_ALBUM_LIMIT} album / ${FREE_TRACK_LIMIT} track cap on Visitor). Song & album releases stay Free. Library offline saves work for music you own or purchased on any tier.`;
export const MUSIC_VS_DNA_GLOSSARY = `${MUSIC_RELEASE_FREE_LINE} ${DNA_DROP_PRO_LINE} ${MUSIC_RELEASE_PRO_PERKS_LINE}`;

export const PRO_FULL_UNLOCK_LINE = 'Full studio workflow — Pro-only unlocks in the list below';

export const PRO_YEARLY_INCLUDES_LINE = 'Everything in Pro Monthly included';

/** Short positioning under tier price — no Ink/pricing repeats (those live in Studio Capacity + feature list). */
export function getProMonthlyHeadlinePerks(): readonly string[] {
  return [PRO_FULL_UNLOCK_LINE];
}

export function getProYearlyHeadlinePerks(): readonly string[] {
  return [
    PRO_YEARLY_INCLUDES_LINE,
    'Plus more residency Ink, Permanent Ink savings & Studio Roadmap Input',
  ];
}

/** Visitor positioning — AI tools included; catalog workflow is Pro */
export const VISITOR_AI_POSITIONING =
  'Full bar-by-bar AI on Ink — demo-scale catalog (presets only, no custom vault saves)';

export function getVisitorHeadlinePerks(): readonly string[] {
  return [getVisitorInkGrantSummary(), `${VISITOR_AI_POSITIONING} — all 9 Creative Effects included`];
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

/** Pro catalog workflow — shared across marketing surfaces */
export const PRO_WORKFLOW_DETAIL = 'unlimited projects, vault saves, export & full workflow';

/** Top-of-funnel — pay-now Pro positioning */
export function getProMarketingLine(): string {
  return `Go Pro — ${PRO_WORKFLOW_DETAIL}`;
}

/** @deprecated Stripe trial removed — use getProCheckoutCtaLine */
export function getStripeTrialCheckoutCtaLine(): string {
  return getProCheckoutCtaLine('yearly');
}

/** Pricing / welcome — immediate Pro checkout */
export function getProCheckoutCtaLine(billing: 'monthly' | 'yearly' = 'yearly'): string {
  return billing === 'yearly' ? `Go Pro Yearly — ${PRO_YEARLY_PRICE}/mo` : `Go Pro Monthly — ${PRO_MONTHLY_PRICE}/mo`;
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

/** Marketing signup CTAs — welcome Ink only (no +150/mo at top of funnel) */
export function getSignupInkMarketingLine(
  variant: 'login' | 'landing' | 'showcase' | 'social' | 'footnote' = 'login'
): string {
  switch (variant) {
    case 'landing':
      return `Free ${SIGNUP_INK} Ink to try AI tools — no credit card required.`;
    case 'showcase':
      return `Free ${SIGNUP_INK} Ink to try AI tools — no credit card. Initialize your session below.`;
    case 'social':
      return `${SIGNUP_INK} free Ink to try AI tools`;
    case 'footnote':
      return `${SIGNUP_INK} welcome Ink included — full residency details on Pricing & Usage`;
    default:
      return `Free ${SIGNUP_INK} Ink to try AI tools — no card required`;
  }
}

/** Login / landing subline — free demo, pay when ready for Pro */
export function getTopFunnelSignupSubline(): string {
  return `${getSignupInkMarketingLine('login')} · Pro unlocks export, vault saves & unlimited catalog`;
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
  return `Every new account starts with ${SIGNUP_INK} welcome Ink. When an eligible friend signs up through your referral link, they can receive up to ${REFERRAL_INK_REWARD} additional referral Ink. You can earn up to ${REFERRAL_INK_REWARD} Ink after they legitimately spend ${REFERRAL_INK_SPEND_THRESHOLD} Ink on AI tools, for up to ${MAX_REFERRAL_REWARDS} rewarded referrals. Visitor referral Ink goes into the residency pool, capped at ${FREE_RESIDENCY_POOL_CAP}; Pro referral Ink is permanent. One referral welcome bonus per eligible identity.`;
}

/** Pricing FAQ — is Artist Home / The Scene free */
export function getArtistHomeFaqAnswer(): string {
  return `Yes — every artist gets a free Artist Home: a shareable /profile page with skin, Album Rooms, wall posts, and embeds from TikTok, Instagram, Facebook, and YouTube. It is private by default; flip it live whenever you want eyes on it. Signing in lands you on The Scene — your friends feed, Discover, and Your Booth — with the Vault one click away. ${PRESSING_FREE_LINE} ${MUSIC_RELEASE_FREE_LINE} Pro does not gate Artist Home or music releases; it unlocks the full studio workflow (unlimited catalog, custom vault saves, Imprint mix controls, DNA Strain Mixer, Pro AI studio tools, Performance Mode, Freestyle, Collab Sheet, and Lyrics DNA Drop links). Offline Library downloads work for music you own or purchased on any tier.`;
}

/** Pricing FAQ — do I need Pro to publish a song/album */
export function getMusicReleaseTierFaqAnswer(): string {
  return MUSIC_VS_DNA_GLOSSARY;
}

/** Pricing FAQ — sharing posts */
export function getPostSharingFaqAnswer(): string {
  return 'Every post on your Artist Home wall has a Share button — X, Facebook, WhatsApp, email, copy link, or your device share sheet. It links straight back to your public page (deep-linked to that post) so fans and collaborators land on your Artist Home, not a screenshot.';
}

/** Shown on Ink Store for non-Pro artists */
export const VISITOR_INK_STORE_NOTICE = {
  headline: 'Visitor — AI lyric tools on Ink',
  body: `Every Ink-priced bar-by-bar AI tool works on welcome + monthly residency Ink and permanent packs — Generate Next Line, Smart Structure, all 9 Creative Effects, and more. Artist Home, The Pressing, The Block, and song/album music releases are included on Free. Pro unlocks custom vault saves, Imprint mix controls, DNA Strain Mixer, Pro-only AI studio tools, Performance Mode, Freestyle, Collab Sheet, vault import/export, and Lyrics DNA Drop links — plus ${PRO_MONTHLY_INK.toLocaleString()} residency Ink/mo on Pro. Offline Library downloads work for music you own or purchased on any tier.`,
} as const;

/** Free tier limits — shown on comparison charts */
export const VISITOR_FEATURES = [
  VISITOR_RESIDENCY_POOL_CAPTION,
  `${FREE_ALBUM_LIMIT} album · ${FREE_TRACK_LIMIT} tracks — demo-scale projects`,
  'Full bar-by-bar AI on Ink — Generate Next/Previous, Smart Structure, Studio Draft & Rhyme Pulse',
  'All 9 Creative Effects — Simile, Metaphor, Twist, POV, Blend & more (10 Ink each)',
  'Artist Home — shareable public page, The Pressing skin, Edit Public Page, The Block friends feed',
  'Song & album music releases — New release on The Scene (Free; demo catalog slots)',
  'System presets only — custom DNA/Vibe/Style vault saves are Pro',
  'Locked on Visitor: Imprint faders, custom vault saves, DNA Strain Mixer, Pro AI studio tools, lyric export, Performance Mode, Freestyle (30s demo), Collab Sheet, vault JSON import/export & Lyrics DNA Drop links',
] as const;

/** Studio Pro-only workflow (paid Pro for catalog + some album tools; Pro or active preview for most workflow — see subscription.ts). */
export const PRO_UNLOCKS = [
  `Unlimited albums & tracks — paid Pro only (Visitor: ${FREE_ALBUM_LIMIT} album · ${FREE_TRACK_LIMIT} tracks)`,
  'Custom DNA, Vibe & Style vault saves — store your strains (Visitor: system presets only)',
  'DNA Strain Mixer — blend saved strains into album direction (paid Pro)',
  'Pro AI studio — Extract Album DNA, Train AI on Style & Scene Gen prompts (Ink-priced; blocked on Visitor)',
  `Imprint mix on posts & comments — Color/Texture/Rhythm/Depth faders, shuffle & ${QUOTE_PRESS_SLOT_LIMIT} lockable style slots (Visitor: auto look from text)`,
  'Lyric export — PDF, TXT & JSON downloads (Visitor: preview layout only)',
  'Performance Mode — full-screen teleprompter with rhyme focus',
  'Freestyle capture — full sessions (Visitor: 30-second demo)',
  'Collab Sheet — live co-editing with collaborators on a track',
  'Lyrics DNA Drop links — publish, view, download & import lyric snapshots',
  'Vault JSON import & export — merge blueprints across devices',
] as const;

/** Yearly Pro billing perks on top of Pro Monthly unlocks (Ink totals live in Studio Capacity / plan description). */
export const PRO_YEARLY_EXCLUSIVES = [
  `${INK_PACK_YEARLY_DISCOUNT_SHORT} on Permanent Ink packs`,
  'Artist Bundle & Studio Vault bulk packs (Visitor: Studio Pack only)',
  'Studio Roadmap Input — yearly feedback & feature votes',
  `${PRO_YEARLY_BILLED}/yr billed annually (${PRO_YEARLY_PRICE}/mo effective · save ${PRO_YEARLY_SUBSCRIPTION_SAVINGS_PERCENT}% vs monthly)`,
] as const;

/** @deprecated Use PRO_UNLOCKS — kept for imports */
export const PRO_MONTHLY_FEATURES = PRO_UNLOCKS;

/** @deprecated Use PRO_YEARLY_EXCLUSIVES — kept for imports */
export const PRO_YEARLY_FEATURES = PRO_YEARLY_EXCLUSIVES;

export function getProTierFeatures(billing: 'monthly' | 'yearly'): readonly string[] {
  if (billing === 'monthly') return PRO_UNLOCKS;
  return [...PRO_UNLOCKS, ...PRO_YEARLY_EXCLUSIVES];
}

/** Visual emphasis for tier comparison lists */
export type TierFeatureHighlight = 'none' | 'pro' | 'yearly';

export function getTierFeatureHighlight(
  feature: string,
  tierName: string
): TierFeatureHighlight {
  if (tierName === 'Visitor') return 'none';
  if (/50%|Roadmap|roadmap|billed annually|vs monthly|Artist Bundle|Studio Vault bulk/i.test(feature)) return 'yearly';
  if (/Everything in Pro Monthly/i.test(feature)) return 'pro';
  if (tierName === 'Pro Yearly' && PRO_YEARLY_EXCLUSIVES.some((e) => e === feature)) return 'yearly';
  return 'pro';
}

export { SEO } from '@/lib/seo';

/** Ink pack rows for Ink Store (amounts align with stripe-catalog fulfillment) */
export function getInkPackRows(isYearlyPro: boolean) {
  const yearlyLabel = isYearlyPro ? INK_PACK_YEARLY_DISCOUNT_LABEL : null;
  const vaultSavingsPercent = getVaultPackSavingsPercent();

  return INK_PACK_DEFINITIONS.map((pack) => {
    const discountedAmount = isYearlyPro
      ? applyYearlyInkPackDiscount(pack.priceAmount)
      : pack.priceAmount;
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

export function getStudioTierPlans(
  isCloudSyncActive: boolean,
  user?: Pick<User, 'subscriptionTier' | 'subscriptionStatus' | 'subscriptionProduct'> | null,
  options?: { includeStudioMax?: boolean }
) {
  const includeStudioMax = options?.includeStudioMax === true;
  const subscriptionTier = user?.subscriptionTier;
  const isMax = isStudioMaxUser(user);
  const proCurrent = isCloudSyncActive && !isMax;
  return [
    {
      name: 'Visitor',
      price: '$0',
      period: '',
      description: 'Full AI lyric workstation on free Ink.',
      headlinePerks: getVisitorHeadlinePerks(),
      billedText: undefined as string | undefined,
      isCurrent: !isCloudSyncActive,
      priceKey: null,
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
      isCurrent: proCurrent && subscriptionTier === 'monthly',
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
      isCurrent: proCurrent && subscriptionTier === 'yearly',
      priceKey: 'PRO_YEARLY' as const,
      features: [...PRO_UNLOCKS, ...PRO_YEARLY_EXCLUSIVES],
      cta: 'Upgrade to Yearly',
    },
    ...(includeStudioMax
      ? [
          {
            name: 'Studio Max Monthly',
            price: STUDIO_MAX_MONTHLY_PRICE,
            period: '/mo',
            description: `${STUDIO_MAX_MONTHLY_INK.toLocaleString()} residency Ink/mo · song rendering on top of Pro`,
            headlinePerks: getStudioMaxHeadlinePerks(),
            billedText: 'Billed monthly',
            isCurrent: isMax && subscriptionTier === 'monthly',
            priceKey: 'MAX_MONTHLY' as const,
            features: [...STUDIO_MAX_FEATURES],
            cta: 'Upgrade to Studio Max',
          },
          {
            name: 'Studio Max Yearly',
            price: `$${STUDIO_MAX_YEARLY_EFFECTIVE_MONTHLY.toFixed(2)}`,
            period: '/mo',
            badge: `Billed ${STUDIO_MAX_YEARLY_BILLED_AMOUNT.toFixed(2)}/yr`,
            description: `${STUDIO_MAX_MONTHLY_INK.toLocaleString()} residency Ink/mo · yearly Studio Max`,
            headlinePerks: getStudioMaxHeadlinePerks(),
            billedText: `$${STUDIO_MAX_YEARLY_BILLED_AMOUNT.toFixed(2)}/year · one charge annually`,
            isCurrent: isMax && subscriptionTier === 'yearly',
            priceKey: 'MAX_YEARLY' as const,
            features: [...STUDIO_MAX_FEATURES],
            cta: 'Studio Max Yearly',
          },
        ]
      : []),
  ];
}
