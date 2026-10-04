'use client';

import { useEffect, useState } from 'react';

export type VisualViewportMetrics = {
  /** Pixels between the layout viewport bottom and the visible viewport bottom (mobile keyboard). */
  keyboardInset: number;
  /** Visible viewport height in CSS pixels. */
  visualHeight: number;
};

/** Pixels between the layout viewport bottom and the visible viewport bottom (mobile keyboard). */
export function useVisualViewportKeyboardInset(): number {
  return useVisualViewportMetrics().keyboardInset;
}

export function useVisualViewportMetrics(): VisualViewportMetrics {
  const [metrics, setMetrics] = useState<VisualViewportMetrics>({
    keyboardInset: 0,
    visualHeight: 0,
  });

  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;

    const update = () => {
      const keyboard = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
      setMetrics({
        keyboardInset: Math.round(keyboard),
        visualHeight: Math.round(vv.height),
      });
    };

    update();
    vv.addEventListener('resize', update);
    vv.addEventListener('scroll', update);
    window.addEventListener('resize', update);

    return () => {
      vv.removeEventListener('resize', update);
      vv.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
    };
  }, []);

  return metrics;
}
