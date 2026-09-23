/**
 * AKAsheet First Drops — buy-once, stream-in-app commerce for Lyrics DNA Drops.
 * Named release: feat/bar4bar-first-drops
 * Live switch: Admin Panel → Config → First Drops (`config/firstDrops`).
 */

import { FREE_ALBUM_LIMIT, FREE_TRACK_LIMIT } from '@/lib/subscription';

export const BAR4BAR_FIRST_DROPS = 'bar4bar-first-drops' as const;

export const DROP_PAID_MIN_CENTS = 199;
export const DROP_MID_FEE_FROM_CENTS = 300;
export const DROP_STANDARD_FEE_FROM_CENTS = 500;
export const DROP_LOW_PRICE_FEE_BPS = 2500; // 25% from $1.99 through $2.99
export const DROP_MID_PRICE_FEE_BPS = 1500; // 15% from $3.00 through $4.99
export const DROP_PLATFORM_FEE_BPS = 1000; // 10% from $5.00
export const DROP_PLATFORM_FEE_PERCENT = DROP_PLATFORM_FEE_BPS / 100;
export const DROP_LOW_PRICE_FEE_PERCENT = DROP_LOW_PRICE_FEE_BPS / 100;

export function dropPlatformFeeBps(amountCents: number): number {
  const amount = Math.max(0, Math.round(amountCents));
  if (amount > 0 && amount < DROP_MID_FEE_FROM_CENTS) return DROP_LOW_PRICE_FEE_BPS;
  if (amount < DROP_STANDARD_FEE_FROM_CENTS) return DROP_MID_PRICE_FEE_BPS;
  return DROP_PLATFORM_FEE_BPS;
}

export function dropPlatformFeeLabel(): string {
  return `${DROP_PLATFORM_FEE_PERCENT}–${DROP_LOW_PRICE_FEE_PERCENT}%`;
}

export function dropArtistSharePercent(): number {
  return 100 - DROP_LOW_PRICE_FEE_PERCENT;
}

export function dropArtistShareLabel(): string {
  return `${dropArtistSharePercent()}–${100 - DROP_PLATFORM_FEE_PERCENT}%`;
}

export function dropPlatformFeePercent(amountCents: number): number {
  return dropPlatformFeeBps(amountCents) / 100;
}

export function dropArtistSharePercentForAmount(amountCents: number): number {
  return 100 - dropPlatformFeePercent(amountCents);
}

/** Platform cut of a First Drop sale, in cents. */
export function dropPlatformFeeCents(amountCents: number): number {
  const amount = Math.max(0, Math.round(amountCents));
  const fee = Math.round((amount * dropPlatformFeeBps(amount)) / 10_000);
  return Math.min(fee, Math.max(0, amount - 1));
}

/** Artist share after the platform fee. Stripe processing is paid by the platform. */
export function dropArtistNetCents(amountCents: number): number {
  const amount = Math.max(0, Math.round(amountCents));
  return Math.max(0, amount - dropPlatformFeeCents(amount));
}

/** Approximate Stripe card processing AKAsheet pays (not deducted from artist net). */
export const DROP_STRIPE_PROCESSING_PERCENT = 2.9;
export const DROP_STRIPE_PROCESSING_FIXED_CENTS = 30;

export function dropStripeProcessingEstimateCents(amountCents: number): number {
  const amount = Math.max(0, Math.round(amountCents));
  if (amount <= 0) return 0;
  return Math.round(amount * (DROP_STRIPE_PROCESSING_PERCENT / 100) + DROP_STRIPE_PROCESSING_FIXED_CENTS);
}

export type DropFeePreview = {
  buyerPaysCents: number;
  platformFeeCents: number;
  platformFeePercent: number;
  artistNetCents: number;
  artistSharePercent: number;
  stripeProcessingEstimateCents: number;
};

export function dropFeePreview(amountCents: number): DropFeePreview {
  const buyerPaysCents = Math.max(DROP_PAID_MIN_CENTS, Math.max(0, Math.round(amountCents)));
  return {
    buyerPaysCents,
    platformFeeCents: dropPlatformFeeCents(buyerPaysCents),
    platformFeePercent: dropPlatformFeePercent(buyerPaysCents),
    artistNetCents: dropArtistNetCents(buyerPaysCents),
    artistSharePercent: dropArtistSharePercentForAmount(buyerPaysCents),
    stripeProcessingEstimateCents: dropStripeProcessingEstimateCents(buyerPaysCents),
  };
}

