'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

const AUDIO_VOLUME_STORAGE_KEY = 'bar4bar:audio-volume';
const AUDIO_VOLUME_EVENT = 'bar4bar:audio-volume-change';
const DEFAULT_VOLUME = 1;
const DEFAULT_UNMUTE_VOLUME = 0.8;

function clampVolume(value: number): number {
  if (!Number.isFinite(value)) return DEFAULT_VOLUME;
  return Math.min(1, Math.max(0, value));
}

function readSavedVolume(): number {
  if (typeof window === 'undefined') return DEFAULT_VOLUME;
  try {
    const stored = window.localStorage.getItem(AUDIO_VOLUME_STORAGE_KEY);
    return stored === null ? DEFAULT_VOLUME : clampVolume(Number(stored));
  } catch {
    return DEFAULT_VOLUME;
  }
}

function publishVolume(volume: number): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(AUDIO_VOLUME_STORAGE_KEY, String(volume));
  } catch {
    /* Playback still updates when browser storage is unavailable. */
  }
  window.dispatchEvent(new CustomEvent<number>(AUDIO_VOLUME_EVENT, { detail: volume }));
}

export function useAudioVolume() {
  const [volume, setVolumeState] = useState(DEFAULT_VOLUME);
  const lastAudibleVolumeRef = useRef(DEFAULT_UNMUTE_VOLUME);

  useEffect(() => {
    const saved = readSavedVolume();
    setVolumeState(saved);
    if (saved > 0) lastAudibleVolumeRef.current = saved;

    const onVolumeChange = (event: Event) => {
      const next = clampVolume((event as CustomEvent<number>).detail);
      setVolumeState(next);
      if (next > 0) lastAudibleVolumeRef.current = next;
    };
    const onStorage = (event: StorageEvent) => {
      if (event.key !== AUDIO_VOLUME_STORAGE_KEY || event.newValue === null) return;
      const next = clampVolume(Number(event.newValue));
      setVolumeState(next);
      if (next > 0) lastAudibleVolumeRef.current = next;
    };

    window.addEventListener(AUDIO_VOLUME_EVENT, onVolumeChange);
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener(AUDIO_VOLUME_EVENT, onVolumeChange);
      window.removeEventListener('storage', onStorage);
    };
  }, []);

  const setVolume = useCallback((value: number) => {
    const next = clampVolume(value);
    setVolumeState(next);
    if (next > 0) lastAudibleVolumeRef.current = next;
    publishVolume(next);
  }, []);

  const toggleMute = useCallback(() => {
    const next = volume > 0 ? 0 : lastAudibleVolumeRef.current || DEFAULT_UNMUTE_VOLUME;
    setVolumeState(next);
    publishVolume(next);
  }, [volume]);

  return {
    volume,
    muted: volume === 0,
    setVolume,
    toggleMute,
  };
}
