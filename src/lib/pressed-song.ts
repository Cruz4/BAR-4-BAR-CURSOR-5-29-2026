import type { DropPrice } from '@/lib/drop-commerce';

export function pressedSongHref(shareId: string): string {
  return `/song/${encodeURIComponent(shareId)}`;
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
  };
};
