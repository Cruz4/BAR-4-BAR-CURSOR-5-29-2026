import type { ChallengeDef, ChallengeScale, ChallengeTier } from '@/lib/gamification/challenges';
import {
  getDayKey,
  isChallengeComplete,
  LIFETIME_MILESTONES,
  MONTHLY_CHALLENGES,
  WEEKLY_CHALLENGES,
} from '@/lib/gamification/challenges';
import { DEFAULT_GAMIFICATION_SUMMARY, type GamificationSummary } from '@/lib/gamification/types';
import { linesToRhymeBars } from '@/lib/lyrics-units';

type PersonalBestKind = keyof GamificationSummary['personalBests'];

/** Tracks PB values at session/day start so we only toast once per real record beat. */
export type PersonalBestCelebrationState = {
  dayKey: string;
  sessionBaseline: GamificationSummary['personalBests'];
  celebrated: Record<PersonalBestKind, boolean>;
};

export function createPersonalBestCelebrationState(
  summary: GamificationSummary,
  dayKey = getDayKey()
): PersonalBestCelebrationState {
  const sessionBaseline = {
    ...DEFAULT_GAMIFICATION_SUMMARY.personalBests,
    ...(summary.personalBests || {}),
  };
  return {
    dayKey,
    sessionBaseline,
    celebrated: { barsInDay: false, barsInSession: false, longestStreak: false },
  };
}

/** Keep baseline in sync after server pull without re-firing session toasts. */
export function syncPersonalBestCelebrationState(
  state: PersonalBestCelebrationState,
  summary: GamificationSummary,
  dayKey = getDayKey()
): void {
  const pb = {
    ...DEFAULT_GAMIFICATION_SUMMARY.personalBests,
    ...(summary.personalBests || {}),
  };
  if (state.dayKey !== dayKey) {
    state.dayKey = dayKey;
    state.sessionBaseline = { ...pb };
    state.celebrated = { barsInDay: false, barsInSession: false, longestStreak: false };
    return;
  }
  for (const kind of ['barsInDay', 'barsInSession', 'longestStreak'] as const) {
    if (pb[kind] > state.sessionBaseline[kind]) {
      state.sessionBaseline[kind] = pb[kind];
      state.celebrated[kind] = true;
    }
  }
}

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

function detectStreakMilestones(_prev: GamificationSummary, _next: GamificationSummary): ProgressCelebrationItem[] {
  // Streak milestones already fire as achievement unlocks (streak_3 / 7 / 30).
  // Showing both doubled the modal spam.
  return [];
}

function detectChallengeCompletions(
  prev: GamificationSummary,
  next: GamificationSummary,
  isPro: boolean
): ProgressCelebrationItem[] {
  const all = [...WEEKLY_CHALLENGES, ...MONTHLY_CHALLENGES, ...LIFETIME_MILESTONES];
  return all
    .filter((c) => !isChallengeComplete(prev, c, isPro) && isChallengeComplete(next, c, isPro))
    // Weekly standard goals toast quietly elsewhere — keep modals for epic/legendary + month/life.
    .filter((c) => !(c.scale === 'weekly' && c.tier === 'standard'))
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

function detectPersonalBests(
  next: GamificationSummary,
  streakMilestoneValues: Set<number>,
  pbState: PersonalBestCelebrationState
): ProgressCelebrationItem[] {
  const pbNext = { ...DEFAULT_GAMIFICATION_SUMMARY.personalBests, ...(next.personalBests || {}) };
  const items: ProgressCelebrationItem[] = [];

  const maybePush = (kind: PersonalBestKind) => {
    if (pbState.celebrated[kind]) return;
    if (pbNext[kind] <= pbState.sessionBaseline[kind]) return;
    pbState.celebrated[kind] = true;
    const copy = PERSONAL_BEST_COPY[kind](pbNext[kind]);
    items.push({
      type: 'personal_best',
      dedupeKey: `pb:${kind}:${pbState.dayKey}:${pbState.sessionBaseline[kind]}->${pbNext[kind]}`,
      kind,
      value: pbNext[kind],
      ...copy,
    });
  };

  maybePush('barsInDay');
  maybePush('barsInSession');

  if (!streakMilestoneValues.has(pbNext.longestStreak)) {
    maybePush('longestStreak');
  }

  return items;
}

export function detectProgressCelebrations(
  prev: GamificationSummary,
  next: GamificationSummary,
  isPro: boolean,
  pbState: PersonalBestCelebrationState
): ProgressCelebrationItem[] {
  const challenges = detectChallengeCompletions(prev, next, isPro);
  const streakMilestones = detectStreakMilestones(prev, next);
  const streakValues = new Set(
    streakMilestones
      .filter((s): s is Extract<ProgressCelebrationItem, { type: 'streak_milestone' }> =>
        s.type === 'streak_milestone'
      )
      .map((s) => s.streak)
  );
  const personalBests = detectPersonalBests(next, streakValues, pbState);

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
