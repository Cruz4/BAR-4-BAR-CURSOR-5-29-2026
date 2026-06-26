import type { AchievementDef } from '@/lib/gamification/achievements';
import {
  formatUnlockDate,
  getAchievementCardTheme,
  getAchievementSerial,
  achievementCardBackgroundColor,
} from '@/lib/gamification/achievement-card-theme';

/** Fixed export width — matches dialog preview; avoids dialog padding skewing html2canvas. */
const EXPORT_CARD_WIDTH_PX = 400;

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
  clonedEl.style.width = `${EXPORT_CARD_WIDTH_PX}px`;
  clonedEl.style.maxWidth = `${EXPORT_CARD_WIDTH_PX}px`;
  clonedEl.style.margin = '0';
  clonedEl.style.boxSizing = 'border-box';
  clonedEl.style.overflow = 'visible';

  const inner = clonedEl.querySelector('[data-achievement-inner]') as HTMLElement | null;
  if (inner) inner.style.overflow = 'visible';

  clonedEl.querySelectorAll('[data-achievement-pill] text').forEach((node) => {
    const el = node as SVGTextElement;
    el.setAttribute('dominant-baseline', 'central');
    el.setAttribute('text-anchor', 'middle');
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
    if (el.closest('[data-achievement-pill]')) return;
    el.style.overflow = 'visible';
    el.style.textOverflow = 'clip';
    if (!el.dataset.achievementDesc) {
      el.style.lineHeight = el.style.lineHeight || '1.35';
    }
  });
}

/** Crop transparent / solid-bg margins so the PNG is tight around the card. */
function trimCanvasToContent(
  source: HTMLCanvasElement,
  backgroundRgb: { r: number; g: number; b: number },
  tolerance = 14
): HTMLCanvasElement {
  const ctx = source.getContext('2d');
  if (!ctx) return source;

  const { width, height } = source;
  const imageData = ctx.getImageData(0, 0, width, height);
  const { data } = imageData;

  const isBackground = (i: number) => {
    const a = data[i + 3];
    if (a < 8) return true;
    return (
      Math.abs(data[i] - backgroundRgb.r) <= tolerance &&
      Math.abs(data[i + 1] - backgroundRgb.g) <= tolerance &&
      Math.abs(data[i + 2] - backgroundRgb.b) <= tolerance
    );
  };

  let minX = width;
  let minY = height;
  let maxX = 0;
  let maxY = 0;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      if (!isBackground(i)) {
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
      }
    }
  }

  if (minX >= maxX || minY >= maxY) return source;

  const pad = 4;
  minX = Math.max(0, minX - pad);
  minY = Math.max(0, minY - pad);
  maxX = Math.min(width - 1, maxX + pad);
  maxY = Math.min(height - 1, maxY + pad);

  const cropW = maxX - minX + 1;
  const cropH = maxY - minY + 1;
  const trimmed = document.createElement('canvas');
  trimmed.width = cropW;
  trimmed.height = cropH;
  const tctx = trimmed.getContext('2d');
  if (!tctx) return source;
  tctx.drawImage(source, minX, minY, cropW, cropH, 0, 0, cropW, cropH);
  return trimmed;
}

function parseHexBackground(hex: string): { r: number; g: number; b: number } {
  const normalized = hex.replace('#', '');
  if (normalized.length !== 6) return { r: 2, g: 6, b: 23 };
  return {
    r: parseInt(normalized.slice(0, 2), 16),
    g: parseInt(normalized.slice(2, 4), 16),
    b: parseInt(normalized.slice(4, 6), 16),
  };
}

export async function downloadAchievementCardPng(
  cardEl: HTMLElement,
  achievement: AchievementDef | null | undefined
): Promise<void> {
  const theme = getAchievementCardTheme(achievement);
  const bgColor = achievementCardBackgroundColor(theme);
  await document.fonts.ready;

  const host = document.createElement('div');
  host.setAttribute('aria-hidden', 'true');
  host.style.cssText = [
    'position:fixed',
    'left:-99999px',
    'top:0',
    `width:${EXPORT_CARD_WIDTH_PX}px`,
    'padding:0',
    'margin:0',
    'background:transparent',
    'pointer-events:none',
    'z-index:-1',
  ].join(';');

  const clone = cardEl.cloneNode(true) as HTMLElement;
  prepareAchievementCardClone(clone);
  host.appendChild(clone);
  document.body.appendChild(host);

  try {
    const html2canvas = (await import('html2canvas')).default;
    const height = Math.max(clone.scrollHeight, clone.offsetHeight, 1);
    const canvas = await html2canvas(clone, {
      backgroundColor: bgColor,
      scale: 2,
      useCORS: true,
      logging: false,
      width: EXPORT_CARD_WIDTH_PX,
      height,
      windowWidth: EXPORT_CARD_WIDTH_PX,
      windowHeight: height,
      scrollX: 0,
      scrollY: 0,
      x: 0,
      y: 0,
      onclone: (_doc, clonedEl) => {
        prepareAchievementCardClone(clonedEl);
      },
    });

    const trimmed = trimCanvasToContent(canvas, parseHexBackground(bgColor));
    const slug = (achievement?.id || 'studio-stats').replace(/_/g, '-');
    const link = document.createElement('a');
    link.download = `bar4bar-${slug}.png`;
    link.href = trimmed.toDataURL('image/png');
    link.click();
  } finally {
    host.remove();
  }
}
