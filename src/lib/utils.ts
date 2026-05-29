import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import type { Direction, Track } from "./types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
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
