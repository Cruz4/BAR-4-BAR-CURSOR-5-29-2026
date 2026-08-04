/**
 * Activity / notifications — received + given social events.
 */

export const ACTIVITY_TYPES = [
  'friend_request',
  'friend_accepted',
  'post_love',
  'post_reply',
  'dna_import',
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
  postId?: string;
  shareId?: string;
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
};

export const DEFAULT_ACTIVITY_PREFS: ActivityPrefs = {
  pushEnabled: false,
  friendRequests: true,
  friendAccepted: true,
  postLoves: true,
  postReplies: true,
  dnaImports: true,
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
    dna_import: 'imported your DNA Drop',
  };
  const given: Record<ActivityType, string> = {
    friend_request: 'you sent a friend request to',
    friend_accepted: 'you accepted a friend request from',
    post_love: 'you loved a post by',
    post_reply: 'you replied to a post by',
    dna_import: 'you imported a DNA Drop from',
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
    case 'dna_import':
      return prefs.dnaImports;
    default:
      return false;
  }
}
