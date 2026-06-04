/** Persist celebration dedupe per user so relogin does not replay old unlock toasts. */

import {
  getDayKey,
  isChallengeComplete,
  LIFETIME_MILESTONES,
  MONTHLY_CHALLENGES,
  WEEKLY_CHALLENGES,
  type ChallengeDef,
} from '@/lib/gamification/challenges';
import type { GamificationSummary } from '@/lib/gamification/types';

const STORAGE_PREFIX = 'b4b:celebrations-seen:';
const STREAK_MILESTONES = [3, 7, 30] as const;
const MAX_PROGRESS_KEYS = 120;

type Stored = {
  achievements: string[];
  progress: string[];
};

function storageKey(userId: string) {
  return `${STORAGE_PREFIX}${userId}`;
}

function readStored(userId: string): Stored {
  try {
    const raw = localStorage.getItem(storageKey(userId));
    if (!raw) return { achievements: [], progress: [] };
    const parsed = JSON.parse(raw) as Partial<Stored>;
    return {
      achievements: Array.isArray(parsed.achievements) ? parsed.achievements : [],
      progress: Array.isArray(parsed.progress) ? parsed.progress : [],
    };
  } catch {
    return { achievements: [], progress: [] };
  }
}

function writeStored(userId: string, data: Stored) {
  try {
    localStorage.setItem(storageKey(userId), JSON.stringify(data));
  } catch {
    /* quota / private mode */
  }
}

export function loadSeenAchievementIds(userId: string): Set<string> {
  return new Set(readStored(userId).achievements);
}

export function loadSeenProgressKeys(userId: string): Set<string> {
  return new Set(readStored(userId).progress);
}

export function markAchievementsSeen(userId: string, ids: string[]) {
  if (!ids.length) return;
  const stored = readStored(userId);
  const set = new Set(stored.achievements);
  ids.forEach((id) => set.add(id));
  writeStored(userId, { ...stored, achievements: [...set] });
}

export function markProgressCelebrationsSeen(userId: string, keys: string[]) {
  if (!keys.length) return;
  const stored = readStored(userId);
  const set = new Set(stored.progress);
  keys.forEach((k) => set.add(k));
  const progress = [...set];
  if (progress.length > MAX_PROGRESS_KEYS) {
    progress.splice(0, progress.length - MAX_PROGRESS_KEYS);
  }
  writeStored(userId, { ...stored, progress });
}

function challengeDedupeKey(challenge: ChallengeDef, summary: GamificationSummary): string {
  if (challenge.scale === 'weekly') {
    return `weekly:${summary.weeklyChallengeWeekKey}:${challenge.id}`;
  }
  if (challenge.scale === 'monthly') {
    return `monthly:${summary.monthlyChallengeMonthKey}:${challenge.id}`;
  }
  return `lifetime:${challenge.id}`;
}

/** Mark already-earned goals as seen on first server sync (prevents relog replay). */
export function seedCelebrationsSeenFromSummary(
  userId: string,
  summary: GamificationSummary,
  isPro: boolean
): void {
  const achievementIds = Object.keys(summary.unlockedAchievements || {});
  markAchievementsSeen(userId, achievementIds);

  const progressKeys: string[] = [];
  const allChallenges = [...WEEKLY_CHALLENGES, ...MONTHLY_CHALLENGES, ...LIFETIME_MILESTONES];
  for (const c of allChallenges) {
    if (isChallengeComplete(summary, c, isPro)) {
      progressKeys.push(challengeDedupeKey(c, summary));
    }
  }
  const streak = summary.currentStreak || 0;
  for (const m of STREAK_MILESTONES) {
    if (streak >= m) progressKeys.push(`streak:${m}`);
  }
  const dayKey = getDayKey();
  const pb = summary.personalBests || {};
  if (pb.barsInDay > 0) progressKeys.push(`pb:barsInDay:${dayKey}:seed:${pb.barsInDay}`);
  if (pb.barsInSession > 0) progressKeys.push(`pb:barsInSession:${dayKey}:seed:${pb.barsInSession}`);
  if (pb.longestStreak > 0 && !STREAK_MILESTONES.includes(pb.longestStreak as (typeof STREAK_MILESTONES)[number])) {
    progressKeys.push(`pb:longestStreak:${dayKey}:seed:${pb.longestStreak}`);
  }

  markProgressCelebrationsSeen(userId, progressKeys);
}