/** Live split under the price the artist is setting. */
export function firstDropsSplitLine(amountCents: number): string {
  const p = dropFeePreview(amountCents);
  return `Buyer pays ${centsToUsdLabel(p.buyerPaysCents)} · you keep ${centsToUsdLabel(p.artistNetCents)} (${p.artistSharePercent}%) · we keep ${centsToUsdLabel(p.platformFeeCents)} (${p.platformFeePercent}%)`;
}

/** Extra line clarifying Stripe is platform-borne — never subtracted from artist net. */
export function firstDropsStripeProcessingLine(amountCents: number): string {
  const p = dropFeePreview(amountCents);
  return `Stripe processing ~${centsToUsdLabel(p.stripeProcessingEstimateCents)} is paid by AKAsheet — not taken from your share.`;
}

export function firstDropsFeeLine(): string {
  return `We keep 25% below $3, 15% from $3–$4.99, and 10% from $5 up — the rest is yours.`;
}

export function firstDropsCashoutLine(): string {
  return 'Connect payouts on Earnings so Stripe can send your share to your bank.';
}

/** Tight fee + cashout line for banners, hints, and marketing. */
export function firstDropsFeeCashoutLine(): string {
  return 'We keep 25% below $3, 15% from $3–$4.99, and 10% from $5 up. Cash out the rest on Earnings after you connect payouts.';
}

/** Public selling copy — hide whenever First Drops is toggled off. */
export function firstDropsPitch(): string {
  return `Open New release from The Scene — Free on every signed-in account. Choose a song or album, upload the music, set a price, and publish the release. Listen / buy sits at the top of your Artist Home, on The Scene, and on the release link. Preview 30 seconds, buy once, stream here. You keep the rights to your music—we take a small fee on the sale to run the platform. Lyrics DNA Drop is the separate Pro lyric page. ${firstDropsFeeLine()} ${firstDropsCashoutLine()}`;
}

export function getFirstDropsWhatFaqAnswer(): string {
  return `A Release is a recording you publish for listening or purchase—not a subsection of Lyrics DNA Drop, and not a Pro-only feature. Upload the song privately, set a price or pay-what-you-want, and fans buy once to stream it in AKAsheet. Preview is 30 seconds until they unlock. Library is the in-app player—crates, search, and a four-bar visualizer. It is not a Spotify listing. ${firstDropsFeeLine()} ${firstDropsCashoutLine()} Ink is never used to buy music. Lyrics DNA Drop links stay Pro.`;
}

export function getFirstDropsSellFaqAnswer(): string {
  return `Free on every signed-in account. On The Scene, tap New release. Choose a Vault song or album, upload the music, set a price or pay-what-you-want, then Publish release. Visitor catalog is ${FREE_ALBUM_LIMIT} album / ${FREE_TRACK_LIMIT} tracks; Pro adds unlimited slots. Offline downloads are included for music you own or purchased. Lyrics DNA Drop is the separate Pro lyrics-only page. Visitors see Listen / buy on your Artist Home, The Scene, and the release link. To get paid, open Earnings and connect Stripe payouts.`;
}

export function getFirstDropsRightsFaqAnswer(): string {
  return `Yes. You keep all rights to your lyrics, recordings, and masters. Uploading a song to sell on AKAsheet is not a label deal and does not transfer ownership. We host the in-app stream and keep 25% below $3, 15% from $3–$4.99, or 10% from $5 up — the rest is yours. ${firstDropsCashoutLine()}`;
}

export function getFirstDropsFeeFaqAnswer(): string {
  return `A 25% platform fee below $3, 15% from $3–$4.99, or 10% from $5 up — not a cut of your catalog. Paid checkout starts at ${centsToUsdLabel(DROP_PAID_MIN_CENTS)}. You still own the recording. The rest is yours. ${firstDropsCashoutLine()} Fans buy once and stream in the app — Ink is not used for music purchases.`;
}

export function getFirstDropsCashoutFaqAnswer(): string {
  return 'Open Earnings from the Scene dock, account menu, Settings → Release payouts, or Release Catalog. Connect Stripe payouts once—identity and bank. New sales go to your Stripe balance automatically; Stripe then pays your bank on its schedule, usually a few days after a sale clears. Sales made before you connect stay Held until you finish setup or tap Send held sales.';
}

export const DROP_AUDIO_MAX_BYTES = 40 * 1024 * 1024;
export const DROP_PREVIEW_SECONDS = 30;
export const DROP_PRICE_PRESETS_CENTS = [199, 299, 499, 777] as const;

export const DROP_AUDIO_ACCEPT =
  'audio/mpeg,audio/mp3,audio/wav,audio/x-wav,audio/mp4,audio/aac,audio/ogg,audio/flac,audio/webm,.mp3,.wav,.m4a,.aac,.ogg,.flac';

