import type { DropPrice } from '@/lib/drop-commerce';
import type { DeckPlayable } from '@/lib/drop-library';
import { dnaDropSnapshotTrackPath } from '@/lib/dna-drop-access';
import type { PublicMusicMetadata } from '@/lib/music-discovery-metadata';
import type { PressingConfig } from '@/lib/profile/pressing';

/** Wall / Reverb / Share link for a release or Lyrics DNA Drop — song page vs album hub vs strand. */
export function dropPromotePath(opts: {
  shareId: string;
  isAlbum?: boolean;
  hasAudio?: boolean;
  trackId?: string;
}): string {
  const shareId = opts.shareId.trim();
  const trackId = opts.trackId?.trim();
  if (opts.isAlbum) return `/share/${encodeURIComponent(shareId)}`;
  if (opts.hasAudio) return pressedSongHref(shareId, { ...(trackId ? { trackId } : {}) });
  if (trackId) return dnaDropSnapshotTrackPath(shareId, trackId);
  return `/share/${encodeURIComponent(shareId)}`;
}

/** Prefer live album music hub id, else live Lyrics DNA album id. */
export function resolveAlbumHubShareId(opts: {
  releaseShareId?: string | null;
  releaseLive?: boolean;
  dnaShareId?: string | null;
  dnaLive?: boolean;
  fallbackShareId?: string | null;
}): string | undefined {
  const releaseId = opts.releaseShareId?.trim();
  if (opts.releaseLive && releaseId) return releaseId;
  const dnaId = opts.dnaShareId?.trim();
  if (opts.dnaLive && dnaId) return dnaId;
  return releaseId || dnaId || opts.fallbackShareId?.trim() || undefined;
}

/** Public album hub that lists every playable track — never Discover search. */
export function albumHubHref(albumShareId?: string | null): string | undefined {
  const id = albumShareId?.trim();
  return id ? `/share/${encodeURIComponent(id)}` : undefined;
}

export function pressedSongHref(
  shareId: string,
  options: { referralPostId?: string; trackId?: string } = {}
): string {
  const base = `/song/${encodeURIComponent(shareId)}`;
  const query = new URLSearchParams();
  const trackId = options.trackId?.trim();
  const referralPostId = options.referralPostId?.trim();
  if (trackId) query.set('trackId', trackId);
  if (referralPostId) query.set('refPost', referralPostId);
  return query.size ? `${base}?${query.toString()}` : base;
}

export type PressedSongSupporter = {
  rank: number;
  amountCents?: number;
  anonymous: boolean;
  name?: string;
  slug?: string;
  avatarUrl?: string;
  studioBadge?: 'pro' | 'free';
};

export type PressedSongSummary = {
  shareId: string;
  trackId?: string;
  albumTitle?: string;
  /** Album hub share id when this song belongs to a live album. */
  albumShareId?: string;
  /** Live Lyrics DNA Drop for this song (track share), when one exists. */
  dnaShareId?: string;
  /** Lyric snapshot exists on the release (album strand or live drop). */
  lyricsDnaAttached?: boolean;
  /** Full album queue when scope is album (Reverb embeds + playlist playback). */
  albumPlaylist?: DeckPlayable[];
  /** Album hub post (no specific track in the URL) still returns a playable first track. */
  scope?: 'album' | 'track';
  ownerId: string;
  title: string;
  hasAudio: true;
  releaseLive: boolean;
  currentRelease?: {
    shareId: string;
    trackId: string;
    title: string;
    albumTitle: string;
  };
  houseRelease?: boolean;
  metadata: PublicMusicMetadata;
  price: DropPrice;
  releasedAt: string;
  artist: {
    name: string;
    slug?: string;
    avatarUrl?: string;
    studioBadge?: 'pro' | 'free';
    starMarkUseStar?: boolean;
    starMarkSeed?: number;
    pressing?: PressingConfig;
  };
  publicTotals: { plays: number; buyers: number };
  /** Unique share landings (deduped); legacy views when landing not backfilled yet. */
  landingCount?: number;
  legacyShareViews?: number;
  /** max(unique, legacy) for header display */
  reachDisplayCount?: number;
  member?: {
    qualifiedListeningDays: number;
    completions: number;
    repeats: number;
    grossSupportCents: number;
    topSupporters: PressedSongSupporter[];
    firstPress: PressedSongSupporter[];
  };
  viewer?: {
    amountPaidCents: number;
    supporterCreditPublic: boolean;
    firstPressRank?: number;
    owns: boolean;
    purchase?: {
      title: string;
      artistName: string;
      amountCents: number;
      purchasedAt: string;
      scope: 'album' | 'track';
      edition: string;
    };
  };
  ownerControls?: {
    albumId: string;
    trackId: string;
    releaseStatus: 'draft' | 'live' | 'unlisted';
  };
};
