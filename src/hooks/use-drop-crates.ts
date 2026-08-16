'use client';

import { useEffect, useState } from 'react';
import { subscribeDropCrates } from '@/lib/drop-crates';
import type { DropCrate } from '@/lib/drop-library';

export function useDropCrates(userId?: string) {
  const [crates, setCrates] = useState<DropCrate[]>([]);
  const [loaded, setLoaded] = useState(!userId);

  useEffect(() => {
    if (!userId) {
      setCrates([]);
      setLoaded(true);
      return;
    }
    setLoaded(false);
    return subscribeDropCrates(userId, (next) => {
      setCrates(next);
      setLoaded(true);
    });
  }, [userId]);

  return { crates, loaded };
}
