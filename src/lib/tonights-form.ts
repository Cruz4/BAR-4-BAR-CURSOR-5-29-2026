/**
 * Tonight's Form — communal 16-bar sheet on The Scene (one bar per writer per night).
 * Night window uses Eastern time (Scene default): 6 PM → 6 AM, freezes at sunrise.
 */

export const TONIGHTS_FORM_SLOT_COUNT = 16;
export const TONIGHTS_FORM_TZ = 'America/New_York';
/** Night opens 6 PM Eastern. */
export const TONIGHTS_FORM_NIGHT_START_HOUR = 18;
/** Form freezes at 6 AM Eastern (sunrise window). */
export const TONIGHTS_FORM_NIGHT_END_HOUR = 6;
export const TONIGHTS_FORM_MAX_BAR_CHARS = 280;

export type TonightsFormSlotKind = 'writer' | 'house_seed';

export type TonightsFormSlot = {
  slot: number;
  barText: string;
  displayName: string;
  profileSlug?: string;
  userId?: string;
  kind: TonightsFormSlotKind;
  claimedAt: string;
};

export type TonightsFormPublicConfig = {
  enabled: boolean;
  /** When on, slot 1 opens with today's House bar seed (if House bar is enabled). */
  seedHouseBar: boolean;
  updatedAt: string | null;
};

export type TonightsFormAdminConfig = TonightsFormPublicConfig & {
  updatedBy: string | null;
};

export type TonightsFormPublic = {
  enabled: boolean;
  nightKey: string;
  label: string;
  /** Accepting new claims right now. */
  active: boolean;
  frozen: boolean;
  slots: Array<TonightsFormSlot | null>;
  filledCount: number;
  yourSlot: number | null;
};

export type TonightsFormArchiveEntry = {
  nightKey: string;
  label: string;
  frozenAt: string | null;
  filledCount: number;
};

export const DEFAULT_TONIGHTS_FORM_CONFIG: TonightsFormPublicConfig = {
  enabled: false,
  seedHouseBar: true,
  updatedAt: null,
};

type EasternParts = { year: string; month: string; day: string; hour: number };

function easternParts(now: Date): EasternParts {
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: TONIGHTS_FORM_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    hour12: false,
  });
  const parts: Record<string, string> = {};
  for (const p of fmt.formatToParts(now)) {
    if (p.type !== 'literal') parts[p.type] = p.value;
  }
  return {
    year: parts.year ?? '1970',
    month: parts.month ?? '01',
    day: parts.day ?? '01',
    hour: parseInt(parts.hour ?? '0', 10),
  };
}

function dateKey(parts: Pick<EasternParts, 'year' | 'month' | 'day'>): string {
  return `${parts.year}-${parts.month}-${parts.day}`;
}

/** Shift a calendar day in Eastern time (returns YYYY-MM-DD). */
export function shiftEasternDateKey(now: Date, deltaDays: number): string {
  const { year, month, day } = easternParts(now);
  const noonUtc = Date.UTC(parseInt(year, 10), parseInt(month, 10) - 1, parseInt(day, 10) + deltaDays, 12);
  const shifted = new Date(noonUtc);
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: TONIGHTS_FORM_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return fmt.format(shifted);
}

export function resolveTonightsFormClock(now = new Date()): {
  nightKey: string;
  active: boolean;
} {
  const parts = easternParts(now);
  const today = dateKey(parts);

  if (parts.hour >= TONIGHTS_FORM_NIGHT_START_HOUR) {
    return { nightKey: today, active: true };
  }
  if (parts.hour < TONIGHTS_FORM_NIGHT_END_HOUR) {
    return { nightKey: shiftEasternDateKey(now, -1), active: true };
  }
  return { nightKey: shiftEasternDateKey(now, -1), active: false };
}

export function formatTonightsFormLabel(nightKey: string): string {
  const [y, m, d] = nightKey.split('-').map((v) => parseInt(v, 10));
  if (!y || !m || !d) return `Form of ${nightKey}`;
  const dt = new Date(Date.UTC(y, m - 1, d, 12));
  const label = dt.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  });
  return `Form of ${label}`;
}

export function clampTonightsFormBar(raw: string): string {
  return raw.trim().replace(/\s+/g, ' ').slice(0, TONIGHTS_FORM_MAX_BAR_CHARS);
}

export function isValidTonightsFormSlot(slot: number): boolean {
  return Number.isInteger(slot) && slot >= 1 && slot <= TONIGHTS_FORM_SLOT_COUNT;
}

export function emptyTonightsFormSlots(): Array<TonightsFormSlot | null> {
  return Array.from({ length: TONIGHTS_FORM_SLOT_COUNT }, () => null);
}
