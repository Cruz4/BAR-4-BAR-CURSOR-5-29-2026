'use client';

import { useCallback, useEffect, useState } from 'react';
import { useTheme } from 'next-themes';
import {
  persistWritingSurfaceMode,
  readWritingSurfaceMode,
  resolveWritingSurface,
  type WritingSurfaceMode,
} from '@/lib/studio-theme';

export function useWritingSurface() {
  const { resolvedTheme } = useTheme();
  const [mode, setModeState] = useState<WritingSurfaceMode>('auto');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setModeState(readWritingSurfaceMode());
    setReady(true);

    const onChange = () => setModeState(readWritingSurfaceMode());
    window.addEventListener('b4b-writing-surface-change', onChange);
    return () => window.removeEventListener('b4b-writing-surface-change', onChange);
  }, []);

  const setMode = useCallback((next: WritingSurfaceMode) => {
    setModeState(next);
    persistWritingSurfaceMode(next);
    window.dispatchEvent(new CustomEvent('b4b-writing-surface-change'));
  }, []);

  const colorTheme = resolvedTheme === 'light' ? 'light' : 'dark';
  const effectiveSurface = resolveWritingSurface(mode, ready ? colorTheme : 'dark');

  return {
    mode,
    setMode,
    ready,
    colorTheme: ready ? colorTheme : undefined,
    effectiveSurface,
    isPaper: effectiveSurface === 'paper',
  };
}
