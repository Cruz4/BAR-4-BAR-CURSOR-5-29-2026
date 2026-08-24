import type { DiscoveryMatch } from '@/lib/discovery-graph';

export type DiscoverySearchKind = 'person' | 'drop' | 'post';

export type DiscoverySearchHit = {
  kind: DiscoverySearchKind;
  id: string;
  title: string;
  subtitle: string;
  href: string;
  ownerId?: string;
  ownerName?: string;
  ownerSlug?: string;
  studioBadge?: 'pro' | 'free';
  tags: string[];
  match?: DiscoveryMatch;
  updatedAt?: string;
};
export type DiscoverySearchResponse = {
  hits: DiscoverySearchHit[];
  total: number;
  hasMore: boolean;
};
