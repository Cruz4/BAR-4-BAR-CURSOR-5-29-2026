/** Guest demo → signup handoff. Lines written on the landing demo sheet are
 * stashed here and turned into the artist's first track after signup. */

export const DEMO_LINES_KEY = 'b4b-demo-lines';

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
