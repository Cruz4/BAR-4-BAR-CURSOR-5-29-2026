const TIPS_SHOWN_PREFIX = 'b4b_studio_tip_shown:';
const TRACK_VISIT_PREFIX = 'b4b_track_visit:';
const LAST_TRACK_PATH_KEY = 'b4b_last_track_path';
export const LAST_WORKED_TRACK_KEY = 'b4b_last_worked_track';
export const STUDIO_TIPS_ENABLED_KEY = 'b4b_show_tips';

export function isTrackEditorPath(pathname: string): boolean {
  return /^\/albums\/[^/]+\/tracks\/[^/]+$/.test(pathname);
}

export function persistLastWorkedTrack(pathname: string): void {
  if (typeof window === 'undefined' || !isTrackEditorPath(pathname)) return;
  try {
    localStorage.setItem(LAST_WORKED_TRACK_KEY, pathname);
  } catch {
    /* ignore */
  }
}

export function getLastWorkedTrackPath(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const path = localStorage.getItem(LAST_WORKED_TRACK_KEY);
    return path && isTrackEditorPath(path) ? path : null;
  } catch {
    return null;
  }
}

/** Bump visit count when navigating onto a track sheet (not on re-renders). */
export function recordTrackSheetEntry(pathname: string): number {
  if (typeof window === 'undefined' || !isTrackEditorPath(pathname)) return 0;
  try {
    const lastSeen = sessionStorage.getItem(LAST_TRACK_PATH_KEY);
    const visitKey = `${TRACK_VISIT_PREFIX}${pathname}`;
    const visits = parseInt(sessionStorage.getItem(visitKey) || '0', 10);
    if (lastSeen === pathname) return visits;
    const next = visits + 1;
    sessionStorage.setItem(visitKey, String(next));
    sessionStorage.setItem(LAST_TRACK_PATH_KEY, pathname);
    persistLastWorkedTrack(pathname);
    try {
      void import('@/lib/activity/client').then((m) => m.persistCraftResume(pathname));
    } catch {
      /* ignore */
    }
    return next;
  } catch {
    return 0;
  }
}

export function clearTrackSheetNavigation(pathname: string): void {
  if (typeof window === 'undefined') return;
  try {
    if (!isTrackEditorPath(pathname)) {
      sessionStorage.removeItem(LAST_TRACK_PATH_KEY);
    }
  } catch {
    /* ignore */
  }
}

export function getTrackSheetVisitCount(pathname: string): number {
  if (typeof window === 'undefined') return 0;
  try {
    return parseInt(sessionStorage.getItem(`${TRACK_VISIT_PREFIX}${pathname}`) || '0', 10);
  } catch {
    return 0;
  }
}

export function hasTipBeenShownThisSession(path: string): boolean {
  try {
    return sessionStorage.getItem(`${TIPS_SHOWN_PREFIX}${path}`) === '1';
  } catch {
    return false;
  }
}

export function markTipShownThisSession(path: string): void {
  try {
    sessionStorage.setItem(`${TIPS_SHOWN_PREFIX}${path}`, '1');
  } catch {
    /* ignore */
  }
}

export function areStudioTipsEnabled(): boolean {
  if (typeof window === 'undefined') return true;
  try {
    return localStorage.getItem(STUDIO_TIPS_ENABLED_KEY) !== 'false';
  } catch {
    return true;
  }
}

export function setStudioTipsEnabled(enabled: boolean): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STUDIO_TIPS_ENABLED_KEY, String(enabled));
  } catch {
    /* ignore */
  }
}
