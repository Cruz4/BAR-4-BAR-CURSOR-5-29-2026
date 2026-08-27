import type { DropPrice } from '@/lib/drop-commerce';
import type { PublicMusicMetadata } from '@/lib/music-discovery-metadata';
import type { PressingConfig } from '@/lib/profile/pressing';

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
