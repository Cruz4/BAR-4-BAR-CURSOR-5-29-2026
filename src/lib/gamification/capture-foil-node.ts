/**
 * Shared foil capture for feed JPEG + PNG download.
 * On-screen matte frame + modern-screenshot — tight padding, full card, no crop.
 */

import { domToCanvas } from 'modern-screenshot';

export const FOIL_EXPORT_WIDTH_PX = 400;
export const FOIL_EXPORT_MATTE_PX = 8;
export const FOIL_EXPORT_MATTE_COLOR = '#0b1220';
export const FOIL_FEED_IMAGE_MAX_CHARS = 700_000;

export type CaptureFoilOptions = {
  width?: number;
  mattePx?: number;
  backgroundColor?: string;
  prepare?: (clone: HTMLElement) => void;
};

function applyBaseCloneStyles(clone: HTMLElement, width: number) {
  clone.style.width = `${width}px`;
  clone.style.maxWidth = `${width}px`;
  clone.style.minWidth = `${width}px`;
  clone.style.margin = '0';
  clone.style.boxSizing = 'border-box';
  clone.style.overflow = 'hidden';
  clone.style.height = 'auto';
  clone.style.maxHeight = 'none';
  clone.style.transform = 'none';
  clone.style.boxShadow = 'none';
  clone.style.filter = 'none';
  clone.style.borderRadius = '16px';

  clone.querySelectorAll<HTMLElement>('*').forEach((el) => {
    el.style.maxHeight = 'none';
  });

  // Keep natural card padding — do not inflate bottom padding for capture.
  clone
    .querySelectorAll<HTMLElement>(
      '[data-achievement-inner], [data-standing-inner], [data-goal-inner]'
    )
    .forEach((inner) => {
      inner.style.boxSizing = 'border-box';
    });
}

/**
 * Capture a foil card DOM node to a canvas (full height, slim matte).
 */
export async function captureFoilNodeToCanvas(
  source: HTMLElement,
  options: CaptureFoilOptions = {}
): Promise<HTMLCanvasElement> {
  const width = options.width ?? FOIL_EXPORT_WIDTH_PX;
  const mattePx = options.mattePx ?? FOIL_EXPORT_MATTE_PX;
  const backgroundColor = options.backgroundColor ?? FOIL_EXPORT_MATTE_COLOR;
  const frameWidth = width + mattePx * 2;

  await document.fonts.ready;

  const host = document.createElement('div');
  host.setAttribute('aria-hidden', 'true');
  host.setAttribute('data-foil-capture-host', 'true');
  host.style.cssText = [
    'position:fixed',
    'left:0',
    'top:0',
    `width:${frameWidth}px`,
    `padding:${mattePx}px`,
    'margin:0',
    'box-sizing:border-box',
    `background:${backgroundColor}`,
    'pointer-events:none',
    'z-index:2147483646',
    'opacity:0.04',
    'overflow:visible',
  ].join(';');

  const clone = source.cloneNode(true) as HTMLElement;
  applyBaseCloneStyles(clone, width);
  options.prepare?.(clone);
  host.appendChild(clone);
  document.body.appendChild(host);

  void host.offsetHeight;
  await new Promise<void>((resolve) =>
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
  );
  await new Promise((r) => setTimeout(r, 120));

  try {
    return await domToCanvas(host, {
      scale: 2,
      backgroundColor,
      style: {
        opacity: '1',
        transform: 'none',
      },
    });
  } finally {
    host.remove();
  }
}

export function canvasToFeedJpegDataUrl(canvas: HTMLCanvasElement): string {
  let quality = 0.9;
  let dataUrl = canvas.toDataURL('image/jpeg', quality);
  while (dataUrl.length > FOIL_FEED_IMAGE_MAX_CHARS && quality > 0.45) {
    quality -= 0.08;
    dataUrl = canvas.toDataURL('image/jpeg', quality);
  }
  if (dataUrl.length > FOIL_FEED_IMAGE_MAX_CHARS) {
    throw new Error('Foil card image is too large to post — try Download PNG instead.');
  }
  return dataUrl;
}

export function downloadCanvasPng(canvas: HTMLCanvasElement, filename: string) {
  const link = document.createElement('a');
  link.download = filename;
  link.href = canvas.toDataURL('image/png');
  link.click();
}
