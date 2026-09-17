import type { DropPrice } from '@/lib/drop-commerce';
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
