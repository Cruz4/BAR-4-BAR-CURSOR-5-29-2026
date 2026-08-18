'use client';

import React, { useEffect, useRef } from 'react';

/** Loads the next chunk when this marker nears the viewport. */
export function InfiniteFeedSentinel({
  disabled,
  onVisible,
}: {
  disabled?: boolean;
  onVisible: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (disabled) return;
    const el = ref.current;
    if (!el) return;

    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) onVisible();
      },
      { root: null, rootMargin: '480px 0px', threshold: 0 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [disabled, onVisible]);

  if (disabled) return null;
  return <div ref={ref} className="h-px w-full" aria-hidden />;
}
