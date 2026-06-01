'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

type DnaSeedExtractPanelProps = {
  lyrics: string;
  className?: string;
  compact?: boolean;
};

type StrainNode = {
  id: number;
  label: string;
  words: string[];
  y: number;
  phase: number;
  birth: number;
};

function parseStrains(lyrics: string): StrainNode[] {
  const lines = lyrics
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);
  const denom = Math.max(lines.length, 1);
  return lines.map((line, i) => ({
    id: i,
    label: line.length > 42 ? `${line.slice(0, 40)}…` : line,
    words: line.split(/\s+/).filter(Boolean).slice(0, 4),
    y: 0.1 + (i / denom) * 0.78,
    phase: i * 0.85,
    birth: i,
  }));
}

function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

const STRAIN_COLORS = ['#38bdf8', '#10b981', '#d946ef', '#f59e0b', '#818cf8'];

/**
 * “Resonance spine” — lyric lines become orbiting strain nodes on a living helix rail.
 */
export function DnaSeedExtractPanel({ lyrics, className, compact = false }: DnaSeedExtractPanelProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef(0);
  const lyricsRef = useRef(lyrics);
  const strainsRef = useRef<StrainNode[]>([]);
  const [canvasReady, setCanvasReady] = useState(false);
  const [stats, setStats] = useState({ lines: 0, words: 0 });

  lyricsRef.current = lyrics;

  const displayStrains = useMemo(() => parseStrains(lyrics), [lyrics]);

  useEffect(() => {
    const id = window.setTimeout(() => {
      strainsRef.current = parseStrains(lyricsRef.current);
      const words = lyricsRef.current.split(/\s+/).filter(Boolean).length;
      setStats({ lines: strainsRef.current.length, words });
    }, 280);
    return () => window.clearTimeout(id);
  }, [lyrics]);

  useEffect(() => {
    setCanvasReady(false);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: true, desynchronized: true });
    if (!ctx) return;

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const dpr = compact ? 1 : Math.min(window.devicePixelRatio || 1, 1.5);

    let W = 0;
    let H = 0;
    let lastW = 0;
    let lastH = 0;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const w = Math.max(1, Math.floor(rect.width));
      const h = Math.max(1, Math.floor(rect.height));
      if (w === lastW && h === lastH) return;
      lastW = w;
      lastH = h;
      W = w;
      H = h;
      canvas.width = Math.floor(W * dpr);
      canvas.height = Math.floor(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    resize();
    const ro = new ResizeObserver(() => requestAnimationFrame(resize));
    ro.observe(canvas.parentElement ?? canvas);

    let t0 = performance.now();
    let frames = 0;

    const draw = (now: number) => {
      if (W < 2 || H < 2) {
        frameRef.current = requestAnimationFrame(draw);
        return;
      }

      const t = (now - t0) * 0.001;
      const strains = strainsRef.current;
      const spineX = W * 0.52;
      const hasContent = strains.length > 0;

      ctx.clearRect(0, 0, W, H);

      // Ambient grid — bar slots
      ctx.strokeStyle = 'rgba(56,189,248,0.04)';
      ctx.lineWidth = 1;
      for (let gx = 0; gx < W; gx += compact ? 28 : 36) {
        ctx.beginPath();
        ctx.moveTo(gx, 0);
        ctx.lineTo(gx, H);
        ctx.stroke();
      }

      // Central helix rail
      ctx.beginPath();
      for (let y = 0; y <= H; y += 4) {
        const frac = y / H;
        const x = spineX + Math.sin(frac * Math.PI * 4 + t * 0.9) * (compact ? 14 : 22);
        if (y === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.strokeStyle = hasContent
        ? 'rgba(56,189,248,0.22)'
        : 'rgba(56,189,248,0.08)';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      if (reducedMotion) {
        if (frames === 0) setCanvasReady(true);
        frames++;
        frameRef.current = requestAnimationFrame(draw);
        return;
      }

      // Scan beam — smooth vertical sweep
      const scanY = ((t * 0.12) % 1) * H;
      const scanGrad = ctx.createLinearGradient(0, scanY - 40, 0, scanY + 40);
      scanGrad.addColorStop(0, 'rgba(0,0,0,0)');
      scanGrad.addColorStop(0.5, 'rgba(56,189,248,0.07)');
      scanGrad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = scanGrad;
      ctx.fillRect(0, scanY - 40, W, 80);

      // Connect strains along spine
      for (let i = 0; i < strains.length; i++) {
        const s = strains[i];
        const y0 = s.y * H;
        const x0 = spineX + Math.sin(s.y * Math.PI * 4 + t * 0.9 + s.phase) * (compact ? 14 : 22);
        if (i === 0) continue;
        const prev = strains[i - 1];
        const y1 = prev.y * H;
        const x1 = spineX + Math.sin(prev.y * Math.PI * 4 + t * 0.9 + prev.phase) * (compact ? 14 : 22);
        const color = STRAIN_COLORS[i % STRAIN_COLORS.length];
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.quadraticCurveTo(spineX, (y0 + y1) / 2, x0, y0);
        ctx.strokeStyle = hexToRgba(color, 0.25 + 0.15 * Math.sin(t * 2 + i));
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      // Strain nodes + orbiting word shards
      strains.forEach((s, i) => {
        const color = STRAIN_COLORS[i % STRAIN_COLORS.length];
        const ny = s.y * H;
        const nx = spineX + Math.sin(s.y * Math.PI * 4 + t * 0.9 + s.phase) * (compact ? 14 : 22);
        const pulse = 0.55 + 0.45 * Math.sin(t * 2.4 + s.phase);

        // Resonance ring — expands from node
        const ringR = 8 + pulse * 14 + (s.label.length / 40) * 10;
        ctx.beginPath();
        ctx.arc(nx, ny, ringR, 0, Math.PI * 2);
        ctx.strokeStyle = hexToRgba(color, 0.08 + pulse * 0.06);
        ctx.lineWidth = 1;
        ctx.stroke();

        // Core node
        ctx.beginPath();
        ctx.arc(nx, ny, 3 + pulse * 2, 0, Math.PI * 2);
        ctx.fillStyle = hexToRgba(color, 0.75 + pulse * 0.2);
        ctx.fill();

        // Word shards orbit the node
        s.words.forEach((word, wi) => {
          const angle = t * 1.1 + wi * 1.4 + s.phase;
          const orbit = (compact ? 22 : 32) + wi * 8;
          const wx = nx + Math.cos(angle) * orbit;
          const wy = ny + Math.sin(angle * 0.85) * (orbit * 0.55);
          ctx.font = `${compact ? 7 : 8}px monospace`;
          ctx.fillStyle = hexToRgba(color, 0.35 + pulse * 0.25);
          ctx.fillText(word.slice(0, 10), wx, wy);
        });

        // Echo line fading to the left (visual link to lyric source)
        ctx.beginPath();
        ctx.moveTo(nx, ny);
        ctx.lineTo(W * 0.06, ny + Math.sin(t + i) * 6);
        ctx.strokeStyle = hexToRgba(color, 0.12);
        ctx.lineWidth = 1;
        ctx.stroke();
      });

      // Dormant state — waiting pulse
      if (!hasContent) {
        for (let i = 0; i < 5; i++) {
          const fy = H * (0.2 + i * 0.15);
          const fx = spineX + Math.sin(t * 0.7 + i) * 18;
          ctx.beginPath();
          ctx.arc(fx, fy, 2, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(56,189,248,${0.15 + 0.1 * Math.sin(t * 2 + i)})`;
          ctx.fill();
        }
      }

      frames++;
      if (frames === 2) setCanvasReady(true);
      frameRef.current = requestAnimationFrame(draw);
    };

    frameRef.current = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(frameRef.current);
      ro.disconnect();
    };
  }, [compact]);

  return (
    <div
      className={cn(
        'relative flex flex-col h-full min-h-[160px] overflow-hidden',
        'bg-gradient-to-br from-sky-950/40 via-[hsl(216_48%_6%)] to-violet-950/30',
        className
      )}
    >
      <div className="shrink-0 border-b border-sky-500/15 px-3 py-2 sm:py-2.5">
        <p className="text-[9px] sm:text-[10px] font-bold uppercase tracking-[0.28em] text-cyan-300/90">
          Strain Resonance Field
        </p>
        <p className="text-[8px] sm:text-[9px] text-white/40 uppercase tracking-widest mt-0.5">
          Live lexical mapping
        </p>
      </div>

      <div className="relative flex-1 min-h-0">
        <canvas
          ref={canvasRef}
          className={cn(
            'absolute inset-0 h-full w-full transition-opacity duration-700',
            canvasReady ? 'opacity-100' : 'opacity-0'
          )}
        />
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              'radial-gradient(ellipse 80% 60% at 55% 45%, rgba(56,189,248,0.06) 0%, transparent 70%)',
          }}
        />
      </div>

      <div className="shrink-0 border-t border-sky-500/15 px-3 py-2 flex items-center justify-between gap-2 bg-black/25">
        <div className="flex flex-col gap-0.5 min-w-0">
          <span className="text-[8px] sm:text-[9px] font-code uppercase tracking-widest text-cyan-400/80">
            {stats.lines > 0 ? `${stats.lines} line strains` : 'Awaiting source text'}
          </span>
          {stats.words > 0 && (
            <span className="text-[7px] sm:text-[8px] font-code uppercase text-white/35 tracking-wider">
              {stats.words} lexical units mapped
            </span>
          )}
        </div>
        <div
          className={cn(
            'h-2 w-2 rounded-full shrink-0',
            stats.lines > 0 ? 'bg-emerald-400 animate-pulse' : 'bg-sky-500/40'
          )}
          style={stats.lines > 0 ? { boxShadow: '0 0 8px rgba(52,211,153,0.6)' } : undefined}
        />
      </div>

      {/* Ghost preview of latest lines — monospace echo */}
      {displayStrains.length > 0 && (
        <div className="hidden lg:block absolute top-12 right-2 w-[42%] max-h-[45%] overflow-hidden opacity-[0.12] pointer-events-none mask-fade-y">
          <div className="flex flex-col gap-2 pr-1 font-code text-[7px] leading-snug text-cyan-100 uppercase">
            {displayStrains.slice(-6).map((s) => (
              <span key={s.id} className="truncate">
                {s.label}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
