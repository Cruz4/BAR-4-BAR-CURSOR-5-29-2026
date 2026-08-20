/** LOCK — public unfinished-bar dare (social engagement). */

export type LockStatus = 'open' | 'closed';

export type LockDnaSnapshot = {
  setting_world?: string;
  emotion_core?: string;
  trigger_moment?: string;
  message_truth?: string;
  tone_palette?: string;
  intents?: string[];
  styleBlurb?: string;
};

export type LockDoc = {
  id: string;
  status: LockStatus;
  ownerId: string;
  ownerName: string;
  ownerSlug?: string;
  seedBar: string;
  embedUrl?: string;
  dnaSnapshot?: LockDnaSnapshot;
  echoCount: number;
  watcherCount: number;
  artistPickEchoId?: string;
  clearedAt?: string;
  clearNote?: string;
  createdAt: string;
  updatedAt: string;
  /** House LOCK is platform-owned. */
  isHouse?: boolean;
};

export type LockEcho = {
  id: string;
  text: string;
  lockScore: number;
  lockLabel: 'Off-world' | 'In-world' | 'Hard LOCK';
  parentEchoId?: string | null;
  authorId?: string | null;
  authorName?: string | null;
  /** Artist Home vanity slug when the reply was named. */
  authorSlug?: string | null;
  createdAt: string;
  isPick?: boolean;
};

export type LockClearOffer = {
  echoId: string;
  percent: number | null;
  status: 'offered' | 'accepted' | 'declined';
  createdAt: string;
  updatedAt?: string;
};

/** Named reply mirror under users/{uid}/lockContributions/{lockId}_{echoId}. */
export type LockContribution = {
  lockId: string;
  echoId: string;
  text: string;
  lockScore: number;
  seedBar: string;
  ownerName: string;
  ownerSlug?: string;
  createdAt: string;
};

export type LockPublicPayload = {
  lock: LockDoc;
  echoes: LockEcho[];
  topEchoes: LockEcho[];
};

export const HOUSE_SEED_BAR =
  'I was talking to the moon before it knew my name…';

export const HOUSE_OWNER_NAME = 'Bar 4 Bar';
