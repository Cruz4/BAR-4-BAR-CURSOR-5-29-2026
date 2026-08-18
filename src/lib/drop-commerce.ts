/**
 * Bar 4 Bar First Drops — buy-once, stream-in-app commerce for DNA Drops.
 * Named release: feat/bar4bar-first-drops
 * Live switch: Admin Panel → Config → First Drops (`config/firstDrops`).
 */

export const BAR4BAR_FIRST_DROPS = 'bar4bar-first-drops' as const;

export const DROP_PAID_MIN_CENTS = 100;
export const DROP_PLATFORM_FEE_BPS = 1000; // 10%
export const DROP_PLATFORM_FEE_PERCENT = DROP_PLATFORM_FEE_BPS / 100;

export function dropPlatformFeeLabel(): string {
  return `${DROP_PLATFORM_FEE_PERCENT}%`;
}

export function dropArtistSharePercent(): number {
  return 100 - DROP_PLATFORM_FEE_PERCENT;
}

export function dropArtistShareLabel(): string {
  return `${dropArtistSharePercent()}%`;
}

/** Platform cut of a First Drop sale, in cents. */
export function dropPlatformFeeCents(amountCents: number): number {
  const amount = Math.max(0, Math.round(amountCents));
  const fee = Math.round((amount * DROP_PLATFORM_FEE_BPS) / 10_000);
  return Math.min(fee, Math.max(0, amount - 1));
}

/** Artist share after the platform fee. Stripe processing is paid by the platform. */
export function dropArtistNetCents(amountCents: number): number {
  const amount = Math.max(0, Math.round(amountCents));
  return Math.max(0, amount - dropPlatformFeeCents(amount));
}

/** Live split under the price the artist is setting. */
export function firstDropsSplitLine(amountCents: number): string {
  const charged = Math.max(0, Math.round(amountCents));
  if (charged <= 0) return 'Free — no platform fee.';
  return `You keep ${centsToUsdLabel(dropArtistNetCents(charged))} (${dropArtistShareLabel()}) · we keep ${centsToUsdLabel(dropPlatformFeeCents(charged))} (${dropPlatformFeeLabel()})`;
}

export function firstDropsFeeLine(): string {
  return `We keep ${dropPlatformFeeLabel()} — the rest is yours.`;
}

export function firstDropsCashoutLine(): string {
  return 'Connect payouts on Earnings so Stripe can send your share to your bank.';
}

/** Tight fee + cashout line for banners, hints, and marketing. */
export function firstDropsFeeCashoutLine(): string {
  return `We keep ${dropPlatformFeeLabel()}. Cash out the rest on Earnings after you connect payouts.`;
}

/** Public selling copy — hide whenever First Drops is toggled off. */
export function firstDropsPitch(): string {
  return `Press a song from The Scene — The Lathe. Upload the song, set a price, press it live. Listen / buy sits at the top of your Artist Home, on The Scene, and on the share link. Preview 30 seconds, buy once, stream here. You keep the rights to your music — we take a small fee on the sale to run the platform. DNA Drop is only the lyric snapshot — never the sell desk. ${firstDropsFeeLine()} ${firstDropsCashoutLine()}`;
}

export function getFirstDropsWhatFaqAnswer(): string {
  return `The record you press on The Lathe — not a subsection of DNA Drop. Upload the song (private storage), set a price or pay-what-you-want, and fans buy once to stream it in Bar 4 Bar. Preview is 30 seconds until they unlock. The Deck on The Scene is the in-app player — crates, search, and a four-bar visualizer. Not a Spotify listing — exclusive in-app stream. ${firstDropsFeeLine()} ${firstDropsCashoutLine()} Ink is never used to buy music.`;
}

export function getFirstDropsSellFaqAnswer(): string {
  return 'On The Scene, tap Press a song (The Lathe). Pick a vault track, upload the song, set a price or pay-what-you-want, then Press it live. You never open DNA Drop to sell. DNA Drop is lyrics-only. Visitors see Listen / buy at the top of your Artist Home, on The Scene, and on the share link. To get paid, open Earnings and connect Stripe payouts.';
}

export function getFirstDropsRightsFaqAnswer(): string {
  return `Yes. You keep all rights to your lyrics, recordings, and masters. Uploading a song to sell on Bar 4 Bar is not a label deal and does not transfer ownership. We host the in-app stream and keep a ${dropPlatformFeeLabel()} platform fee on each sale so we can run the platform — the rest is yours. ${firstDropsCashoutLine()}`;
}

