import type { AchievementDef } from '@/lib/gamification/achievements';
import type { RankId } from '@/lib/gamification/types';
import { STUDIO_RANKS } from '@/lib/gamification/ranks';

/**
 * Studio rank rarity ladder — each tier reads clearly rarer than the last.
 * Common → Uncommon → Rare → Epic → Legendary.
 */
export const RANK_BADGE: Record<RankId, string> = {
  open_mic:
    'border-zinc-400/40 bg-zinc-500/10 text-zinc-700 dark:border-zinc-500/35 dark:bg-zinc-500/10 dark:text-zinc-300',
  demo_tape:
    'border-emerald-500/50 bg-emerald-500/12 text-emerald-800 dark:border-emerald-400/45 dark:bg-emerald-500/15 dark:text-emerald-300',
  session_ready:
    'border-sky-500/55 bg-sky-500/15 text-sky-800 shadow-[0_0_10px_rgba(14,165,233,0.14)] dark:border-sky-400/50 dark:bg-sky-500/18 dark:text-sky-200 dark:shadow-[0_0_12px_rgba(56,189,248,0.2)]',
  headliner:
    'border-amber-400/60 bg-gradient-to-r from-amber-500/18 to-orange-500/12 text-amber-900 shadow-[0_0_16px_rgba(245,158,11,0.28)] dark:border-amber-300/55 dark:from-amber-500/22 dark:to-orange-500/14 dark:text-amber-100 dark:shadow-[0_0_18px_rgba(251,191,36,0.32)]',
  vault_architect:
    'border-fuchsia-400/65 bg-gradient-to-r from-violet-600/22 via-fuchsia-500/18 to-amber-400/10 text-fuchsia-950 shadow-[0_0_22px_rgba(217,70,239,0.35)] ring-1 ring-fuchsia-400/30 dark:border-fuchsia-300/60 dark:from-violet-500/28 dark:via-fuchsia-500/20 dark:to-amber-300/12 dark:text-fuchsia-50 dark:shadow-[0_0_26px_rgba(232,121,249,0.4)] dark:ring-fuchsia-300/35',
};

/** Unearned ranks in a ladder — keep hue hint, mute presence. */
export const RANK_BADGE_LOCKED: Record<RankId, string> = {
  open_mic: 'border-zinc-400/20 bg-transparent text-zinc-500/50 dark:text-zinc-500/40 opacity-45 grayscale',
  demo_tape: 'border-emerald-500/20 bg-transparent text-emerald-700/45 dark:text-emerald-400/35 opacity-45 grayscale',
  session_ready: 'border-sky-500/20 bg-transparent text-sky-700/45 dark:text-sky-400/35 opacity-45 grayscale',
  headliner: 'border-amber-500/20 bg-transparent text-amber-800/45 dark:text-amber-400/35 opacity-45 grayscale',
  vault_architect: 'border-fuchsia-500/20 bg-transparent text-fuchsia-800/45 dark:text-fuchsia-400/35 opacity-45 grayscale',
};

/** Cleared past ranks — tint kept, no glow so current can pop. */
export const RANK_BADGE_CLEARED: Record<RankId, string> = {
  open_mic: 'border-zinc-400/40 bg-zinc-500/8 text-zinc-600 dark:text-zinc-400',
  demo_tape: 'border-emerald-500/40 bg-emerald-500/8 text-emerald-700 dark:text-emerald-400/80',
  session_ready: 'border-sky-500/40 bg-sky-500/8 text-sky-700 dark:text-sky-300/80',
  headliner: 'border-amber-500/40 bg-amber-500/8 text-amber-800 dark:text-amber-300/80',
  vault_architect: 'border-fuchsia-500/40 bg-fuchsia-500/8 text-fuchsia-800 dark:text-fuchsia-300/80',
};

export type RankLadderState = 'locked' | 'cleared' | 'current';

export function rankBadgeClass(rankId: RankId | string | undefined, earned = true): string {
  const id = (rankId && rankId in RANK_BADGE ? rankId : 'open_mic') as RankId;
  return earned ? RANK_BADGE[id] : RANK_BADGE_LOCKED[id];
}

/** Ladder chips: locked / past / current — current is the only full rarity treatment. */
export function rankLadderBadgeClass(
  rankId: RankId | string | undefined,
  state: RankLadderState
): string {
  const id = (rankId && rankId in RANK_BADGE ? rankId : 'open_mic') as RankId;
  if (state === 'locked') return RANK_BADGE_LOCKED[id];
  if (state === 'cleared') return RANK_BADGE_CLEARED[id];
  return `${RANK_BADGE[id]} ring-2 ring-white/40 dark:ring-white/25 h-6 px-2.5 text-[9px] shadow-md`;
}

export function rankIdFromLabel(label: string | undefined): RankId {
  const hit = STUDIO_RANKS.find((r) => r.label === label);
  return hit?.id ?? 'open_mic';
}

/** XP progress fill — hue tracks current rank rarity. */
export const RANK_XP_BAR: Record<RankId, string> = {
  open_mic: 'bg-gradient-to-r from-zinc-500 to-zinc-400',
  demo_tape: 'bg-gradient-to-r from-emerald-600 to-teal-400',
  session_ready: 'bg-gradient-to-r from-sky-600 to-cyan-400',
  headliner: 'bg-gradient-to-r from-amber-600 via-amber-400 to-orange-400',
  vault_architect: 'bg-gradient-to-r from-violet-600 via-fuchsia-500 to-amber-300',
};

export const STREAK_BADGE =
  'border-orange-500/45 bg-orange-500/12 text-orange-700 dark:text-orange-200 shadow-[0_0_10px_rgba(249,115,22,0.12)] dark:shadow-[0_0_10px_rgba(249,115,22,0.15)]';

export const XP_LABEL = 'font-code text-sky-900 dark:text-sky-100/90 font-bold';

export const ACHIEVEMENT_CATEGORY: Record<AchievementDef['category'], string> = {
  activation: 'border-sky-500/45 bg-sky-500/12 text-sky-800 dark:text-sky-200',
  retention: 'border-amber-500/45 bg-amber-500/12 text-amber-800 dark:text-amber-200',
  conversion: 'border-fuchsia-500/45 bg-fuchsia-500/12 text-fuchsia-800 dark:text-fuchsia-200',
  mastery: 'border-violet-500/45 bg-violet-500/12 text-violet-800 dark:text-violet-200',
};

export const ACHIEVEMENT_CATEGORY_LOCKED: Record<AchievementDef['category'], string> = {
  activation:
    'border-sky-500/30 bg-sky-100/90 text-sky-800/75 dark:border-sky-500/25 dark:bg-sky-950/35 dark:text-slate-200',
  retention:
    'border-amber-500/30 bg-amber-100/90 text-amber-900/75 dark:border-amber-500/25 dark:bg-amber-950/35 dark:text-slate-200',
  conversion:
    'border-fuchsia-500/30 bg-fuchsia-100/90 text-fuchsia-900/75 dark:border-fuchsia-500/25 dark:bg-fuchsia-950/35 dark:text-slate-200',
  mastery:
    'border-violet-500/30 bg-violet-100/90 text-violet-900/75 dark:border-violet-500/25 dark:bg-violet-950/35 dark:text-slate-200',
};
