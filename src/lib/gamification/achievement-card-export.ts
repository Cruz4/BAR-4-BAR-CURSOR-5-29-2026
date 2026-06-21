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

  const inner = clonedEl.querySelector('[data-achievement-inner]') as HTMLElement | null;
  if (inner) inner.style.overflow = 'visible';

  clonedEl.querySelectorAll('[data-achievement-pill]').forEach((node) => {
    const el = node as HTMLElement;
    el.style.display = 'inline-flex';
    el.style.alignItems = 'center';
    el.style.justifyContent = 'center';
    el.style.lineHeight = '1';
    el.style.letterSpacing = '0.06em';
    el.style.paddingTop = '4px';
    el.style.paddingBottom = '4px';
  });

  clonedEl.querySelectorAll('[data-achievement-desc]').forEach((node) => {
    const el = node as HTMLElement;
    el.style.overflow = 'visible';
    el.style.whiteSpace = 'normal';
    el.style.wordWrap = 'break-word';
    el.style.width = '100%';
    el.style.maxWidth = '100%';
    el.style.lineHeight = '1.45';
  });

  clonedEl.querySelectorAll('p, h3, span').forEach((node) => {
    const el = node as HTMLElement;
    el.style.overflow = 'visible';
    el.style.textOverflow = 'clip';
    if (!el.dataset.achievementDesc) {
      el.style.lineHeight = el.style.lineHeight || '1.35';
    }
  });
}

export async function downloadAchievementCardPng(
  cardEl: HTMLElement,
  achievement: AchievementDef | null | undefined
): Promise<void> {
  const theme = getAchievementCardTheme(achievement);
  await document.fonts.ready;

  const html2canvas = (await import('html2canvas')).default;
  const width = cardEl.offsetWidth;
  const height = Math.max(cardEl.scrollHeight, cardEl.offsetHeight);
  const canvas = await html2canvas(cardEl, {
    backgroundColor: achievementCardBackgroundColor(theme),
    scale: 2,
    useCORS: true,
    logging: false,
    width,
    height,
    windowWidth: width,
    windowHeight: height,
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
