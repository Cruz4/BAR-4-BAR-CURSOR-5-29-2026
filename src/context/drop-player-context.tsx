'use client';

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { auth } from '@/lib/firebase/client/firebase';
import { useToast } from '@/hooks/use-toast';
import { useAudioVolume } from '@/hooks/use-audio-volume';
import { recordDropListenProgressClient, recordDropSpinClient } from '@/lib/drop-pulse-client';
import type { DeckPlayable } from '@/lib/drop-library';
import { DROP_LISTEN_MILESTONES, type DropListenMilestone } from '@/lib/drop-listen-analytics';

export type DropRepeatMode = 'off' | 'all' | 'one';

type DropPlayerContextValue = {
  current: DeckPlayable | null;
  playing: boolean;
  loading: boolean;
  elapsed: number;
  duration: number;
  volume: number;
  repeat: DropRepeatMode;
  queue: DeckPlayable[];
  analyser: AnalyserNode | null;
  setQueue: (next: DeckPlayable[]) => void;
  setRepeat: (next: DropRepeatMode | ((prev: DropRepeatMode) => DropRepeatMode)) => void;
  loadAndPlay: (item: DeckPlayable, autoplay?: boolean) => Promise<void>;
  togglePlay: () => void;
  skipNext: () => void;
  prev: () => void;
  seek: (value: number) => void;
  setVolume: (value: number) => void;
  toggleMute: () => void;
  stop: () => void;
};

const DropPlayerContext = createContext<DropPlayerContextValue | null>(null);

async function authHeaders(): Promise<HeadersInit> {
  const user = auth.currentUser;
  const headers: HeadersInit = { 'Content-Type': 'application/json' };
  if (!user) return headers;
  const token = await user.getIdToken();
  return { ...headers, Authorization: `Bearer ${token}` };
}