export function getFirstDropsFeeFaqAnswer(): string {
  return `A ${dropPlatformFeeLabel()} platform fee on the sale — not a cut of your catalog. You still own the recording. The rest is yours. ${firstDropsCashoutLine()} Fans buy once and stream in the app — Ink is not used for music purchases.`;
}

export function getFirstDropsCashoutFaqAnswer(): string {
  return 'Open Earnings (Scene dock, account menu, Settings → First Drop payouts, or First Drop → Earnings & cash out). Connect Stripe payouts once — identity and bank. New sales go to your Stripe balance automatically; Stripe then pays your bank on its schedule (usually a few days after a sale clears). Sales made before you connect stay Held until you finish setup or tap Send held sales.';
}

export const DROP_AUDIO_MAX_BYTES = 40 * 1024 * 1024;
export const DROP_PREVIEW_SECONDS = 30;
export const DROP_PRICE_PRESETS_CENTS = [177, 299, 777, 1777] as const;

export const DROP_AUDIO_ACCEPT =
  'audio/mpeg,audio/mp3,audio/wav,audio/x-wav,audio/mp4,audio/aac,audio/ogg,audio/flac,audio/webm,.mp3,.wav,.m4a,.aac,.ogg,.flac';

export type DropPriceMode = 'hidden' | 'free' | 'fixed' | 'pwyw';

export type DropPrice = {
  mode: DropPriceMode;
  /** Fixed price in cents. */
  amountCents?: number;
  /** Pay-what-you-want floor. 0 = free unlock + optional paid tip. */
  minCents?: number;
  /** Pay-what-you-want suggested amount. */
  suggestedCents?: number;
};

export type DropAudioMeta = {
  storagePath: string;
  previewPath?: string;
  contentType: string;
  durationSec?: number;
  byteSize?: number;
  fileName?: string;
  uploadedAt: string;
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
  free?: boolean;
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
  const mode: DropPriceMode =
    o.mode === 'free' || o.mode === 'fixed' || o.mode === 'pwyw' || o.mode === 'hidden'
      ? o.mode
      : 'hidden';
  const amountCents = typeof o.amountCents === 'number' ? Math.round(o.amountCents) : undefined;
  const minCents = typeof o.minCents === 'number' ? Math.round(o.minCents) : undefined;
  const suggestedCents =
    typeof o.suggestedCents === 'number' ? Math.round(o.suggestedCents) : undefined;
  const next: DropPrice = { mode };
  if (amountCents != null && amountCents >= 0) next.amountCents = amountCents;
  if (minCents != null && minCents >= 0) next.minCents = minCents;
  if (suggestedCents != null && suggestedCents >= 0) next.suggestedCents = suggestedCents;
  return next;
}

export function isCommerceLive(price?: DropPrice | null): boolean {
  return Boolean(price && price.mode !== 'hidden');
}

export function dropPriceSummary(price?: DropPrice | null): string {
  if (!price || price.mode === 'hidden') return '';
  if (price.mode === 'free') return 'Free stream';
  if (price.mode === 'fixed') {
    return centsToUsdLabel(price.amountCents ?? DROP_PAID_MIN_CENTS);
  }
  const min = price.minCents ?? 0;
  const sug = price.suggestedCents ?? Math.max(min, 777);
  if (min <= 0) return `Pay what you want · suggested ${centsToUsdLabel(sug)}`;
  return `PWYW from ${centsToUsdLabel(min)} · suggested ${centsToUsdLabel(sug)}`;
}

/** Amount the fan owes for this click. 0 = free claim, no Stripe. */
export function resolveCheckoutCents(price: DropPrice, fanEnteredCents?: number): number {
  if (price.mode === 'hidden') return 0;
  if (price.mode === 'free') return 0;
  if (price.mode === 'fixed') {
    return Math.max(DROP_PAID_MIN_CENTS, price.amountCents ?? DROP_PAID_MIN_CENTS);
  }
  const min = Math.max(0, price.minCents ?? 0);
  const suggested = Math.max(min, price.suggestedCents ?? min, min > 0 ? min : 0);
  const entered =
    typeof fanEnteredCents === 'number' && Number.isFinite(fanEnteredCents)
      ? Math.round(fanEnteredCents)
      : suggested;
  const charged = Math.max(min, entered);
  if (charged <= 0) return 0;
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
    storagePath: n.storagePath,
    previewPath: n.previewPath,
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
