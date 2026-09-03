import type { RankId } from '@/lib/gamification/types';
import {
  getAchievementCardTheme,
  pickFeaturedAchievementId,
} from '@/lib/gamification/achievement-card-theme';
import { getAchievement } from '@/lib/gamification/achievements';
import { STUDIO_RANKS, xpProgressInRank } from '@/lib/gamification/ranks';

export type StudioPassInput = {
  displayName: string;
  rankId: RankId;
  rankLabel: string;
  xp: number;
  streak: number;
  longestStreak: number;
  badgeCount: number;
  totalBadges: number;
  lastAchievementId?: string;
  lastUnlockedAt?: string;
  profileSlug?: string;
};

const RANK_CODE: Record<RankId, string> = {
  open_mic: 'OM',
  soundcheck: 'SC',
  demo_tape: 'DT',
  cipher_cut: 'CC',
  session_ready: 'SR',
  green_room: 'GR',
  headliner: 'HL',
  encore_run: 'ER',
  catalog_king: 'CK',
  vault_architect: 'VA',
};

function fnv1a(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Human-readable residency ID derived from rank + profile stats. */
export function getStudioPassId(input: StudioPassInput): string {
  const rank = RANK_CODE[input.rankId] || 'OM';
  const key = [
    input.displayName,
    input.rankId,
    input.xp,
    input.streak,
    input.badgeCount,
    input.lastAchievementId || '',
  ].join('|');
  const checksum = fnv1a(key).toString(16).toUpperCase().padStart(6, '0').slice(-6);
  const nameFold = fnv1a(input.displayName).toString(16).toUpperCase().slice(-3);
  return `AKA·${rank}·${checksum}·${nameFold}`;
}

export function getStudioPassTheme(lastAchievementId?: string) {
  const achievement = lastAchievementId ? getAchievement(lastAchievementId) : null;
  return getAchievementCardTheme(achievement);
}

export function getLastAchievement(unlocked: Record<string, string>) {
  const id = pickFeaturedAchievementId(unlocked);
  if (!id) return null;
  return {
    id,
    def: getAchievement(id),
    unlockedAt: unlocked[id],
  };
}

export function getInitials(name: string | null | undefined): string {
  const parts = String(name ?? '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (!parts.length) return 'A';
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]![0]}${parts[parts.length - 1]![0]}`.toUpperCase();
}

export function getBoothStatus(streak: number): { label: string; pulseSec: number } {
  if (streak >= 30) return { label: 'Iron Booth', pulseSec: 0.65 };
  if (streak >= 7) return { label: 'In Session', pulseSec: 1.1 };
  if (streak >= 1) return { label: 'Active', pulseSec: 1.6 };
  return { label: 'Checked In', pulseSec: 2.4 };
}

export function getPassProgressSnapshot(input: StudioPassInput) {
  const rank = STUDIO_RANKS.find((r) => r.id === input.rankId) ?? STUDIO_RANKS[0];
  const rankIndex = STUDIO_RANKS.findIndex((r) => r.id === rank.id);
  const nextRank = STUDIO_RANKS[rankIndex + 1];
  const { current, next } = xpProgressInRank(input.xp, rank);
  const xpPercent = next ? Math.min(100, Math.round((current / next) * 100)) : 100;
  const badgePercent =
    input.totalBadges > 0 ? Math.min(100, Math.round((input.badgeCount / input.totalBadges) * 100)) : 0;

  return {
    rankIndex,
    nextRankLabel: nextRank?.label,
    xpPercent,
    xpToNext: next ? Math.max(0, next - current) : 0,
    badgePercent,
  };
}

export function buildShareCopyText(
  input: StudioPassInput,
  passId: string,
  lastTitle?: string,
  lastDate?: string
): string {
  const lines = [
    `🎤 ${input.displayName} · AKAsheet Residency`,
    `${input.rankLabel} · ${input.xp.toLocaleString()} XP · ${input.streak}d streak · ${input.badgeCount}/${input.totalBadges} badges`,
  ];
  if (lastTitle) {
    lines.push(`Latest milestone: ${lastTitle}${lastDate ? ` (${lastDate})` : ''}`);
  }
  lines.push(`Studio ID: ${passId}`);
  lines.push('akasheet.com');
  if (input.profileSlug) {
    lines.push(`Profile: akasheet.com/${input.profileSlug}`);
  }
  return lines.join('\n');
}

export { STUDIO_RANKS };
