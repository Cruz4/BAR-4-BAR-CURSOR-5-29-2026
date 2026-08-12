import type { RankId } from '@/lib/gamification/types';

export type StudioRank = {
  id: RankId;
  label: string;
  minXp: number;
  proOverlay?: boolean;
};

/**
 * Ten studio plates — slower climb, meshed with weekly writing + Scene flow.
 * Vault Architect stays Pro-gated at the top.
 */
export const STUDIO_RANKS: StudioRank[] = [
  { id: 'open_mic', label: 'Open Mic', minXp: 0 },
  { id: 'soundcheck', label: 'Soundcheck', minXp: 250 },
  { id: 'demo_tape', label: 'Demo Tape', minXp: 600 },
  { id: 'cipher_cut', label: 'Cipher Cut', minXp: 1100 },
  { id: 'session_ready', label: 'Session Ready', minXp: 1800 },
  { id: 'green_room', label: 'Green Room', minXp: 2700 },
  { id: 'headliner', label: 'Headliner', minXp: 4000 },
  { id: 'encore_run', label: 'Encore Run', minXp: 5800 },
  { id: 'catalog_king', label: 'Catalog King', minXp: 8000 },
  { id: 'vault_architect', label: 'Vault Architect', minXp: 11000, proOverlay: true },
];

export function rankFromXp(xp: number, isPro: boolean): StudioRank {
  let rank = STUDIO_RANKS[0]!;
  for (const r of STUDIO_RANKS) {
    if (xp >= r.minXp) rank = r;
  }
  if (isPro && xp >= (STUDIO_RANKS.find((r) => r.id === 'vault_architect')?.minXp || 11000)) {
    return STUDIO_RANKS.find((r) => r.id === 'vault_architect')!;
  }
  if (rank.proOverlay && !isPro) {
    // Cap free users one plate below the Pro overlay.
    const idx = STUDIO_RANKS.findIndex((r) => r.id === 'vault_architect');
    return STUDIO_RANKS[Math.max(0, idx - 1)]!;
  }
  return rank;
}

export function xpProgressInRank(xp: number, rank: StudioRank): { current: number; next: number | null } {
  const idx = STUDIO_RANKS.findIndex((r) => r.id === rank.id);
  const next = STUDIO_RANKS[idx + 1];
  return { current: xp - rank.minXp, next: next ? next.minXp - rank.minXp : null };
}
