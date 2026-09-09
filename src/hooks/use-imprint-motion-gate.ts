'use client';

import { useEffect, useRef, useState } from 'react';

/** Pause imprint layer animations when the card is off-screen. */
export function useImprintMotionGate<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  const [motionPaused, setMotionPaused] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        setMotionPaused(!entry?.isIntersecting);
      },
      { root: null, rootMargin: '48px 0px', threshold: 0.08 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return { ref, motionPaused };
}