function mediaArtwork(url?: string): MediaImage[] | undefined {
  if (!url || !/^https?:\/\//i.test(url)) return undefined;
  return [{ src: url, sizes: '512x512', type: 'image/jpeg' }];
}

export function DropPlayerProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();
  const { volume, setVolume, toggleMute } = useAudioVolume();
  const audioRef = useRef<HTMLAudioElement>(null);
  const queueRef = useRef<DeckPlayable[]>([]);
  const currentRef = useRef<DeckPlayable | null>(null);
  const repeatRef = useRef<DropRepeatMode>('off');
  const userPausedRef = useRef(false);
  const wantPlayingRef = useRef(false);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const listenProofRef = useRef('');
  const eligibleDurationRef = useRef(30);
  const reportedMilestonesRef = useRef<Set<DropListenMilestone>>(new Set());

  const [queue, setQueueState] = useState<DeckPlayable[]>([]);
  const [current, setCurrent] = useState<DeckPlayable | null>(null);
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [duration, setDuration] = useState(0);
  const [repeat, setRepeatState] = useState<DropRepeatMode>('off');
  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null);

  const ensureAnalyser = useCallback(() => {
    if (analyserRef.current) {
      void audioCtxRef.current?.resume().catch(() => undefined);
      return analyserRef.current;
    }
    const audio = audioRef.current;
    if (!audio || typeof window === 'undefined') return null;
    const AC =
      window.AudioContext ||
      (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    try {
      audio.crossOrigin = 'anonymous';
      const ctx = new AC();
      const source = ctx.createMediaElementSource(audio);
      const node = ctx.createAnalyser();
      // Enough frequency resolution for visibly distinct sub, bass, mid,
      // presence, and air movement without making the shared visualizers heavy.
      node.fftSize = 1024;
      node.smoothingTimeConstant = 0.52;
      node.minDecibels = -90;
      node.maxDecibels = -20;
      source.connect(node);
      node.connect(ctx.destination);
      audioCtxRef.current = ctx;
      analyserRef.current = node;
      setAnalyser(node);
      void ctx.resume().catch(() => undefined);
      return node;
    } catch {
      return null;
    }
  }, []);

  queueRef.current = queue;
  currentRef.current = current;
  repeatRef.current = repeat;

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.setAttribute('playsinline', 'true');
    audio.setAttribute('webkit-playsinline', 'true');
  }, []);

  useEffect(() => {
    const audio = audioRef.current;
    if (audio) audio.volume = volume;
  }, [volume]);

  const setQueue = useCallback((next: DeckPlayable[]) => {
    queueRef.current = next;
    setQueueState(next);
  }, []);

  const setRepeat = useCallback(
    (next: DropRepeatMode | ((prev: DropRepeatMode) => DropRepeatMode)) => {
      setRepeatState((prev) => {
        const value = typeof next === 'function' ? next(prev) : next;
        repeatRef.current = value;
        return value;
      });
    },
    []
  );

  const loadAndPlay = useCallback(
    async (item: DeckPlayable, autoplay = true) => {
      const audio = audioRef.current;
      if (!audio) return;
      setCurrent(item);
      currentRef.current = item;
      setLoading(true);
      userPausedRef.current = false;
      try {
        const headers = await authHeaders();
        const qs = new URLSearchParams({ shareId: item.shareId });
        if (item.trackId) qs.set('trackId', item.trackId);
        const res = await fetch(`/api/drops/audio?${qs.toString()}`, { headers });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Could not load this drop.');
        audio.crossOrigin = 'anonymous';
        audio.src = data.url;
        listenProofRef.current = typeof data.listenProof === 'string' ? data.listenProof : '';
        eligibleDurationRef.current = Math.max(1, Number(data.eligibleDurationSec) || 30);
        reportedMilestonesRef.current = new Set();
        audio.load();
        if (autoplay) {
          wantPlayingRef.current = true;
          ensureAnalyser();
          await audio.play();
          setPlaying(true);
          recordDropSpinClient(item.shareId, data.full ? 'play' : 'preview');
        }
      } catch (e: unknown) {
        wantPlayingRef.current = false;
        setPlaying(false);
        toast({
          variant: 'destructive',
          title: 'Could not play',
          description: e instanceof Error ? e.message : undefined,
        });
      } finally {
        setLoading(false);
      }
    },
    [toast, ensureAnalyser]
  );

  const loadAndPlayRef = useRef(loadAndPlay);
  loadAndPlayRef.current = loadAndPlay;

  const playIndex = useCallback((index: number) => {
    const item = queueRef.current[index];
    if (item) void loadAndPlayRef.current(item);
  }, []);

  const skipNext = useCallback(() => {
    const list = queueRef.current;
    if (list.length === 0) return;
    const key = currentRef.current?.key;
    const currentIndex = key ? list.findIndex((item) => item.key === key) : -1;
    const i = currentIndex < 0 ? 0 : currentIndex + 1;
    if (i >= list.length) {
      if (repeatRef.current !== 'off') playIndex(0);
      else {
        wantPlayingRef.current = false;
        setPlaying(false);
      }
      return;
    }
    playIndex(i);
  }, [playIndex]);

  const prev = useCallback(() => {
    const audio = audioRef.current;
    if (audio && audio.currentTime > 3) {
      audio.currentTime = 0;
      return;
    }
    const list = queueRef.current;
    if (list.length === 0) return;
    const key = currentRef.current?.key;
    const currentIndex = key ? list.findIndex((item) => item.key === key) : 0;
    const i = currentIndex <= 0 ? list.length - 1 : currentIndex - 1;
    playIndex(i);
  }, [playIndex]);

  const togglePlay = useCallback(() => {
    const audio = audioRef.current;
    if (!currentRef.current) {
      const first = queueRef.current[0];
      if (first) void loadAndPlayRef.current(first);
      return;
    }
    if (!audio?.src) {
      void loadAndPlayRef.current(currentRef.current);
      return;
    }
    if (audio.paused) {
      userPausedRef.current = false;
      wantPlayingRef.current = true;
      ensureAnalyser();
      void audio.play().then(() => setPlaying(true));
    } else {
      userPausedRef.current = true;
      wantPlayingRef.current = false;
      audio.pause();
      setPlaying(false);
    }
  }, [ensureAnalyser]);

  const seek = useCallback((value: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = value;
    setElapsed(value);
  }, []);

  const stop = useCallback(() => {
    const audio = audioRef.current;
    if (audio) {
      userPausedRef.current = true;
      wantPlayingRef.current = false;
      audio.pause();
      audio.currentTime = 0;
      audio.removeAttribute('src');
      audio.load();
    }
    setPlaying(false);
    setLoading(false);
    setElapsed(0);
    setDuration(0);
    setCurrent(null);
    currentRef.current = null;
  }, []);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onTime = () => {
      setElapsed(audio.currentTime || 0);
      if (Number.isFinite(audio.duration) && audio.duration > 0) setDuration(audio.duration);
      const item = currentRef.current;
      const proof = listenProofRef.current;
      const progressDuration = Math.max(
        1,
        Math.min(
          eligibleDurationRef.current,
          Number.isFinite(audio.duration) && audio.duration > 0
            ? audio.duration
            : eligibleDurationRef.current
        )
      );
      if (item && proof) {
        for (const milestone of DROP_LISTEN_MILESTONES) {
          if (
            !reportedMilestonesRef.current.has(milestone) &&
            audio.currentTime >= progressDuration * (milestone / 100)
          ) {
            reportedMilestonesRef.current.add(milestone);
            void recordDropListenProgressClient({
              shareId: item.shareId,
              listenProof: proof,
              milestone,
              source: 'library',
            }).then((recorded) => {
              if (!recorded) reportedMilestonesRef.current.delete(milestone);
            });
          }
        }
      }
      if (typeof navigator !== 'undefined' && navigator.mediaSession && Number.isFinite(audio.duration)) {
        try {
          navigator.mediaSession.setPositionState({
            duration: audio.duration,
            playbackRate: audio.playbackRate || 1,
            position: audio.currentTime || 0,
          });
        } catch {
          /* older Safari */
        }
      }
    };
    const onEnded = () => {
      if (repeatRef.current === 'one' && currentRef.current) {
        audio.currentTime = 0;
        wantPlayingRef.current = true;
        void audio.play();
        setPlaying(true);
        return;
      }
      skipNext();
    };
    const onPause = () => {
      setPlaying(false);
      if (
        !userPausedRef.current &&
        wantPlayingRef.current &&
        typeof document !== 'undefined' &&
        document.hidden
      ) {
        void audio.play().catch(() => undefined);
      }
    };
    const onPlay = () => {
      setPlaying(true);
      wantPlayingRef.current = true;
      ensureAnalyser();
    };

    audio.addEventListener('timeupdate', onTime);
    audio.addEventListener('durationchange', onTime);
    audio.addEventListener('ended', onEnded);
    audio.addEventListener('pause', onPause);
    audio.addEventListener('play', onPlay);
    return () => {
      audio.removeEventListener('timeupdate', onTime);
      audio.removeEventListener('durationchange', onTime);
      audio.removeEventListener('ended', onEnded);
      audio.removeEventListener('pause', onPause);
      audio.removeEventListener('play', onPlay);
    };
  }, [skipNext, ensureAnalyser]);

  useEffect(() => {
    if (typeof navigator === 'undefined' || !('mediaSession' in navigator)) return;
    const session = navigator.mediaSession;
    session.playbackState = playing ? 'playing' : current ? 'paused' : 'none';
    if (!current) {
      session.metadata = null;
      return;
    }
    session.metadata = new MediaMetadata({
      title: current.title,
      artist: current.artistName,
      album: current.albumTitle || 'Bar 4 Bar First Drops',
      artwork: mediaArtwork(current.coverArtUrl),
    });
    const bind = (action: MediaSessionAction, handler: MediaSessionActionHandler | null) => {
      try {
        session.setActionHandler(action, handler);
      } catch {
        /* unsupported */
      }
    };
    bind('play', () => {
      userPausedRef.current = false;
      wantPlayingRef.current = true;
      const el = audioRef.current;
      ensureAnalyser();
      if (el?.src) void el.play().then(() => setPlaying(true));
      else if (currentRef.current) void loadAndPlayRef.current(currentRef.current);
    });
    bind('pause', () => {
      userPausedRef.current = true;
      wantPlayingRef.current = false;
      audioRef.current?.pause();
      setPlaying(false);
    });
    bind('previoustrack', () => prev());
    bind('nexttrack', () => skipNext());
    bind('seekbackward', () => {
      const audio = audioRef.current;
      if (audio) audio.currentTime = Math.max(0, audio.currentTime - 10);
    });
    bind('seekforward', () => {
      const audio = audioRef.current;
      if (audio) audio.currentTime = Math.min(audio.duration || 0, audio.currentTime + 10);
    });
    bind('seekto', (details) => {
      const audio = audioRef.current;
      if (audio && typeof details.seekTime === 'number') audio.currentTime = details.seekTime;
    });
    return () => {
      bind('play', null);
      bind('pause', null);
      bind('previoustrack', null);
      bind('nexttrack', null);
      bind('seekbackward', null);
      bind('seekforward', null);
      bind('seekto', null);
    };
  }, [current, playing, prev, skipNext, ensureAnalyser]);

  const value = useMemo<DropPlayerContextValue>(
    () => ({
      current,
      playing,
      loading,
      elapsed,
      duration,
      volume,
      repeat,
      queue,
      analyser,
      setQueue,
      setRepeat,
      loadAndPlay,
      togglePlay,
      skipNext,
      prev,
      seek,
      setVolume,
      toggleMute,
      stop,
    }),
    [
      current,
      playing,
      loading,
      elapsed,
      duration,
      volume,
      repeat,
      queue,
      analyser,
      setQueue,
      setRepeat,
      loadAndPlay,
      togglePlay,
      skipNext,
      prev,
      seek,
      setVolume,
      toggleMute,
      stop,
    ]
  );

  return (
    <DropPlayerContext.Provider value={value}>
      <audio
        ref={audioRef}
        preload="none"
        playsInline
        crossOrigin="anonymous"
        className="pointer-events-none fixed left-0 top-0 h-px w-px overflow-hidden opacity-0"
      />
      {children}
    </DropPlayerContext.Provider>
  );
}

export function useDropPlayer(): DropPlayerContextValue {
  const ctx = useContext(DropPlayerContext);
  if (!ctx) throw new Error('useDropPlayer must be used within DropPlayerProvider');
  return ctx;
}

export function useOptionalDropPlayer(): DropPlayerContextValue | null {
  return useContext(DropPlayerContext);
}
