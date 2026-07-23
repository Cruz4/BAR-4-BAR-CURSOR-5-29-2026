/** Guest try sheet → signup handoff. Lines written on the guest try sheet are
 *  staged here so the vault can open “My Demo Track” after account creation. */

export const DEMO_LINES_KEY = 'b4b-demo-lines';
const DEMO_HANDOFF_LOCK_KEY = 'b4b-demo-handoff-lock';

export function persistDemoLines(lines: string[]): void {
  if (typeof window === 'undefined') return;
  try {
    const clean = lines.map((l) => l.trim()).filter(Boolean).slice(0, 12);
    if (clean.length > 0) {
      sessionStorage.setItem(DEMO_LINES_KEY, JSON.stringify(clean));
    }
  } catch {
    /* ignore */
  }
}

export function readDemoLines(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = sessionStorage.getItem(DEMO_LINES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((l): l is string => typeof l === 'string' && l.trim().length > 0).slice(0, 12);
  } catch {
    return [];
  }
}

export function clearDemoLines(): void {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.removeItem(DEMO_LINES_KEY);
  } catch {
    /* ignore */
  }
}

/**
 * Atomically claim demo lines for auto-open after signup.
 * Returns null if nothing to hand off or another claim is in flight.
 */
export function claimDemoHandoff(): string[] | null {
  if (typeof window === 'undefined') return null;
  try {
    if (sessionStorage.getItem(DEMO_HANDOFF_LOCK_KEY) === '1') return null;
    const lines = readDemoLines();
    if (lines.length === 0) return null;
    sessionStorage.setItem(DEMO_HANDOFF_LOCK_KEY, '1');
    clearDemoLines();
    return lines;
  } catch {
    return null;
  }
}

export function completeDemoHandoff(): void {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.removeItem(DEMO_HANDOFF_LOCK_KEY);
  } catch {
    /* ignore */
  }
}

/** Restore bars if track creation failed after a claim. */
export function releaseDemoHandoff(lines: string[]): void {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.removeItem(DEMO_HANDOFF_LOCK_KEY);
    persistDemoLines(lines);
  } catch {
    /* ignore */
  }
}
