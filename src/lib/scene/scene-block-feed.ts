/**
 * Your Block feed — friends' wall posts plus Lyrics DNA Drops & pressed songs
 * from accepted friendships (not Discover).
 */

import type { ProfilePost } from '@/lib/profile/social-client';
import {
  isCircleDropKind,
  type DiscoverCard,
  type DiscoverDrop,
} from '@/lib/scene/discover-client';

export function buildFriendCircleDropCards(
  drops: DiscoverDrop[],
  circleUserIds: Set<string>
): DiscoverCard[] {
  if (!circleUserIds.size) return [];
  return drops
    .filter(
      (drop) =>
        Boolean(drop.ownerId && circleUserIds.has(drop.ownerId)) && isCircleDropKind(drop)
    )
    .map(
      (drop): DiscoverCard => ({
        kind: 'drop',
        key: `drop-${drop.shareId}`,
        drop,
      })
    );
}

export type BlockFeedItem =
  | { kind: 'post'; key: string; at: string; post: ProfilePost }
  | { kind: 'drop'; key: string; at: string; card: DiscoverCard };

export function mergeBlockFeedItems(
  posts: ProfilePost[],
  friendDropCards: DiscoverCard[]
): BlockFeedItem[] {
  const items: BlockFeedItem[] = posts.map((post) => ({
    kind: 'post',
    key: `post-${post.id}`,
    at: post.createdAt || '',
    post,
  }));
  for (const card of friendDropCards) {
    if (card.kind !== 'drop') continue;
    items.push({
      kind: 'drop',
      key: card.key,
      at: card.drop.updatedAt || '',
      card,
    });
  }
  items.sort((a, b) => b.at.localeCompare(a.at));
  return items;
}
