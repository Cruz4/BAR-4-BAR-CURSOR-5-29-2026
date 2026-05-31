import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import type { Direction, Track } from "./types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Remove undefined values so Firestore set()/batch.set() does not reject documents. */
export function stripForFirestore<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

export function mergeDirection(album?: Direction, track?: Track["direction"]): Direction {
  const a = album ?? {};
  const t = track ?? { inheritFromAlbum: true };
  const useAlbum = t.inheritFromAlbum !== false;
  return {
    setting_world : t.setting_world  ?? (useAlbum ? a.setting_world  : "") ?? "",
    emotion_core  : t.emotion_core   ?? (useAlbum ? a.emotion_core   : "") ?? "",
    trigger_moment: t.trigger_moment ?? (useAlbum ? a.trigger_moment : "") ?? "",
    message_truth : t.message_truth  ?? (useAlbum ? a.message_truth  : "") ?? "",
    tone_palette  : t.tone_palette   ?? (useAlbum ? a.tone_palette   : "") ?? "",
  };
}

export function hasDirectionContent(d?: Partial<Direction> | null): boolean {
  if (!d) return false;
  return Boolean(
    d.setting_world?.trim() ||
      d.emotion_core?.trim() ||
      d.trigger_moment?.trim() ||
      d.message_truth?.trim() ||
      d.tone_palette?.trim()
  );
}

/** Calibration Hub: merge album + track DNA per Inherit Album / Track DNA toggles. */
export function resolveWorkstationDirection(
  inheritAlbum: boolean,
  inheritTrack: boolean,
  albumDirection?: Direction,
  hubDirection: Partial<Direction> = {}
): Direction {
  const album = inheritAlbum ? (albumDirection ?? {}) : {};
  if (inheritTrack) {
    return mergeDirection(album, { ...hubDirection, inheritFromAlbum: inheritAlbum });
  }
  if (inheritAlbum) {
    return mergeDirection(album, { inheritFromAlbum: true });
  }
  return mergeDirection({}, { inheritFromAlbum: false, ...hubDirection });
}
