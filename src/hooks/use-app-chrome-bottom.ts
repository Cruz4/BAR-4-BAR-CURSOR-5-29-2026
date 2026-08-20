'use client';

import { useEffect, useState } from 'react';

/** Sum layout heights of the sticky header + top banners (scroll-stable). */
function measureAppChromeStackHeight(paddingPx: number): number {
  let total = 0;
  document.querySelectorAll('[data-app-header], [data-app-chrome]').forEach((node) => {
    const el = node as HTMLElement;
    if (el.offsetHeight > 4) total += el.offsetHeight;
  });
  return Math.max(56, total) + paddingPx;
}

/**
 * Minimum Y (px from viewport top) for sky bodies so they sit below header/banners.
 * Uses layout height — not getBoundingClientRect — so scroll does not jitter position.
 */
export function useAppChromeBottom(paddingPx = 12): number {
  const [bottom, setBottom] = useState(56 + paddingPx);

  useEffect(() => {
    let debounceTimer = 0;
    const measure = () => {
      window.clearTimeout(debounceTimer);
      debounceTimer = window.setTimeout(() => {
        setBottom(measureAppChromeStackHeight(paddingPx));
      }, 120);
    };

    measure();
    const ro = new ResizeObserver(measure);
    document.querySelectorAll('[data-app-header], [data-app-chrome]').forEach((node) => {
      ro.observe(node);
    });
    const mo = new MutationObserver(measure);
    mo.observe(document.body, { childList: true, subtree: true });
    window.addEventListener('resize', measure);
    return () => {
      window.clearTimeout(debounceTimer);
      ro.disconnect();
      mo.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, [paddingPx]);

  return bottom;
}
