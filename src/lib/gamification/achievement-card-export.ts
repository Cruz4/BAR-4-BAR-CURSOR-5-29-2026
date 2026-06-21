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

function prepareAchievementCardClone(clonedEl: HTMLElement) {
  clonedEl.style.overflow = 'visible';

  clonedEl.querySelectorAll('p, h3, span').forEach((node) => {
    const el = node as HTMLElement;
    el.style.overflow = 'visible';
    el.style.textOverflow = 'clip';
    el.style.lineHeight = '1.35';
  });
}

export async function downloadAchievementCardPng(
  cardEl: HTMLElement,
  achievement: AchievementDef | null | undefined
): Promise<void> {
  const theme = getAchievementCardTheme(achievement);
  await document.fonts.ready;

  const html2canvas = (await import('html2canvas')).default;
  const canvas = await html2canvas(cardEl, {
    backgroundColor: achievementCardBackgroundColor(theme),
    scale: 2,
    useCORS: true,
    logging: false,
    windowWidth: cardEl.scrollWidth,
    windowHeight: cardEl.scrollHeight,
    scrollX: 0,
    scrollY: 0,
    onclone: (_doc, clonedEl) => {
      prepareAchievementCardClone(clonedEl);
    },
  });
  const slug = (achievement?.id || 'studio-stats').replace(/_/g, '-');
  const link = document.createElement('a');
  link.download = `bar4bar-${slug}.png`;
  link.href = canvas.toDataURL('image/png');
  link.click();
}
