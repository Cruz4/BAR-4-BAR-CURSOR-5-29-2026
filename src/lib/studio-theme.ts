/** Track lyric / edit sheet — not album hub, not Perform. */
export function isTrackLyricSheetPath(pathname: string | null | undefined): boolean {
  if (!pathname) return false;
  const path = pathname.split('?')[0];
  return /^\/albums\/[^/]+\/tracks\/[^/]+\/?$/.test(path);
}

export type WritingSurfaceMode = 'auto' | 'paper' | 'studio';

export const WRITING_SURFACE_STORAGE_KEY = 'b4b-writing-surface';

export const WRITING_SURFACE_LABELS: Record<WritingSurfaceMode, string> = {
  auto: 'Auto (paper in light mode)',
  paper: 'Paper (high contrast)',
  studio: 'Studio panel',
};

export function isWritingSurfaceMode(value: string | null | undefined): value is WritingSurfaceMode {
  return value === 'auto' || value === 'paper' || value === 'studio';
}

export function readWritingSurfaceMode(): WritingSurfaceMode {
  if (typeof window === 'undefined') return 'auto';
  try {
    const stored = localStorage.getItem(WRITING_SURFACE_STORAGE_KEY);
    return isWritingSurfaceMode(stored) ? stored : 'auto';
  } catch {
    return 'auto';
  }
}

export function persistWritingSurfaceMode(mode: WritingSurfaceMode): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(WRITING_SURFACE_STORAGE_KEY, mode);
  } catch {
    /* ignore */
  }
}

/** Resolve effective surface for lyrics sheet. */
export function resolveWritingSurface(
  mode: WritingSurfaceMode,
  colorTheme: 'light' | 'dark' | undefined
): 'paper' | 'studio' {
  if (mode === 'paper') return 'paper';
  if (mode === 'studio') return 'studio';
  return colorTheme === 'light' ? 'paper' : 'studio';
}
