import type { DropPrice } from '@/lib/drop-commerce';
import type { PressingConfig } from '@/lib/profile/pressing';

export function pressedSongHref(
  shareId: string,
  options: { referralPostId?: string } = {}
): string {
  const base = `/song/${encodeURIComponent(shareId)}`;
  const referralPostId = options.referralPostId?.trim();
  return referralPostId ? `${base}?refPost=${encodeURIComponent(referralPostId)}` : base;
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
  ownerId: string;
  title: string;
  hasAudio: true;
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
