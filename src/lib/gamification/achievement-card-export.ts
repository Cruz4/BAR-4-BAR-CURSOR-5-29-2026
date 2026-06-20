import type { AchievementDef } from '@/lib/gamification/achievements';
import {
  formatUnlockDate,
  getAchievementCardTheme,
  getAchievementSerial,
  achievementCardBackgroundColor,
} from '@/lib/gamification/achievement-card-theme';

export function buildAchievementShareText(
  achievement: AchievementDef | null | undefined,
  displayName: string,
  rankLabel: string,
  xp: number,
  streak: number,
  unlockedAt?: string
): string {
  const serial = getAchievementSerial(achievement?.id || 'studio-stats', displayName);
  if (!achievement) {
    return `${displayName} · ${rankLabel} · ${xp.toLocaleString()} XP · ${streak}d streak — Bar 4 Bar Studio`;
  }
  return `🏆 ${achievement.title} — ${displayName}\n${achievement.description}\n${rankLabel} · ${xp.toLocaleString()} XP · ${streak}d streak\nUnlocked ${formatUnlockDate(unlockedAt)}\nBar 4 Bar Studio · ${serial}`;
}

export async function downloadAchievementCardPng(
  cardEl: HTMLElement,
  achievement: AchievementDef | null | undefined
): Promise<void> {
  const theme = getAchievementCardTheme(achievement);
  const html2canvas = (await import('html2canvas')).default;
  const canvas = await html2canvas(cardEl, {
    backgroundColor: achievementCardBackgroundColor(theme),
    scale: 2,
    useCORS: true,
  });
  const slug = (achievement?.id || 'studio-stats').replace(/_/g, '-');
  const link = document.createElement('a');
  link.download = `bar4bar-${slug}.png`;
  link.href = canvas.toDataURL('image/png');
  link.click();
}
