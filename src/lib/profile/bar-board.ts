/**
 * The Board — Artist Home module.
 * Maker pins 3–5 real bars; visitors read, share, open a Drop, and leave one short reply under a pin.
 */

export const BOARD_MIN_PINS = 1;
export const BOARD_MAX_PINS = 5;
export const BOARD_REPLY_MAX = 160;

export type BarBoardPin = {
  /** Stable id for replies (survives reorder). */
  id: string;
  text: string;
  shareId?: string;
  sourceLabel?: string;
};

export type BarBoard = {
  pins: BarBoardPin[];
};

function clean(value: unknown, max: number): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  return trimmed.slice(0, max);
}

function pinId(): string {
  return `p_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

/** Normalize Board from featured.barBoard, or migrate legacy theCatch / albumRooms sample bars. */
export function normalizeBarBoard(raw: unknown, legacyCatch?: unknown): BarBoard | undefined {
  const fromBoard = normalizePins((raw as { pins?: unknown } | null)?.pins);
  if (fromBoard?.length) return { pins: fromBoard };

  const catchObj = legacyCatch as { links?: Array<{ text?: string; shareId?: string; sourceLabel?: string }> } | null;
  if (catchObj && Array.isArray(catchObj.links)) {
    const pins: BarBoardPin[] = [];
    for (const link of catchObj.links.slice(0, BOARD_MAX_PINS)) {
      const text = clean(link?.text, 280);
      if (!text) continue;
      const pin: BarBoardPin = { id: pinId(), text };
      const shareId = clean(link?.shareId, 40);
      if (shareId) pin.shareId = shareId;
      const sourceLabel = clean(link?.sourceLabel, 80);
      if (sourceLabel) pin.sourceLabel = sourceLabel;
      pins.push(pin);
    }
    if (pins.length >= BOARD_MIN_PINS) return { pins };
  }

  return undefined;
}

function normalizePins(raw: unknown): BarBoardPin[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const pins: BarBoardPin[] = [];
  for (const entry of raw.slice(0, BOARD_MAX_PINS)) {
    const text = clean((entry as BarBoardPin)?.text, 280);
    if (!text) continue;
    const id = clean((entry as BarBoardPin)?.id, 40) || pinId();
    const pin: BarBoardPin = { id, text };
    const shareId = clean((entry as BarBoardPin)?.shareId, 40);
    if (shareId) pin.shareId = shareId;
    const sourceLabel = clean((entry as BarBoardPin)?.sourceLabel, 80);
    if (sourceLabel) pin.sourceLabel = sourceLabel;
    pins.push(pin);
  }
  return pins.length >= BOARD_MIN_PINS ? pins : undefined;
}

export function createBoardPin(input: {
  text: string;
  shareId?: string;
  sourceLabel?: string;
}): BarBoardPin {
  const text = input.text.trim().slice(0, 280);
  const pin: BarBoardPin = { id: pinId(), text };
  if (input.shareId?.trim()) pin.shareId = input.shareId.trim().slice(0, 40);
  if (input.sourceLabel?.trim()) pin.sourceLabel = input.sourceLabel.trim().slice(0, 80);
  return pin;
}
