/**
 * Activity / notifications — received + given social events.
 */

export const ACTIVITY_TYPES = [
  'friend_request',
  'friend_accepted',
  'post_love',
  'post_reply',
  'post_reverb',
  'dna_import',
  'lock_answered',
  'artist_pick',
  'lock_clear_offer',
] as const;

export type ActivityType = (typeof ACTIVITY_TYPES)[number];

export type ActivityDirection = 'received' | 'given';

export type ActivityEvent = {
  id: string;
  type: ActivityType;
  direction: ActivityDirection;
  createdAt: string;
  actorId: string;
  actorName: string;
  actorSlug?: string;
  /** The other party when direction is "given" (who received the action). */
  targetUserId?: string;
  targetName?: string;
  targetSlug?: string;
  postId?: string;
  shareId?: string;
  lockId?: string;
  preview?: string;
  href?: string;
  readAt?: string | null;
};

export type ActivityPrefs = {
  pushEnabled: boolean;
  friendRequests: boolean;
  friendAccepted: boolean;
  postLoves: boolean;
  postReplies: boolean;
  dnaImports: boolean;
  /** Open LOCK casts — answered / pick / clear offers. */
  lockCasts: boolean;
};

export const DEFAULT_ACTIVITY_PREFS: ActivityPrefs = {
  pushEnabled: false,
  friendRequests: true,
  friendAccepted: true,
  postLoves: true,
  postReplies: true,
  dnaImports: true,
  lockCasts: true,
};

export type ActivitySummary = {
  unreadReceived: number;
  updatedAt: string;
};

export function isActivityType(value: unknown): value is ActivityType {
  return typeof value === 'string' && (ACTIVITY_TYPES as readonly string[]).includes(value);
}

export function activityVerb(type: ActivityType, direction: ActivityDirection): string {
  const received: Record<ActivityType, string> = {
    friend_request: 'sent you a friend request',
    friend_accepted: 'accepted your friend request',
    post_love: 'loved your post',
    post_reply: 'replied to your post',
    post_reverb: 'Reverbed your post',
    dna_import: 'imported your DNA Drop',
    lock_answered: 'locked a bar on a LOCK you watch',
    artist_pick: 'picked your echo',
    lock_clear_offer: 'cleared a LOCK with an offer for you',
  };
  const given: Record<ActivityType, string> = {
    friend_request: 'you sent a friend request to',
    friend_accepted: 'you accepted a friend request from',
    post_love: 'you loved a post by',
    post_reply: 'you replied to a post by',
    post_reverb: 'you Reverbed a post by',
    dna_import: 'you imported a DNA Drop from',
    lock_answered: 'you locked a bar on',
    artist_pick: 'you picked an echo by',
    lock_clear_offer: 'you sent a clear offer to',
  };
  return direction === 'received' ? received[type] : given[type];
}

export function prefsAllowsPush(prefs: ActivityPrefs, type: ActivityType): boolean {
  if (!prefs.pushEnabled) return false;
  switch (type) {
    case 'friend_request':
      return prefs.friendRequests;
    case 'friend_accepted':
      return prefs.friendAccepted;
    case 'post_love':
      return prefs.postLoves;
    case 'post_reply':
      return prefs.postReplies;
    case 'post_reverb':
      return prefs.postLoves;
    case 'dna_import':
      return prefs.dnaImports;
    case 'lock_answered':
    case 'artist_pick':
    case 'lock_clear_offer':
      return prefs.lockCasts !== false;
    default:
      return false;
  }
}
