'use client';

import React, { useEffect, useRef } from 'react';
import { MUSICAL_EQ_BANDS, measureSpectrumBand, smoothSpectrumLevel } from '@/lib/audio-spectrum';
import { cn } from '@/lib/utils';

type DropVisualizerProps = {
  analyser: AnalyserNode | null;
  playing: boolean;
  children?: React.ReactNode;
  className?: string;
};

const BAND_LABELS = ['LOW', 'LOW-MID', 'HIGH-MID', 'HIGH'] as const;

/**
 * AKAsheet Library visualizer — a pressing-lathe ring plus four live
 * frequency-band energy lanes.
 */
export function DropVisualizer({ analyser, playing, children, className }: DropVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const barRefs = useRef<Array<HTMLDivElement | null>>([null, null, null, null]);
  const glowRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const bins = analyser ? new Uint8Array(analyser.frequencyBinCount) : null;
    const smoothedLanes = [0.08, 0.08, 0.08, 0.08];
    let t = 0;

    const draw = () => {
      rafRef.current = requestAnimationFrame(draw);
      t += playing ? 0.018 : 0.006;
      const { width, height } = canvas;
      ctx.clearRect(0, 0, width, height);

      if (analyser && bins) analyser.getByteFrequencyData(bins);

      const cx = width / 2;
      const cy = height / 2;
      const radius = Math.min(cx, cy) * 0.72;
      const tickCount = 72;

      for (let i = 0; i < tickCount; i++) {
        const band = bins
          ? bins[Math.floor((i / tickCount) * Math.min(bins.length * 0.55, bins.length - 1))] / 255
          : 0.18 + Math.sin(t * 2 + i * 0.2) * 0.06;
        const energy = playing ? 0.22 + band * 0.78 : 0.12 + band * 0.18;
        const angle = (i / tickCount) * Math.PI * 2 + t * 0.35;
        const inner = radius;
        const outer = radius + 6 + energy * 22;
        const x1 = cx + Math.cos(angle) * inner;
        const y1 = cy + Math.sin(angle) * inner;
        const x2 = cx + Math.cos(angle) * outer;
        const y2 = cy + Math.sin(angle) * outer;
        const hue = i % 2 === 0 ? 312 : 186;
        ctx.strokeStyle = `hsla(${hue}, 92%, ${playing ? 68 : 48}%, ${0.28 + energy * 0.55})`;
        ctx.lineWidth = playing ? 2.2 : 1.4;
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
      }

      ctx.beginPath();
      ctx.arc(cx, cy, radius - 1, 0, Math.PI * 2);
      ctx.strokeStyle = playing ? 'rgba(244, 114, 182, 0.45)' : 'rgba(244, 114, 182, 0.18)';
      ctx.lineWidth = 2;
      ctx.stroke();

      const lanes = MUSICAL_EQ_BANDS.map((band, lane) => {
        if (!bins || bins.length === 0) {
          return playing ? 0.28 + Math.sin(t * 3 + lane) * 0.12 : 0.12;
        }
        // Musical Hz ranges from bass through high detail.
        const measured = playing ? measureSpectrumBand(analyser!, bins, band) : 0.06;
        smoothedLanes[lane] = smoothSpectrumLevel(smoothedLanes[lane], measured);
        return Math.max(0.06, smoothedLanes[lane]);
      });

      lanes.forEach((level, i) => {
        const el = barRefs.current[i];
        if (el) el.style.transform = `scaleX(${Math.max(0.06, level)})`;
      });
      if (glowRef.current) {
        const peak = Math.max(...lanes);
        glowRef.current.style.opacity = playing ? String(0.25 + peak * 0.55) : '0.12';
      }
    };

    const resize = () => {
      const frame = frameRef.current;
      if (!frame) return;
      const size = Math.floor(frame.clientWidth);
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.max(1, size * dpr);
      canvas.height = Math.max(1, size * dpr);
      canvas.style.width = `${size}px`;
      canvas.style.height = `${size}px`;
    };

    resize();
    const observer = new ResizeObserver(resize);
    if (frameRef.current) observer.observe(frameRef.current);
    draw();

    return () => {
      cancelAnimationFrame(rafRef.current);
      observer.disconnect();
    };
  }, [analyser, playing]);

  return (
    <div className={cn('flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:gap-5', className)}>
      <div className="relative mx-auto aspect-square w-[min(58vw,220px)] shrink-0 sm:mx-0 sm:w-[200px] lg:w-[228px]">
        <div
          ref={glowRef}
          className="pointer-events-none absolute inset-[-18%] rounded-full bg-[radial-gradient(circle,rgba(232,121,249,0.35),rgba(34,211,238,0.12)_45%,transparent_70%)]"
          aria-hidden
        />
        <div ref={frameRef} className="pointer-events-none absolute inset-[-16%]">
          <canvas ref={canvasRef} className="h-full w-full" aria-hidden />
        </div>
        <div className="absolute inset-[14%]">{children}</div>
      </div>
      <div className="flex min-w-0 flex-1 flex-col justify-center gap-1.5 px-1">
        {BAND_LABELS.map((label, i) => (
          <div key={label} className="flex items-center gap-2">
            <span className="w-14 shrink-0 font-code text-[8px] font-bold tracking-[0.12em] text-fuchsia-300/70">
              {label}
            </span>
            <div className="h-2.5 flex-1 overflow-hidden rounded-sm bg-white/5 ring-1 ring-fuchsia-400/15">
              <div
                ref={(el) => {
                  barRefs.current[i] = el;
                }}
                className={cn(
                  'h-full origin-left rounded-sm',
                  i % 2 === 0
                    ? 'bg-gradient-to-r from-fuchsia-400 via-pink-400 to-cyan-300'
                    : 'bg-gradient-to-r from-cyan-400 via-fuchsia-400 to-violet-300'
                )}
                style={{ transform: 'scaleX(0.12)', width: '100%' }}
              />
            </div>
          </div>
        ))}
        <p className="mt-1 font-code text-[9px] uppercase tracking-[0.2em] text-muted-foreground">
          Live sound levels
        </p>
      </div>
    </div>
  );
}
