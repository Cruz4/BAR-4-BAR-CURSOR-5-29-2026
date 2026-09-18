'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

type TaggedAudio = HTMLAudioElement & {
  __b4bAnalyserCtx?: AudioContext;
  __b4bAnalyserNode?: AnalyserNode;
};

/** Wire an <audio> element to an AnalyserNode for feed / inline visualizers. */
export function useMediaElementAnalyser(
  audioRef: React.RefObject<HTMLAudioElement | null>,
  enabled: boolean
): { analyser: AnalyserNode | null; prime: () => AnalyserNode | null } {
  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null);

  const ensure = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || typeof window === 'undefined') return null;
    const tagged = audio as TaggedAudio;
    if (tagged.__b4bAnalyserNode) {
      void tagged.__b4bAnalyserCtx?.resume().catch(() => undefined);
      return tagged.__b4bAnalyserNode;
    }
    const AC =
      window.AudioContext ||
      (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    try {
      audio.crossOrigin = 'anonymous';
      const ctx = new AC();
      const source = ctx.createMediaElementSource(audio);
      const node = ctx.createAnalyser();
      node.fftSize = 1024;
      node.smoothingTimeConstant = 0.52;
      node.minDecibels = -90;
      node.maxDecibels = -20;
      source.connect(node);
      node.connect(ctx.destination);
      tagged.__b4bAnalyserCtx = ctx;
      tagged.__b4bAnalyserNode = node;
      setAnalyser(node);
      void ctx.resume().catch(() => undefined);
      return node;
    } catch {
      return null;
    }
  }, [audioRef]);

  useEffect(() => {
    if (!enabled) return;
    ensure();
  }, [enabled, ensure]);

  return { analyser, prime: ensure };
}
