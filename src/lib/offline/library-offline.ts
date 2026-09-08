'use client';

import type { DeckPlayable } from '@/lib/drop-library';
import {
  downloadPressedAudioOffline,
  listOfflinePressedAudioKeys,
} from '@/lib/offline/pressed-audio-cache';

const AUTO_DOWNLOAD_PREF_KEY = 'b4b:library-auto-offline:v1';

export function readAutoDownloadPref(userId: string): boolean {
  if (typeof window === 'undefined' || !userId) return true;
  try {
    const raw = localStorage.getItem(`${AUTO_DOWNLOAD_PREF_KEY}:${userId}`);
    if (raw === '0') return false;
    if (raw === '1') return true;
  } catch {
    /* ignore */
  }
  return true;
}

export function writeAutoDownloadPref(userId: string, enabled: boolean): void {
  if (typeof window === 'undefined' || !userId) return;
  try {
    localStorage.setItem(`${AUTO_DOWNLOAD_PREF_KEY}:${userId}`, enabled ? '1' : '0');
  } catch {
    /* ignore */
  }
}

export async function autoDownloadLibraryItem(
  userId: string,
  item: DeckPlayable,
  opts?: { silent?: boolean }
): Promise<boolean> {
  if (!userId) return false;
  if (typeof navigator !== 'undefined' && !navigator.onLine) return false;
  try {
    const existing = await listOfflinePressedAudioKeys(userId);
    if (existing.has(item.key)) return true;
    await downloadPressedAudioOffline(userId, item);
    return true;
  } catch (error) {
    if (!opts?.silent) throw error;
    console.warn('[library-offline] auto-download skipped', item.key, error);
    return false;
  }
}

export async function autoDownloadLibraryItems(
  userId: string,
  items: DeckPlayable[],
  opts?: { silent?: boolean }
): Promise<number> {
  if (!userId || !readAutoDownloadPref(userId)) return 0;
  if (typeof navigator !== 'undefined' && !navigator.onLine) return 0;
  const keys = await listOfflinePressedAudioKeys(userId);
  let saved = 0;
  for (const item of items) {
    if (keys.has(item.key)) continue;
    const ok = await autoDownloadLibraryItem(userId, item, { silent: true });
    if (ok) {
      keys.add(item.key);
      saved += 1;
    }
  }
  return saved;
}
