'use client';

import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { Mic } from 'lucide-react';

const BAR_COUNT = 28;

type FreestyleMicLevelVisualizerProps = {
  stream: MediaStream | null;
  active: boolean;
  className?: string;
};

export function FreestyleMicLevelVisualizer({
  stream,
  active,
  className,
}: FreestyleMicLevelVisualizerProps) {
  const [levels, setLevels] = useState<number[]>(() => Array(BAR_COUNT).fill(0.06));
  const [peakLevel, setPeakLevel] = useState(0);
  const rafRef = useRef(0);

  useEffect(() => {
    if (!active || !stream) {
      setLevels(Array(BAR_COUNT).fill(0.06));
      setPeakLevel(0);
      return;
    }

    const AudioCtx =
      window.AudioContext ||
      (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;

    const ctx = new AudioCtx();
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 128;
    analyser.smoothingTimeConstant = 0.72;
    analyser.minDecibels = -90;
    analyser.maxDecibels = -10;

    const source = ctx.createMediaStreamSource(stream);
    source.connect(analyser);

    const freqData = new Uint8Array(analyser.frequencyBinCount);
    const timeData = new Uint8Array(analyser.fftSize);

    const tick = () => {
      analyser.getByteFrequencyData(freqData);
      analyser.getByteTimeDomainData(timeData);

      let timeSum = 0;
      for (let i = 0; i < timeData.length; i += 1) {
        const v = (timeData[i] - 128) / 128;
        timeSum += v * v;
      }
      const rms = Math.sqrt(timeSum / timeData.length);

      const bars: number[] = [];
      const step = Math.max(1, Math.floor(freqData.length / BAR_COUNT));
      let maxBar = 0;
      for (let i = 0; i < BAR_COUNT; i += 1) {
        let sum = 0;
        const start = i * step;
        for (let j = 0; j < step; j += 1) {
          sum += freqData[start + j] ?? 0;
        }
        const normalized = Math.min(1, (sum / step / 255) * 1.35 + rms * 0.85);
        bars.push(Math.max(0.06, normalized));
        maxBar = Math.max(maxBar, normalized);
      }

      setLevels(bars);
      setPeakLevel(maxBar);
      rafRef.current = requestAnimationFrame(tick);
    };

    void ctx.resume().then(() => {
      rafRef.current = requestAnimationFrame(tick);
    });

    return () => {
      cancelAnimationFrame(rafRef.current);
      source.disconnect();
      analyser.disconnect();
      void ctx.close();
    };
  }, [active, stream]);

  const isHot = peakLevel > 0.12;
  const isWarm = peakLevel > 0.05;

  return (
    <div className={cn('space-y-2.5', className)}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <span
            className={cn(
              'relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full border',
              active && isHot
                ? 'border-emerald-500/50 bg-emerald-500/15 text-emerald-400'
                : active && isWarm
                  ? 'border-primary/40 bg-primary/10 text-primary'
                  : active
                    ? 'border-amber-500/35 bg-amber-500/10 text-amber-400'
                    : 'border-white/10 bg-white/5 text-muted-foreground/40'
            )}
          >
            {active && isHot && (
              <span className="absolute inset-0 rounded-full bg-emerald-400/25 animate-ping" />
            )}
            <Mic className="relative h-4 w-4" />
          </span>
          <p
            className={cn(
              'font-code text-[10px] uppercase tracking-widest truncate',
              active && isHot
                ? 'text-emerald-400'
                : active && isWarm
                  ? 'text-primary'
                  : active
                    ? 'text-amber-300/90'
                    : 'text-muted-foreground/50'
            )}
          >
            {active
              ? isHot
                ? 'Mic pickup — you’re hot'
                : isWarm
                  ? 'Mic open — keep talking'
                  : 'Mic open — speak louder'
              : 'Mic idle'}
          </p>
        </div>
        {active && (
          <div className="flex items-center gap-2 shrink-0">
            <div className="h-2 w-20 rounded-full bg-white/10 overflow-hidden border border-white/10">
              <div
                className={cn(
                  'h-full rounded-full transition-all duration-75',
                  isHot ? 'bg-emerald-500' : isWarm ? 'bg-primary' : 'bg-amber-500/80'
                )}
                style={{ width: `${Math.min(100, Math.round(peakLevel * 100))}%` }}
              />
            </div>
            <span className="font-mono text-[9px] text-muted-foreground tabular-nums w-8 text-right">
              {Math.min(100, Math.round(peakLevel * 100))}
            </span>
          </div>
        )}
      </div>

      <div
        className="flex items-end justify-center gap-[3px] h-14 md:h-16 px-1"
        aria-hidden
      >
        {levels.map((level, i) => (
          <div
            key={i}
            className={cn(
              'w-1 md:w-1.5 rounded-full origin-bottom transition-[height,opacity] duration-75',
              active && isHot
                ? 'bg-gradient-to-t from-emerald-600 to-emerald-300 shadow-[0_0_10px_rgba(52,211,153,0.35)]'
                : active && isWarm
                  ? 'bg-gradient-to-t from-primary/80 to-primary'
                  : active
                    ? 'bg-gradient-to-t from-amber-600/80 to-amber-400/90'
                    : 'bg-muted-foreground/15'
            )}
            style={{ height: `${Math.round(level * 100)}%` }}
          />
        ))}
      </div>
    </div>
  );
}
