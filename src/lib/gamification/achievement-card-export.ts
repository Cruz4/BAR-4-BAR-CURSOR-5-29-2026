import type { AchievementDef } from '@/lib/gamification/achievements';
import {
  formatUnlockDate,
  getAchievementSerial,
} from '@/lib/gamification/achievement-card-theme';
import {
  captureFoilNodeToCanvas,
  canvasToFeedJpegDataUrl,
  downloadCanvasPng,
} from '@/lib/gamification/capture-foil-node';

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
    return `${displayName} · ${rankLabel} · ${xp.toLocaleString()} XP · ${streak}d streak — AKAsheet`;
  }
  return `🏆 ${achievement.title} — ${displayName}\n${achievement.description}\n${rankLabel} · ${xp.toLocaleString()} XP · ${streak}d streak\n${unlockedAt ? `Unlocked ${formatUnlockDate(unlockedAt)}` : 'Unlocked'}\nAKAsheet · ${serial}`;
}

function prepareAchievementExtras(clonedEl: HTMLElement) {
  clonedEl.querySelectorAll('[data-achievement-desc]').forEach((node) => {
    const el = node as HTMLElement;
    el.style.overflow = 'visible';
    el.style.whiteSpace = 'normal';
    el.style.wordWrap = 'break-word';
    el.style.width = '100%';
    el.style.maxWidth = '100%';
    el.style.lineHeight = '1.45';
  });
}

/** JPEG data URL sized for feed posts (Firestore-safe). */
export async function achievementCardToFeedImageDataUrl(
  cardEl: HTMLElement,
  _achievement: AchievementDef | null | undefined
): Promise<string> {
  const canvas = await captureFoilNodeToCanvas(cardEl, {
    prepare: prepareAchievementExtras,
  });
  return canvasToFeedJpegDataUrl(canvas);
}

export async function downloadAchievementCardPng(
  cardEl: HTMLElement,
  achievement: AchievementDef | null | undefined
): Promise<void> {
  const canvas = await captureFoilNodeToCanvas(cardEl, {
    prepare: prepareAchievementExtras,
  });
  const slug = (achievement?.id || 'studio-stats').replace(/_/g, '-');
  downloadCanvasPng(canvas, `akasheet-${slug}.png`);
}
