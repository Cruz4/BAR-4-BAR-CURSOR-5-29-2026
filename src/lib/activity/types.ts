/**
 * Activity / notifications — received + given social events, plus craft pings.
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
  'verse_open',
  'streak_risk',
] as const;

export type ActivityType = (typeof ACTIVITY_TYPES)[number];

export type ActivityDirection = 'received' | 'given';

export const SYSTEM_ACTOR_ID = 'system';
export const SYSTEM_ACTOR_NAME = 'Bar 4 Bar';

/** Client emit API must not mint these — cron / Admin SDK only. */
export const SERVER_ONLY_ACTIVITY_TYPES: readonly ActivityType[] = [
  'verse_open',
  'streak_risk',
];

export function isCraftActivityType(type: ActivityType): boolean {
  return type === 'verse_open' || type === 'streak_risk';
}

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
  /** Unfinished verse + streak-at-midnight reminders. */
  craftReminders: boolean;
};

export const DEFAULT_ACTIVITY_PREFS: ActivityPrefs = {
  pushEnabled: false,
  friendRequests: true,
  friendAccepted: true,
  postLoves: true,
  postReplies: true,
  dnaImports: true,
  lockCasts: true,
  craftReminders: true,
};

export type ActivitySummary = {
  unreadReceived: number;
  updatedAt: string;
};

export function isActivityType(value: unknown): value is ActivityType {
  return typeof value === 'string' && (ACTIVITY_TYPES as readonly string[]).includes(value);
}

export function isServerOnlyActivityType(type: ActivityType): boolean {
  return (SERVER_ONLY_ACTIVITY_TYPES as readonly string[]).includes(type);
}

export function activityVerb(type: ActivityType, direction: ActivityDirection): string {
  const received: Record<ActivityType, string> = {
    friend_request: 'sent you a friend request',
    friend_accepted: 'accepted your friend request',
    post_love: 'loved your post',
    post_reply: 'replied to your post',
    post_reverb: 'Reverbed your post',
    dna_import: 'imported your DNA Drop',
    lock_answered: 'echoed your bar',
    artist_pick: 'picked your echo',
    lock_clear_offer: 'cleared a LOCK with an offer for you',
    verse_open: 'Your verse is still open',
    streak_risk: 'Streak dies at midnight',
  };
  const given: Record<ActivityType, string> = {
    friend_request: 'you sent a friend request to',
    friend_accepted: 'you accepted a friend request from',
    post_love: 'you loved a post by',
    post_reply: 'you replied to a post by',
    post_reverb: 'you Reverbed a post by',
    dna_import: 'you imported a DNA Drop from',
    lock_answered: 'you echoed a bar on',
    artist_pick: 'you picked an echo by',
    lock_clear_offer: 'you sent a clear offer to',
    verse_open: 'Your verse is still open',
    streak_risk: 'Streak dies at midnight',
  };
  return direction === 'received' ? received[type] : given[type];
}

/** Craft pings are full sentences — no “Bar 4 Bar echoed…” actor prefix. */
export function activityShowsActor(type: ActivityType): boolean {
  return !isCraftActivityType(type);
}

export function pushCopyForActivity(
  type: ActivityType,
  actorName: string,
  preview?: string
): { title: string; body: string } {
  const snippet = preview?.trim();
  switch (type) {
    case 'verse_open':
      return {
        title: 'Your verse is still open',
        body: snippet || 'Pick up the sheet you left hanging.',
      };
    case 'streak_risk':
      return {
        title: 'Streak dies at midnight',
        body: snippet || 'Write one bar today to keep it alive.',
      };
    case 'lock_answered':
      return {
        title: `${actorName} echoed your bar`,
        body: snippet || 'Someone locked the next line.',
      };
    case 'artist_pick':
      return {
        title: `${actorName} picked your echo`,
        body: snippet || 'Your bar made the cut.',
      };
    case 'lock_clear_offer':
      return {
        title: `${actorName} sent a clear-for-release offer`,
        body: snippet || 'Open Activity to review it.',
      };
    case 'friend_request':
      return {
        title: 'Bar 4 Bar',
        body: `${actorName} sent you a friend request`,
      };
    case 'friend_accepted':
      return {
        title: 'Bar 4 Bar',
        body: `${actorName} accepted your friend request`,
      };
    case 'post_love':
      return {
        title: 'Bar 4 Bar',
        body: `${actorName} loved your post`,
      };
    case 'post_reply':
      return {
        title: 'Bar 4 Bar',
        body: `${actorName} replied to your post`,
      };
    case 'post_reverb':
      return {
        title: 'Bar 4 Bar',
        body: `${actorName} Reverbed your post`,
      };
    case 'dna_import':
      return {
        title: 'Bar 4 Bar',
        body: `${actorName} imported your DNA Drop`,
      };
    default:
      return { title: 'Bar 4 Bar', body: snippet || 'New activity' };
  }
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
    case 'verse_open':
    case 'streak_risk':
      return prefs.craftReminders !== false;
    default:
      return false;
  }
}