export type DropPriceMode = 'hidden' | 'free' | 'fixed' | 'pwyw';

export type DropPrice = {
  mode: DropPriceMode;
  /** Fixed price in cents. */
  amountCents?: number;
  /** Pay-what-you-want floor. Paid drops never fall below DROP_PAID_MIN_CENTS. */
  minCents?: number;
  /** Pay-what-you-want suggested amount. */
  suggestedCents?: number;
};

export type DropAudioProvenance = {
  generatedInApp: boolean;
  sourceGeneratedTakeId?: string;
  recipeHash?: string;
  modelFamily?: string;
  modelRevision?: string;
  disclosedAt?: string;
};

export type DropAudioMeta = {
  storagePath: string;
  previewPath?: string;
  contentType: string;
  durationSec?: number;
  byteSize?: number;
  fileName?: string;
  uploadedAt: string;
  audioProvenance?: DropAudioProvenance;
};

export type DropLibraryEntry = {
  shareId: string;
  ownerId: string;
  scope: 'album' | 'track';
  projectId: string;
  title: string;
  trackIds: string[];
  amountCents: number;
  purchasedAt: string;
  stripeSessionId?: string;
  /** Idempotency key for a purchase inside a multi-item checkout. */
  purchaseId?: string;
  /** Fulfilled purchase keys already merged into this Library entitlement. */
  purchaseIds?: string[];
  free?: boolean;
  /** Shared House release entitlement; no purchase record is required. */
  houseRelease?: boolean;
  /** Quiet in-Library announcement controlled by an admin. */
  houseLibraryNotice?: boolean;
  houseLibraryNoticeAt?: string;
  own?: boolean;
  /** Per-song public supporter credit. Private unless the buyer explicitly opts in. */
  supporterCreditPublic?: boolean;
};

export function defaultDropPrice(): DropPrice {
  return { mode: 'hidden' };
}

export function centsToUsdLabel(cents: number): string {
  const n = Math.max(0, Math.round(cents)) / 100;
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
}

export function parseUsdToCents(raw: string): number | null {
  const cleaned = raw.replace(/[^0-9.]/g, '');
  if (!cleaned) return null;
  const n = Number(cleaned);
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.round(n * 100);
}

export function normalizeDropPrice(raw: unknown): DropPrice {
  if (!raw || typeof raw !== 'object') return defaultDropPrice();
  const o = raw as Record<string, unknown>;
  const rawMode: DropPriceMode =
    o.mode === 'free' || o.mode === 'fixed' || o.mode === 'pwyw' || o.mode === 'hidden'
      ? o.mode
      : 'hidden';
  if (rawMode === 'free') return { mode: 'free' };
  const mode: DropPriceMode = rawMode;
  const amountCents = typeof o.amountCents === 'number' ? Math.round(o.amountCents) : undefined;
  const minCents = typeof o.minCents === 'number' ? Math.round(o.minCents) : undefined;
  const suggestedCents =
    typeof o.suggestedCents === 'number' ? Math.round(o.suggestedCents) : undefined;
  const next: DropPrice = { mode };
  if (mode === 'fixed') {
    next.amountCents = Math.max(DROP_PAID_MIN_CENTS, amountCents ?? DROP_PAID_MIN_CENTS);
  }
  if (mode === 'pwyw') {
    next.minCents = Math.max(DROP_PAID_MIN_CENTS, minCents ?? DROP_PAID_MIN_CENTS);
    next.suggestedCents = Math.max(next.minCents, suggestedCents ?? 777);
  }
  return next;
}

export function isDropFree(price?: DropPrice | null): boolean {
  return normalizeDropPrice(price).mode === 'free';
}

export function isCommerceLive(price?: DropPrice | null): boolean {
  const normalized = normalizeDropPrice(price);
  return normalized.mode !== 'hidden';
}

export function dropPriceSummary(price?: DropPrice | null): string {
  if (!price || price.mode === 'hidden') return '';
  if (price.mode === 'free') return 'Free';
  if (price.mode === 'fixed') {
    return centsToUsdLabel(Math.max(DROP_PAID_MIN_CENTS, price.amountCents ?? DROP_PAID_MIN_CENTS));
  }
  const rawMin = price.minCents ?? DROP_PAID_MIN_CENTS;
  const min = Math.max(DROP_PAID_MIN_CENTS, rawMin);
  const sug = Math.max(DROP_PAID_MIN_CENTS, price.suggestedCents ?? Math.max(min, 777));
  return `PWYW from ${centsToUsdLabel(min)} · suggested ${centsToUsdLabel(sug)}`;
}

