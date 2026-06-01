import type { ChallengeDef, ChallengeScale, ChallengeTier } from '@/lib/gamification/challenges';
import {
  isChallengeComplete,
  LIFETIME_MILESTONES,
  MONTHLY_CHALLENGES,
  WEEKLY_CHALLENGES,
} from '@/lib/gamification/challenges';
import { DEFAULT_GAMIFICATION_SUMMARY, type GamificationSummary } from '@/lib/gamification/types';
import { linesToRhymeBars } from '@/lib/lyrics-units';

export type ProgressCelebrationItem =
  | {
      type: 'challenge';
      dedupeKey: string;
      id: string;
      label: string;
      description: string;
      scale: ChallengeScale;
      tier: ChallengeTier;
    }
  | {
      type: 'personal_best';
      dedupeKey: string;
      kind: 'barsInDay' | 'barsInSession' | 'longestStreak';
      value: number;
      label: string;
      description: string;
    }
  | {
      type: 'streak_milestone';
      dedupeKey: string;
      streak: number;
      label: string;
      description: string;
    };

export type ProgressCelebrationDetail = {
  items: ProgressCelebrationItem[];
};

export const PROGRESS_CELEBRATION_EVENT = 'b4b-progress-celebration';

const STREAK_MILESTONES = [3, 7, 30] as const;

const STREAK_MILESTONE_COPY: Record<(typeof STREAK_MILESTONES)[number], { label: string; description: string }> = {
  3: {
    label: '3-Day Streak',
    description: 'Three days in a row in the booth. Keep the momentum going.',
  },
  7: {
    label: '7-Day Streak',
    description: 'A full week of writing. You are building a real habit.',
  },
  30: {
    label: '30-Day Streak',
    description: 'Thirty consecutive studio days. Legendary discipline.',
  },
};

const PERSONAL_BEST_COPY: Record<
  'barsInDay' | 'barsInSession' | 'longestStreak',
  (value: number) => { label: string; description: string }
> = {
  barsInDay: (value) => ({
    label: 'New Daily Record',
    description: `${linesToRhymeBars(value)} bars written in one day — your best session yet.`,
  }),
  barsInSession: (value) => ({
    label: 'New Session Record',
    description: `${linesToRhymeBars(value)} bars in a single session. You were locked in.`,
  }),
  longestStreak: (value) => ({
    label: 'Longest Streak Ever',
    description: `${value} consecutive studio days. That is your new personal best.`,
  }),
};

function challengeDedupeKey(challenge: ChallengeDef, summary: GamificationSummary): string {
  if (challenge.scale === 'weekly') {
    return `weekly:${summary.weeklyChallengeWeekKey}:${challenge.id}`;
  }
  if (challenge.scale === 'monthly') {
    return `monthly:${summary.monthlyChallengeMonthKey}:${challenge.id}`;
  }
  return `lifetime:${challenge.id}`;
}

function detectChallengeCompletions(
  prev: GamificationSummary,
  next: GamificationSummary,
  isPro: boolean
): ProgressCelebrationItem[] {
  const all = [...WEEKLY_CHALLENGES, ...MONTHLY_CHALLENGES, ...LIFETIME_MILESTONES];
  return all
    .filter((c) => !isChallengeComplete(prev, c, isPro) && isChallengeComplete(next, c, isPro))
    .map((c) => ({
      type: 'challenge' as const,
      dedupeKey: challengeDedupeKey(c, next),
      id: c.id,
      label: c.label,
      description: c.description,
      scale: c.scale,
      tier: c.tier,
    }));
}

function detectStreakMilestones(prev: GamificationSummary, next: GamificationSummary): ProgressCelebrationItem[] {
  const prevStreak = prev.currentStreak || 0;
  const nextStreak = next.currentStreak || 0;
  return STREAK_MILESTONES.filter((m) => prevStreak < m && nextStreak >= m).map((streak) => {
    const copy = STREAK_MILESTONE_COPY[streak];
    return {
      type: 'streak_milestone' as const,
      dedupeKey: `streak:${streak}`,
      streak,
      label: copy.label,
      description: copy.description,
    };
  });
}

function detectPersonalBests(
  prev: GamificationSummary,
  next: GamificationSummary,
  streakMilestoneValues: Set<number>
): ProgressCelebrationItem[] {
  const pbPrev = { ...DEFAULT_GAMIFICATION_SUMMARY.personalBests, ...(prev.personalBests || {}) };
  const pbNext = { ...DEFAULT_GAMIFICATION_SUMMARY.personalBests, ...(next.personalBests || {}) };
  const items: ProgressCelebrationItem[] = [];

  if (pbNext.barsInDay > pbPrev.barsInDay) {
    const copy = PERSONAL_BEST_COPY.barsInDay(pbNext.barsInDay);
    items.push({
      type: 'personal_best',
      dedupeKey: `pb:barsInDay:${pbNext.barsInDay}`,
      kind: 'barsInDay',
      value: pbNext.barsInDay,
      ...copy,
    });
  }

  if (pbNext.barsInSession > pbPrev.barsInSession) {
    const copy = PERSONAL_BEST_COPY.barsInSession(pbNext.barsInSession);
    items.push({
      type: 'personal_best',
      dedupeKey: `pb:barsInSession:${pbNext.barsInSession}`,
      kind: 'barsInSession',
      value: pbNext.barsInSession,
      ...copy,
    });
  }

  if (pbNext.longestStreak > pbPrev.longestStreak && !streakMilestoneValues.has(pbNext.longestStreak)) {
    const copy = PERSONAL_BEST_COPY.longestStreak(pbNext.longestStreak);
    items.push({
      type: 'personal_best',
      dedupeKey: `pb:longestStreak:${pbNext.longestStreak}`,
      kind: 'longestStreak',
      value: pbNext.longestStreak,
      ...copy,
    });
  }

  return items;
}

export function detectProgressCelebrations(
  prev: GamificationSummary,
  next: GamificationSummary,
  isPro: boolean
): ProgressCelebrationItem[] {
  const challenges = detectChallengeCompletions(prev, next, isPro);
  const streakMilestones = detectStreakMilestones(prev, next);
  const streakValues = new Set(streakMilestones.map((s) => s.streak));
  const personalBests = detectPersonalBests(prev, next, streakValues);

  return [...challenges, ...streakMilestones, ...personalBests];
}

export function dispatchProgressCelebrations(items: ProgressCelebrationItem[]): void {
  if (typeof window === 'undefined' || !items.length) return;
  window.dispatchEvent(
    new CustomEvent<ProgressCelebrationDetail>(PROGRESS_CELEBRATION_EVENT, {
      detail: { items },
    })
  );
}
