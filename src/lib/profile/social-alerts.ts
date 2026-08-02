/**
 * Lightweight Block / social alert counts for vault badge UI.
 * Friend requests are live; new friend posts use a last-seen timestamp in localStorage.
 */

import {
  fetchFriendships,
  fetchPostsByOwners,
  friendProfilesOf,
} from '@/lib/profile/social-client';

const LAST_SEEN_KEY = 'b4b.block.lastSeenAt';

export type SocialAlertSummary = {
  /** Total badge number (requests + new friend posts). */
  total: number;
  friendRequests: number;
  newFriendPosts: number;
};

export function getBlockLastSeenAt(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(LAST_SEEN_KEY);
    return raw && raw.trim() ? raw.trim() : null;
  } catch {
    return null;
  }
}

export function markBlockSeen(at = new Date().toISOString()): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(LAST_SEEN_KEY, at);
  } catch {
    /* ignore quota / private mode */
  }
}

export async function fetchSocialAlertSummary(userId: string): Promise<SocialAlertSummary> {
  if (!userId) return { total: 0, friendRequests: 0, newFriendPosts: 0 };

  const friendships = await fetchFriendships(userId);
  const friendRequests = friendships.filter(
    (f) => f.status === 'pending' && f.requestedBy !== userId
  ).length;

  const friendIds = friendProfilesOf(friendships, userId).map((f) => f.userId);
  let newFriendPosts = 0;

  if (friendIds.length) {
    const lastSeen = getBlockLastSeenAt();
    // No last-seen yet → don't flood the badge with old posts; requests still count.
    if (lastSeen) {
      const posts = await fetchPostsByOwners(friendIds, 6);
      newFriendPosts = posts.filter((p) => p.ownerId !== userId && p.createdAt > lastSeen).length;
    }
  }

  return {
    friendRequests,
    newFriendPosts,
    total: friendRequests + newFriendPosts,
  };
}
