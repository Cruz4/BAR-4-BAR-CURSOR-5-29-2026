'use client';

import * as React from 'react';

/** True on phones, tablets, and iPad — anywhere hover is not the primary input. */
export function usePrefersTouch(): boolean {
  const [prefersTouch, setPrefersTouch] = React.useState(false);

  React.useEffect(() => {
    const query = window.matchMedia('(hover: none), (pointer: coarse)');
    const update = () => setPrefersTouch(query.matches);
    update();
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);

  return prefersTouch;
}
