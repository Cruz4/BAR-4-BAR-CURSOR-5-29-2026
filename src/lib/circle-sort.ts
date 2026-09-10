import type { BlockedUser, CircleFriendRow, Friendship } from '@/lib/profile/social-client';

export type CircleFriendSort = 'last-added' | 'oldest' | 'alphabetical' | 'live-first';

export const circleFriendSortLabels: Record<CircleFriendSort, string> = {
  'last-added': 'Last added',
  oldest: 'Oldest first',
  alphabetical: 'A–Z',
  'live-first': 'Live first',
};

function friendshipAddedAt(friendships: Friendship[], viewerId: string, userId: string): number {
  const row = friendships.find((f) => f.uids.includes(userId));
  if (!row) return 0;
  const ts = row.respondedAt || row.createdAt;
  return ts ? new Date(ts).getTime() : 0;
}

export function sortCircleFriends(
  friends: CircleFriendRow[],
  friendships: Friendship[],
  viewerId: string,
  sortBy: CircleFriendSort
): CircleFriendRow[] {
  const sorted = [...friends];
  if (sortBy === 'alphabetical') {
    sorted.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
    return sorted;
  }
  if (sortBy === 'oldest') {
    sorted.sort(
      (a, b) =>
        friendshipAddedAt(friendships, viewerId, a.userId) -
        friendshipAddedAt(friendships, viewerId, b.userId)
    );
    return sorted;
  }
  if (sortBy === 'live-first') {
    sorted.sort((a, b) => {
      if (a.isLivePublic !== b.isLivePublic) return a.isLivePublic ? -1 : 1;
      return (
        friendshipAddedAt(friendships, viewerId, b.userId) -
        friendshipAddedAt(friendships, viewerId, a.userId)
      );
    });
    return sorted;
  }
  sorted.sort(
    (a, b) =>
      friendshipAddedAt(friendships, viewerId, b.userId) -
      friendshipAddedAt(friendships, viewerId, a.userId)
  );
  return sorted;
}

export type CircleBlockedSort = 'recent' | 'oldest' | 'alphabetical';

export const circleBlockedSortLabels: Record<CircleBlockedSort, string> = {
  recent: 'Recently blocked',
  oldest: 'Oldest first',
  alphabetical: 'A–Z',
};

export function sortBlockedUsers(blocked: BlockedUser[], sortBy: CircleBlockedSort): BlockedUser[] {
  const sorted = [...blocked];
  if (sortBy === 'alphabetical') {
    sorted.sort((a, b) =>
      a.blockedName.localeCompare(b.blockedName, undefined, { sensitivity: 'base' })
    );
    return sorted;
  }
  if (sortBy === 'oldest') {
    sorted.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    return sorted;
  }
  sorted.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  return sorted;
}
