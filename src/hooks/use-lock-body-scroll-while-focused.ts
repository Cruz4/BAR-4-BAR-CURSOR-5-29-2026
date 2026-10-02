'use client';

import { useEffect, useRef, type RefObject } from 'react';

/**
 * Prevents the page behind a fixed dock from jumping when inputs focus (mobile keyboards).
 */
export function useLockBodyScrollWhileFocused(
  containerRef: RefObject<HTMLElement | null>,
  enabled: boolean
) {
  const scrollYRef = useRef(0);
  const lockedRef = useRef(false);

  useEffect(() => {
    if (!enabled) return;
    const el = containerRef.current;
    if (!el) return;

    const unlock = () => {
      if (!lockedRef.current) return;
      lockedRef.current = false;
      const y = scrollYRef.current;
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.left = '';
      document.body.style.right = '';
      document.body.style.width = '';
      document.body.style.overflow = '';
      window.scrollTo(0, y);
    };

    const onFocusIn = (e: FocusEvent) => {
      const target = e.target;
      if (!(target instanceof Node) || !el.contains(target)) return;
      if (lockedRef.current) return;
      lockedRef.current = true;
      scrollYRef.current = window.scrollY;
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollYRef.current}px`;
      document.body.style.left = '0';
      document.body.style.right = '0';
      document.body.style.width = '100%';
      document.body.style.overflow = 'hidden';
    };

    const onFocusOut = (e: FocusEvent) => {
      const target = e.target;
      if (!(target instanceof Node) || !el.contains(target)) return;
      const next = e.relatedTarget;
      if (next instanceof Node && el.contains(next)) return;
      window.setTimeout(unlock, 0);
    };

    el.addEventListener('focusin', onFocusIn);
    el.addEventListener('focusout', onFocusOut);

    return () => {
      el.removeEventListener('focusin', onFocusIn);
      el.removeEventListener('focusout', onFocusOut);
      unlock();
    };
  }, [enabled, containerRef]);
}
