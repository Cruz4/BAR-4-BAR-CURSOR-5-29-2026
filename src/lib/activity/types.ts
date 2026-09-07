/**
 * Activity / notifications — received + given social events, plus craft pings.
 */

export const ACTIVITY_TYPES = [
  'friend_request',
  'friend_accepted',
  'profile_followed',
  'inner_circle_joined',
  'door_knock',
  'contact_request',
  'contact_accepted',
  'fold_pass',
  'collab_invite',
  'collab_edit',
  'collab_message',
  'post_love',
  'post_reply',
  'post_reverb',
  'mention',
  'dna_import',
  'drop_loved',
  'drop_reply',
  'drop_unlocked',
  'drop_sold',
  'house_release',
  'love_milestone',
  'lock_answered',
  'artist_pick',
  'lock_clear_offer',
  'verse_open',
  'streak_risk',
] as const;

export type ActivityType = (typeof ACTIVITY_TYPES)[number];

export type ActivityDirection = 'received' | 'given';

export const SYSTEM_ACTOR_ID = 'system';
export const SYSTEM_ACTOR_NAME = 'AKAsheet';

/** Client emit API must not mint these — cron / Admin SDK only. */
export const SERVER_ONLY_ACTIVITY_TYPES: readonly ActivityType[] = [
  'verse_open',
  'streak_risk',
  'contact_request',
  'contact_accepted',
  'fold_pass',
  'collab_invite',
  'collab_edit',
  'collab_message',
  'drop_unlocked',
  'drop_sold',
  'house_release',
  'love_milestone',
  'profile_followed',
  'inner_circle_joined',
  'door_knock',
  'mention',
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
  commentId?: string;
  shareId?: string;
  lockId?: string;
  preview?: string;
  href?: string;
  readAt?: string | null;
  /** Door knocks stay hidden from Activity until the owner visits their Artist Home. */
  homeDeliveredAt?: string | null;
};

export type ActivityFeedPage = {
  events: ActivityEvent[];
  /** Opaque event id used to continue through older stored activity. */
  nextCursor: string | null;
};

export type ActivityPrefs = {
  pushEnabled: boolean;
  friendRequests: boolean;
  friendAccepted: boolean;
  /** New followers and Inner Circle supporters. */
  relationships: boolean;
  postLoves: boolean;
  postReplies: boolean;
  dnaImports: boolean;
  /** Open LOCK casts — answered / pick / clear offers. */
  lockCasts: boolean;
  /** Unfinished verse + streak-at-midnight reminders. */
  craftReminders: boolean;
  /** Private messages (Msgs). */
  foldBars: boolean;
  /** Collab Sheet invites, edits, and chat. */
  collabSheets: boolean;
  /** First Drop loves, replies, and unlocks. */
  firstDrops: boolean;
};

export const DEFAULT_ACTIVITY_PREFS: ActivityPrefs = {
  pushEnabled: false,
  friendRequests: true,
  friendAccepted: true,
  relationships: true,
  postLoves: true,
  postReplies: true,
  dnaImports: true,
  lockCasts: true,
  craftReminders: true,
  foldBars: true,
  collabSheets: true,
  firstDrops: true,
};

export type ActivitySummary = {
  unreadReceived: number;
  /** Unread admin House-release pings used by the Scene Library shortcut. */
  unreadHouseReleases: number;
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
    profile_followed: 'followed your profile',
    inner_circle_joined: 'added you to their Inner Circle',
    door_knock: 'knocked on your Artist Home door',
    contact_request: 'asked to see your contact',
    contact_accepted: 'shared their contact with you',
    fold_pass: 'sent you a message',
    collab_invite: 'invited you to a Collab Sheet',
    collab_edit: 'updated your Collab Sheet',
    collab_message: 'sent a Collab Sheet message',
    post_love: 'loved your post',
    post_reply: 'replied to your post',
    post_reverb: 'Reverbed your post',
    mention: 'mentioned you',
    dna_import: 'imported your DNA Drop',
    drop_loved: 'loved your release',
    drop_reply: 'replied on your release',
    drop_unlocked: 'unlocked your release',
    drop_sold: 'bought your song',
    house_release: 'New House Drop added to your Library',
    love_milestone: 'rewarded you 2 Ink for 20 Loves',
    lock_answered: 'echoed your bar',
    artist_pick: 'picked your echo',
    lock_clear_offer: 'cleared a LOCK with an offer for you',
    verse_open: 'Your verse is still open',
    streak_risk: 'Streak dies at midnight',
  };
  const given: Record<ActivityType, string> = {
    friend_request: 'you sent a friend request to',
    friend_accepted: 'you accepted a friend request from',
    profile_followed: 'you followed',
    inner_circle_joined: 'you added to your Inner Circle',
    door_knock: 'you knocked on the door at',
    contact_request: 'you asked to see contact for',
    contact_accepted: 'you shared your contact with',
    fold_pass: 'you sent a message to',
    collab_invite: 'you invited to a Collab Sheet',
    collab_edit: 'you updated a Collab Sheet',
    collab_message: 'you sent a Collab Sheet message to',
    post_love: 'you loved a post by',
    post_reply: 'you replied to a post by',
    post_reverb: 'you Reverbed a post by',
    mention: 'you mentioned',
    dna_import: 'you imported a DNA Drop from',
    drop_loved: 'you loved a release by',
    drop_reply: 'you replied on a release by',
    drop_unlocked: 'you unlocked a release by',
    drop_sold: 'you bought a song from',
    house_release: 'New House Drop added to your Library',
    love_milestone: 'rewarded you 2 Ink for 20 Loves',
    lock_answered: 'you echoed a bar on',
    artist_pick: 'you picked an echo by',
    lock_clear_offer: 'you sent a clear offer to',
    verse_open: 'Your verse is still open',
    streak_risk: 'Streak dies at midnight',
  };
  return direction === 'received' ? received[type] : given[type];
}

