import type { RankId } from '@/lib/gamification/types';

export type StudioRank = {
  id: RankId;
  label: string;
  minXp: number;
  proOverlay?: boolean;
};

export const STUDIO_RANKS: StudioRank[] = [
  { id: 'open_mic', label: 'Open Mic', minXp: 0 },
  { id: 'demo_tape', label: 'Demo Tape', minXp: 200 },
  { id: 'session_ready', label: 'Session Ready', minXp: 600 },
  { id: 'headliner', label: 'Headliner', minXp: 1500 },
  { id: 'vault_architect', label: 'Vault Architect', minXp: 3500, proOverlay: true },
];

export function rankFromXp(xp: number, isPro: boolean): StudioRank {
  let rank = STUDIO_RANKS[0];
  for (const r of STUDIO_RANKS) {
    if (xp >= r.minXp) rank = r;
  }
  if (isPro && xp >= 3500) {
    return STUDIO_RANKS.find((r) => r.id === 'vault_architect')!;
  }
  if (rank.proOverlay && !isPro) {
    return STUDIO_RANKS.find((r) => r.id === 'headliner')!;
  }
  return rank;
}

export function xpProgressInRank(xp: number, rank: StudioRank): { current: number; next: number | null } {
  const idx = STUDIO_RANKS.findIndex((r) => r.id === rank.id);
  const next = STUDIO_RANKS[idx + 1];
  return { current: xp - rank.minXp, next: next ? next.minXp - rank.minXp : null };
}
