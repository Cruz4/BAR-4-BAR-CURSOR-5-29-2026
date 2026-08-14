/**
 * Scene live events — house bar of the day + weekly public challenge.
 * Admin toggle + copy live in Firestore `config/houseBar` and `config/weeklyChallenge`.
 */

import { HOUSE_SEED_BAR } from '@/lib/lock/types';

export type HouseBarPublicConfig = {
  enabled: boolean;
  seedBar: string;
  title: string;
  updatedAt: string | null;
};

export type HouseBarAdminConfig = HouseBarPublicConfig & {
  updatedBy: string | null;
};

export type WeeklyChallengePublicConfig = {
  enabled: boolean;
  title: string;
  description: string;
  targetBars: number;
  updatedAt: string | null;
};

export type WeeklyChallengeAdminConfig = WeeklyChallengePublicConfig & {
  updatedBy: string | null;
};

export type SceneLivePublic = {
  houseBar: HouseBarPublicConfig;
  weeklyChallenge: WeeklyChallengePublicConfig;
};

export const DEFAULT_HOUSE_BAR_TITLE = 'House bar of the day';

export const DEFAULT_HOUSE_BAR: HouseBarPublicConfig = {
  enabled: false,
  seedBar: HOUSE_SEED_BAR,
  title: DEFAULT_HOUSE_BAR_TITLE,
  updatedAt: null,
};

export const DEFAULT_WEEKLY_CHALLENGE: WeeklyChallengePublicConfig = {
  enabled: false,
  title: 'Write 16 bars this week',
  description:
    'Hand-write sixteen rhyme bars before Monday reset. Open your sheet and keep the cypher moving.',
  targetBars: 16,
  updatedAt: null,
};

export function clampHouseSeedBar(raw: string): string {
  return raw.trim().slice(0, 280);
}

export function clampWeeklyTitle(raw: string): string {
  return raw.trim().slice(0, 80);
}

export function clampWeeklyDescription(raw: string): string {
  return raw.trim().slice(0, 280);
}

export function clampWeeklyTarget(raw: unknown): number {
  const n = typeof raw === 'number' ? raw : Number(raw);
  if (!Number.isFinite(n)) return DEFAULT_WEEKLY_CHALLENGE.targetBars;
  return Math.min(256, Math.max(1, Math.round(n)));
}