/** Craft pings are full sentences — no “AKAsheet echoed…” actor prefix. */
export function activityShowsActor(type: ActivityType): boolean {
  return !isCraftActivityType(type) && type !== 'house_release';
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
        title: 'AKAsheet',
        body: `${actorName} sent you a friend request`,
      };
    case 'friend_accepted':
      return {
        title: 'AKAsheet',
        body: `${actorName} accepted your friend request`,
      };
    case 'profile_followed':
      return {
        title: 'New follower',
        body: `${actorName} followed your AKAsheet profile`,
      };
    case 'inner_circle_joined':
      return {
        title: 'Inner Circle support',
        body: `${actorName} added you to their Inner Circle`,
      };
    case 'door_knock':
      return {
        title: 'Someone knocked',
        body: snippet || `${actorName} knocked on your Artist Home door`,
      };
    case 'contact_request':
      return {
        title: 'AKAsheet',
        body: `${actorName} asked to see your contact`,
      };
    case 'contact_accepted':
      return {
        title: 'AKAsheet',
        body: snippet || `${actorName} shared their contact with you`,
      };
    case 'fold_pass':
      return {
        title: `${actorName} sent you a message`,
        body: snippet || 'Open Msgs to read it.',
      };
    case 'collab_invite':
      return {
        title: `${actorName} shared a Collab Sheet`,
        body: snippet || 'Open the sheet to write together live.',
      };
    case 'collab_edit':
      return {
        title: `${actorName} updated the Collab Sheet`,
        body: snippet || 'New bars or changes are waiting on the sheet.',
      };
    case 'collab_message':
      return {
        title: `${actorName} · Collab chat`,
        body: snippet || 'Open the sheet chat to reply.',
      };
    case 'post_love':
      return {
        title: 'AKAsheet',
        body: `${actorName} loved your post`,
      };
    case 'post_reply':
      return {
        title: 'AKAsheet',
        body: `${actorName} replied to your post`,
      };
    case 'post_reverb':
      return {
        title: 'AKAsheet',
        body: `${actorName} Reverbed your post`,
      };
    case 'mention':
      return {
        title: `${actorName} mentioned you`,
        body: snippet || 'Open Activity to see the mention.',
      };
    case 'dna_import':
      return {
        title: 'AKAsheet',
        body: `${actorName} imported your DNA Drop`,
      };
    case 'drop_loved':
      return {
        title: 'AKAsheet',
        body: `${actorName} loved your release`,
      };
    case 'drop_reply':
      return {
        title: 'AKAsheet',
        body: snippet || `${actorName} replied on your release`,
      };
    case 'drop_unlocked':
      return {
        title: `${actorName} unlocked your release`,
        body: snippet || 'Someone copped the song.',
      };
    case 'drop_sold':
      return {
        title: 'You got a sale',
        body: snippet || `${actorName} bought your release`,
      };
    case 'house_release':
      return {
        title: 'New in Library',
        body: snippet || 'A new House release is ready to stream free.',
      };
    case 'love_milestone':
      return {
        title: 'You earned +2 Ink',
        body: snippet || 'Your work reached another 20 verified Loves.',
      };
    default:
      return { title: 'AKAsheet', body: snippet || 'New activity' };
  }
}

export function prefsAllowsPush(prefs: ActivityPrefs, type: ActivityType): boolean {
  if (!prefs.pushEnabled) return false;
  switch (type) {
    case 'friend_request':
      return prefs.friendRequests;
    case 'friend_accepted':
      return prefs.friendAccepted;
    case 'profile_followed':
    case 'inner_circle_joined':
    case 'door_knock':
      return prefs.relationships !== false;
    case 'contact_request':
      return prefs.friendRequests;
    case 'contact_accepted':
      return prefs.friendAccepted;
    case 'fold_pass':
      return false;
    case 'collab_invite':
    case 'collab_edit':
    case 'collab_message':
      return prefs.collabSheets !== false;
    case 'post_love':
      return prefs.postLoves;
    case 'post_reply':
      return prefs.postReplies;
    case 'post_reverb':
    case 'mention':
      return prefs.postLoves;
    case 'dna_import':
      return prefs.dnaImports;
    case 'drop_loved':
    case 'drop_reply':
    case 'drop_unlocked':
    case 'drop_sold':
    case 'house_release':
      return prefs.firstDrops !== false;
    case 'love_milestone':
      return prefs.postLoves;
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
