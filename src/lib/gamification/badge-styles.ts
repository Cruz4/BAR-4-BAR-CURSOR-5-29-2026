import type { AchievementDef } from '@/lib/gamification/achievements';

/** Rank badge colors readable in both light and dark studio themes. */
export const RANK_BADGE: Record<string, string> = {
  open_mic: 'border-slate-400/40 bg-slate-500/10 text-slate-700 dark:text-slate-200',
  demo_tape: 'border-sky-500/45 bg-sky-500/12 text-sky-800 dark:text-sky-300',
  session_ready: 'border-cyan-500/45 bg-cyan-500/12 text-cyan-800 dark:text-cyan-200',
  headliner: 'border-amber-500/45 bg-amber-500/12 text-amber-800 dark:text-amber-300',
  vault_architect:
    'border-violet-500/50 bg-violet-500/15 text-violet-800 dark:text-violet-200 shadow-[0_0_12px_rgba(139,92,246,0.12)] dark:shadow-[0_0_12px_rgba(139,92,246,0.2)]',
};

export const STREAK_BADGE =
  'border-orange-500/45 bg-orange-500/12 text-orange-700 dark:text-orange-200 shadow-[0_0_10px_rgba(249,115,22,0.12)] dark:shadow-[0_0_10px_rgba(249,115,22,0.15)]';

export const XP_LABEL = 'font-code text-sky-900 dark:text-sky-100/90 font-bold';

export const ACHIEVEMENT_CATEGORY: Record<AchievementDef['category'], string> = {
  activation: 'border-sky-500/45 bg-sky-500/12 text-sky-800 dark:text-sky-200',
  retention: 'border-amber-500/45 bg-amber-500/12 text-amber-800 dark:text-amber-200',
  conversion: 'border-fuchsia-500/45 bg-fuchsia-500/12 text-fuchsia-800 dark:text-fuchsia-200',
};

export const ACHIEVEMENT_CATEGORY_LOCKED: Record<AchievementDef['category'], string> = {
  activation:
    'border-sky-500/30 bg-sky-100/90 text-sky-800/75 dark:border-sky-500/25 dark:bg-sky-950/35 dark:text-slate-200',
  retention:
    'border-amber-500/30 bg-amber-100/90 text-amber-900/75 dark:border-amber-500/25 dark:bg-amber-950/35 dark:text-slate-200',
  conversion:
    'border-fuchsia-500/30 bg-fuchsia-100/90 text-fuchsia-900/75 dark:border-fuchsia-500/25 dark:bg-fuchsia-950/35 dark:text-slate-200',
};