/** Amount the fan owes for this click. Live First Drops are always paid. */
export function resolveCheckoutCents(price: DropPrice, fanEnteredCents?: number): number {
  if (price.mode === 'hidden') return 0;
  if (price.mode === 'free') return 0;
  if (price.mode === 'fixed') {
    return Math.max(DROP_PAID_MIN_CENTS, price.amountCents ?? DROP_PAID_MIN_CENTS);
  }
  const min = Math.max(DROP_PAID_MIN_CENTS, price.minCents ?? DROP_PAID_MIN_CENTS);
  const suggested = Math.max(min, price.suggestedCents ?? min, min > 0 ? min : 0);
  const entered =
    typeof fanEnteredCents === 'number' && Number.isFinite(fanEnteredCents)
      ? Math.round(fanEnteredCents)
      : suggested;
  const charged = Math.max(min, entered);
  return Math.max(DROP_PAID_MIN_CENTS, charged);
}

export function assertPaidAmount(cents: number): void {
  if (cents < DROP_PAID_MIN_CENTS) {
    throw new Error(`Paid drops need at least ${centsToUsdLabel(DROP_PAID_MIN_CENTS)}.`);
  }
}

export function normalizeDropAudio(raw: unknown): DropAudioMeta | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const o = raw as Record<string, unknown>;
  const storagePath = typeof o.storagePath === 'string' ? o.storagePath.trim() : '';
  if (!storagePath) return undefined;
  const meta: DropAudioMeta = {
    storagePath,
    contentType: typeof o.contentType === 'string' && o.contentType.trim() ? o.contentType.trim() : 'audio/mpeg',
    uploadedAt:
      typeof o.uploadedAt === 'string' && o.uploadedAt.trim()
        ? o.uploadedAt
        : new Date().toISOString(),
  };
  if (typeof o.previewPath === 'string' && o.previewPath.trim()) meta.previewPath = o.previewPath.trim();
  if (typeof o.durationSec === 'number' && o.durationSec > 0) meta.durationSec = o.durationSec;
  if (typeof o.byteSize === 'number' && o.byteSize > 0) meta.byteSize = o.byteSize;
  if (typeof o.fileName === 'string' && o.fileName.trim()) meta.fileName = o.fileName.trim();
  return meta;
}

export function dropStoragePrefix(userId: string, projectId: string): string {
  return `drops/${userId}/${projectId}`;
}

export function publicDropAudio(meta?: DropAudioMeta | null): DropAudioMeta | undefined {
  const n = normalizeDropAudio(meta);
  if (!n) return undefined;
  return {
    // Public share snapshots only need an availability marker. The actual
    // owner-scoped Storage path is resolved server-side from the private track.
    storagePath: 'private',
    contentType: n.contentType,
    durationSec: n.durationSec,
    fileName: n.fileName,
    uploadedAt: n.uploadedAt,
    byteSize: n.byteSize,
  };
}

export function shareCommerceFlags(payload: {
  dropAudio?: unknown;
  dropPrice?: unknown;
  tracks?: Array<{ dropAudio?: unknown; dropPrice?: unknown }>;
}): { hasDropAudio: boolean; dropPriceSummary: string } {
  const ownAudio = Boolean(normalizeDropAudio(payload.dropAudio));
  const trackAudio = Boolean(payload.tracks?.some((t) => normalizeDropAudio(t.dropAudio)));
  const price = normalizeDropPrice(payload.dropPrice);
  const trackPrice = payload.tracks?.map((t) => normalizeDropPrice(t.dropPrice)).find(isCommerceLive);
  return {
    hasDropAudio: ownAudio || trackAudio,
    dropPriceSummary: dropPriceSummary(isCommerceLive(price) ? price : trackPrice) || '',
  };
}

/**
 * Flags written onto the share document for Discover.
 * Album hubs do not inherit nested-track audio — the song lives on the track page.
 */
export function shareDocCommerceFlags(
  type: 'album' | 'track',
  payload: {
    dropAudio?: unknown;
    dropPrice?: unknown;
    tracks?: Array<{ dropAudio?: unknown; dropPrice?: unknown }>;
  }
): { hasDropAudio: boolean; dropPriceSummary: string } {
  if (type === 'album') {
    return shareCommerceFlags({ dropAudio: payload.dropAudio, dropPrice: payload.dropPrice });
  }
  return shareCommerceFlags({ dropAudio: payload.dropAudio, dropPrice: payload.dropPrice });
}
