import type { VoiceNote } from '@/lib/profile/voice-notes';
import { extForVoiceType, parseVoiceNote } from '@/lib/profile/voice-notes';

/** Long enough for a verse/hook run-through without filling the track with audio. */
export const SHEET_TAKE_MAX_SECONDS = 5 * 60;
export const SHEET_TAKE_MAX_COUNT = 3;
export const SHEET_TAKE_MAX_BYTES = 12 * 1024 * 1024;

export type SheetTake = VoiceNote & {
  id: string;
  createdAt: string;
  label: string;
};

export function createSheetTakeId(): string {
  return `take-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

export function sheetTakeStoragePath(
  userId: string,
  trackId: string,
  takeId: string,
  contentType: string
): string {
  return `sheet-takes/${userId}/${trackId}/${takeId}.${extForVoiceType(contentType)}`;
}

export function parseSheetTake(raw: unknown): SheetTake | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const data = raw as Record<string, unknown>;
  const note = parseVoiceNote(data);
  if (!note) return undefined;
  const id = typeof data.id === 'string' && data.id.trim() ? data.id.trim() : '';
  if (!id) return undefined;
  const createdAt =
    typeof data.createdAt === 'string' && data.createdAt.trim()
      ? data.createdAt
      : new Date().toISOString();
  const label =
    typeof data.label === 'string' && data.label.trim()
      ? data.label.trim().slice(0, 48)
      : 'Take';
  return { ...note, id, createdAt, label };
}

export function parseSheetTakes(raw: unknown): SheetTake[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map(parseSheetTake)
    .filter((take): take is SheetTake => Boolean(take))
    .slice(0, SHEET_TAKE_MAX_COUNT);
}

export function nextSheetTakeLabel(existing: SheetTake[]): string {
  const used = new Set(
    existing.map((take) => {
      const m = /^Take\s+(\d+)$/i.exec(take.label.trim());
      return m ? Number(m[1]) : 0;
    })
  );
  let n = existing.length + 1;
  while (used.has(n)) n += 1;
  return `Take ${n}`;
}
