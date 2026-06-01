'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { ActiveRules, SynthesisLoaderMode } from '@/components/dna-synthesis-loader';
import { DNA_STRAIN_PALETTE } from '@/components/dna-synthesis-loader';
import { cn } from '@/lib/utils';

const RULE_COLORS: Record<string, string> = {
  dna: '#10b981',
  intents: '#38bdf8',
  style: '#d946ef',
  vibe: '#f59e0b',
  guardrails: '#f43f5e',
  instructions: '#3b82f6',
};

const RULE_LABELS: Record<string, string> = {
  dna: 'DNA',
  intents: 'INTENTS',
  style: 'STYLE',
  vibe: 'VIBE',
  guardrails: 'GUARDRAILS',
  instructions: 'INSTRUCTIONS',
};

const FALLBACK = ['#d946ef', '#3b82f6', '#10b981'];

function normalizePalette(input: string[] | undefined): string[] {
  const valid = (input ?? []).filter(
    (c): c is string => typeof c === 'string' && /^#[0-9a-fA-F]{6}$/.test(c)
  );
  return valid.length > 0 ? valid : FALLBACK;
}

function pickColor(colors: string[], index: number): string {
  if (!colors.length) return FALLBACK[0];
  const i = ((index % colors.length) + colors.length) % colors.length;
  return colors[i] ?? FALLBACK[0];
}

function hexToRgba(hex: string | undefined, alpha: number): string {
  const safe =
    typeof hex === 'string' && hex.startsWith('#') && hex.length >= 7 ? hex : FALLBACK[0];
  const r = parseInt(safe.slice(1, 3), 16);
  const g = parseInt(safe.slice(3, 5), 16);
  const b = parseInt(safe.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${Math.max(0, Math.min(1, alpha))})`;
}

type GenerationSyncAmbientProps = {
  progress: number;
  activeRules?: ActiveRules;
  mode?: SynthesisLoaderMode;
  /** Measured logo center in ambient canvas coordinates */
  attractor?: SyncAttractor | null;
  className?: string;
};

export type SyncAttractor = { cx: number; cy: number; /** Logo-sized fade for suction */ r: number; /** Large back ring radius */ ringR: number };

/**
 * Ambient sync field — horizontal “couplet tides” drift inward toward the helix,
 * matching the progress bar’s left→right flow (no vertical bar stacks).
 */
export function GenerationSyncAmbient({
  progress,
  activeRules = {},
  mode = 'synthesize',
  attractor = null,
  className,
}: GenerationSyncAmbientProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef(0);
  const progressRef = useRef(progress);
  const paletteRef = useRef<string[]>(FALLBACK);
  const attractorRef = useRef<SyncAttractor | null>(attractor);
  const [canvasReady, setCanvasReady] = useState(false);

  progressRef.current = progress;
  attractorRef.current = attractor;

  const activeRuleList = useMemo(
    () =>
      mode === 'synthesize'
        ? Object.entries(activeRules).filter(([, v]) => v).map(([k]) => k)
        : [],
    [activeRules, mode]
  );

  const palette = useMemo(() => {
    if (mode === 'extract') return normalizePalette([...DNA_STRAIN_PALETTE]);
    if (activeRuleList.length > 0) {
      return normalizePalette(activeRuleList.map((r) => RULE_COLORS[r]));
    }
    return [...FALLBACK];
  }, [activeRuleList, mode]);

  paletteRef.current = palette;

  const telemetryLines = useMemo(() => {
    if (mode === 'extract') {
      return [
        'LYRICS::READ',
        'STRAIN::MAP',
        'PROFILE::EXTRACT',
        'DNA::PARSE',
        'COUPLET::SCAN',
        'STRAIN::MAP',
      ];
    }
    const tags =
      activeRuleList.length > 0
        ? activeRuleList.map((r) => `${RULE_LABELS[r]}::SYNC`)
        : ['DNA::ROUTE', 'STRAND::WEAVE', 'BAR::FORGE', 'NEURAL::MESH'];
    return [...tags, ...tags];
  }, [activeRuleList, mode]);

  const telemetryTicker = useMemo(
    () => [...telemetryLines, ...telemetryLines, ...telemetryLines].join('   ·   '),
    [telemetryLines]
  );

  useEffect(() => {
    setCanvasReady(false);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: true, desynchronized: true });
    if (!ctx) return;

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const isCompact = window.matchMedia('(max-width: 767px)').matches;
    const dpr = isCompact ? 1 : Math.min(window.devicePixelRatio || 1, 1.5);

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
    const ro = new ResizeObserver(() => {
      window.requestAnimationFrame(resize);
    });
    ro.observe(canvas.parentElement ?? canvas);

    const LANES = isCompact ? 5 : 7;

    const getWell = () => {
      const measured = attractorRef.current;
      const cx = measured?.cx ?? W * 0.5;
      const cy = measured?.cy ?? H * (1 - 0.14) * 0.48;
      const fadeR = measured?.r ?? Math.min(W * 0.12, H * 0.1, 64);
      const ringR = measured?.ringR ?? fadeR * 1.05;
      return { cx, cy, ringR, fadeR };
    };

    /** Fade to 0 inside logo well — particles appear to slip behind the helix. */
    const wellFade = (x: number, y: number, well: ReturnType<typeof getWell>) => {
      const dx = x - well.cx;
      const dy = y - well.cy;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const inner = well.fadeR * 0.72;
      const outer = well.fadeR * 1.28;
      if (dist <= inner) return 0;
      if (dist >= outer) return 1;
      const t = (dist - inner) / (outer - inner);
      return t * t * (3 - 2 * t);
    };

    type TideHead = {
      side: 'L' | 'R';
      lane: number;
      u: number;
      speed: number;
      color: string;
      phase: number;
    };

    type Drifter = {
      x: number;
      y: number;
      color: string;
      life: number;
      phase: number;
      side: 'L' | 'R';
      lane: number;
    };
    const tides: TideHead[] = [];
    const drifters: Drifter[] = [];

    for (let lane = 0; lane < LANES; lane++) {
      tides.push({
        side: 'L',
        lane,
        u: Math.random(),
        speed: 0.0018 + lane * 0.00025,
        color: '',
        phase: lane * 1.7 + Math.random(),
      });
      tides.push({
        side: 'R',
        lane,
        u: Math.random(),
        speed: 0.0018 + lane * 0.00025,
        color: '',
        phase: lane * 1.9 + Math.random() * 0.5,
      });
    }

    let t0 = performance.now();
    let frames = 0;
    let lastDriftSpawn = 0;

    /** Parametric path: spawn at wing edge → accelerate into logo center (suction). */
    const tidePoint = (
      u: number,
      side: 'L' | 'R',
      lane: number,
      phase: number,
      t: number,
      well: ReturnType<typeof getWell>
    ) => {
      const suck = Math.max(0, Math.min(1, u));
      const accel = suck * suck * (3 - 2 * suck);
      const pull = accel + (1 - accel) * suck * 0.35;

      const wingY = H * (0.1 + ((lane + 0.5) / LANES) * 0.8);
      const wave = Math.sin(suck * Math.PI * 3.5 + t * 1.4 + phase) * (1 - pull) * (12 + lane * 1.4);
      const startX = side === 'L' ? -12 : W + 12;

      const x = startX + (well.cx - startX) * pull;
      const y = wingY + wave + (well.cy - wingY) * pull * 0.55;

      return { x, y, pull };
    };

    const spawnDrifter = (side: 'L' | 'R', colors: string[]) => {
      const lane = Math.floor(Math.random() * LANES);
      drifters.push({
        x: side === 'L' ? -8 - Math.random() * 24 : W + 8 + Math.random() * 24,
        y: H * (0.08 + ((lane + 0.5) / LANES) * 0.84),
        color: pickColor(colors, Math.floor(Math.random() * colors.length)),
        life: 0.9 + Math.random() * 0.1,
        phase: Math.random() * Math.PI * 2,
        side,
        lane,
      });
    };

    const draw = (now: number) => {
      if (W < 2 || H < 2) {
        frameRef.current = requestAnimationFrame(draw);
        return;
      }

      const t = (now - t0) * 0.001;
      const completion = Math.min(1, Math.max(0, progressRef.current / 100));
      const colors = normalizePalette(paletteRef.current);
      const speedBoost = 1 + completion * 1.4;
      const well = getWell();

      ctx.clearRect(0, 0, W, H);

      if (reducedMotion) {
        if (frames === 0) setCanvasReady(true);
        frames++;
        frameRef.current = requestAnimationFrame(draw);
        return;
      }

      // Horizontal aurora bands — soft L→R luminance, echoes progress direction
      for (let band = 0; band < 4; band++) {
        const bandY = H * (0.08 + band * 0.22);
        const drift = ((t * 0.12 + band * 0.17) % 1) * W * 1.2 - W * 0.1;
        const color = pickColor(colors, band);
        const alpha = (0.025 + completion * 0.04) * (0.6 + 0.4 * Math.sin(t * 0.9 + band));

        const grad = ctx.createLinearGradient(drift - W * 0.35, bandY, drift + W * 0.35, bandY);
        grad.addColorStop(0, 'rgba(0,0,0,0)');
        grad.addColorStop(0.35, hexToRgba(color, alpha * 0.4));
        grad.addColorStop(0.5, hexToRgba(color, alpha));
        grad.addColorStop(0.65, hexToRgba(color, alpha * 0.4));
        grad.addColorStop(1, 'rgba(0,0,0,0)');

        ctx.fillStyle = grad;
        ctx.fillRect(0, bandY - 18, W, 36);
      }

      // Couplet tide ribbons — sucked toward logo center, fade behind the well
      for (const tide of tides) {
        const suction = 1 + tide.u * tide.u * 3.2;
        tide.u += tide.speed * speedBoost * suction;
        if (tide.u > 1.12) tide.u = -0.06 - Math.random() * 0.08;
        const color = pickColor(colors, tide.lane + Math.floor(t * 0.3));

        const steps = isCompact ? 16 : 24;
        let prev: { x: number; y: number; fade: number } | null = null;

        for (let s = 0; s <= steps; s++) {
          const segU = Math.max(-0.02, tide.u - s * 0.032);
          const pt = tidePoint(segU, tide.side, tide.lane, tide.phase, t, well);
          const fade = wellFade(pt.x, pt.y, well);
          if (fade <= 0.01) {
            prev = null;
            continue;
          }

          const segAlpha = (0.07 + completion * 0.16) * fade * (1 - s / (steps + 2));

          if (prev && prev.fade > 0.01) {
            // Skip near-vertical stacks below the logo — they read as a stray amber column
            const dx = pt.x - prev.x;
            const dy = pt.y - prev.y;
            const nearCore = pt.pull > 0.68 && Math.abs(pt.x - well.cx) < well.fadeR * 1.35;
            const mostlyVertical = Math.abs(dy) > Math.abs(dx) * 2.5;
            if (!(nearCore && mostlyVertical)) {
              ctx.beginPath();
              ctx.moveTo(prev.x, prev.y);
              ctx.lineTo(pt.x, pt.y);
              ctx.strokeStyle = hexToRgba(color, segAlpha);
              ctx.lineWidth = 1.2 + pt.pull * 0.8;
              ctx.stroke();
            }
          }
          prev = { x: pt.x, y: pt.y, fade };
        }

        for (let dot = 0; dot < 5; dot++) {
          const dotU = Math.max(-0.02, tide.u - dot * 0.024);
          const pt = tidePoint(dotU, tide.side, tide.lane, tide.phase, t, well);
          const fade = wellFade(pt.x, pt.y, well);
          if (fade <= 0.01) continue;
          const a = (0.65 - dot * 0.11) * (0.4 + completion * 0.6) * fade;
          ctx.beginPath();
          ctx.arc(pt.x, pt.y, (1.2 + (4 - dot) * 0.45) * (0.7 + pt.pull * 0.5), 0, Math.PI * 2);
          ctx.fillStyle = hexToRgba(color, a);
          ctx.fill();
        }
      }

      // Phosphor motes — same attractor, spiral slightly as they fall inward
      if (now - lastDriftSpawn > 100 - completion * 40) {
        if (drifters.length < (isCompact ? 14 : 24)) {
          spawnDrifter(Math.random() > 0.5 ? 'L' : 'R', colors);
        }
        lastDriftSpawn = now;
      }

      for (let i = drifters.length - 1; i >= 0; i--) {
        const d = drifters[i];
        const dx = well.cx - d.x;
        const dy = well.cy - d.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const pull = (0.35 + completion * 0.55) * (1 + (well.fadeR * 2.2) / dist);
        const swirl = Math.sin(t * 2.4 + d.phase) * 0.22 * (well.fadeR / dist);
        const nx = dx / dist;
        const ny = dy / dist;
        const px = -ny;
        const py = nx;

        d.x += (nx * pull + px * swirl) * speedBoost;
        d.y += (ny * pull + py * swirl) * speedBoost;
        d.life -= 0.004;

        const fade = wellFade(d.x, d.y, well);
        if (d.life <= 0 || fade <= 0.01 || dist < well.fadeR * 0.65) {
          drifters.splice(i, 1);
          continue;
        }

        ctx.beginPath();
        ctx.arc(d.x, d.y, 0.8 + d.life * 1.1, 0, Math.PI * 2);
        ctx.fillStyle = hexToRgba(d.color, d.life * 0.38 * fade);
        ctx.fill();
      }

      // Large back ring — centered on logo, original scale
      const ringPulse = 0.55 + 0.45 * Math.sin(t * 1.6);
      ctx.beginPath();
      ctx.arc(well.cx, well.cy, well.ringR * 1.05, 0, Math.PI * 2);
      ctx.strokeStyle = hexToRgba(pickColor(colors, 0), 0.04 + completion * 0.07 * ringPulse);
      ctx.lineWidth = 2;
      ctx.stroke();

      frames++;
      if (frames === 2) setCanvasReady(true);

      frameRef.current = requestAnimationFrame(draw);
    };

    frameRef.current = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(frameRef.current);
      ro.disconnect();
    };
  }, [palette.join(',')]);

  const wellMaskStyle = attractor
    ? {
        background: `radial-gradient(ellipse ${Math.round(attractor.r * 2.05)}px ${Math.round(attractor.r * 2.2)}px at ${Math.round(attractor.cx)}px ${Math.round(attractor.cy)}px, rgba(6,12,24,0.92) 0%, rgba(6,12,24,0.55) 42%, transparent 58%), radial-gradient(ellipse ${Math.round(attractor.ringR * 2.15)}px ${Math.round(attractor.ringR * 2.35)}px at ${Math.round(attractor.cx)}px ${Math.round(attractor.cy)}px, transparent 0%, transparent 34%, rgba(6,12,24,0.45) 58%, rgba(6,12,24,0.88) 100%)`,
      }
    : {
        background:
          'radial-gradient(ellipse 38% 52% at 50% 40%, rgba(6,12,24,0.92) 0%, rgba(6,12,24,0.55) 42%, transparent 58%), radial-gradient(ellipse 48% 68% at 50% 42%, transparent 0%, transparent 34%, rgba(6,12,24,0.45) 58%, rgba(6,12,24,0.88) 100%)',
      };

  return (
    <div
      className={cn(
        'pointer-events-none select-none overflow-hidden bg-[hsl(216_48%_5%)]',
        className
      )}
      aria-hidden
    >
      {/* Horizontal wing glow — top/bottom, not vertical columns */}
      <div
        className="absolute inset-x-0 top-0 h-[28%]"
        style={{
          background:
            'linear-gradient(180deg, rgba(56,189,248,0.06) 0%, rgba(16,185,129,0.03) 40%, transparent 100%)',
        }}
      />
      <div
        className="absolute inset-x-0 bottom-0 h-[32%]"
        style={{
          background:
            'linear-gradient(0deg, rgba(56,189,248,0.05) 0%, rgba(217,70,239,0.04) 35%, transparent 100%)',
        }}
      />

      <canvas
        ref={canvasRef}
        className={cn(
          'absolute inset-0 h-full w-full transition-opacity duration-700 ease-out',
          canvasReady ? 'opacity-100' : 'opacity-0'
        )}
      />

      {/* Horizontal telemetry tickers — L→R, aligned with progress bar flow */}
      <div className="absolute top-[max(0.5rem,env(safe-area-inset-top))] left-0 right-0 h-6 sm:h-7 overflow-hidden opacity-[0.16] mask-fade-x">
        <div className="generation-sync-telemetry-h absolute inset-y-0 flex items-center whitespace-nowrap font-code text-[7px] sm:text-[8px] uppercase tracking-[0.35em] text-cyan-400/80">
          <span className="pr-16">{telemetryTicker}</span>
          <span className="pr-16" aria-hidden>
            {telemetryTicker}
          </span>
        </div>
      </div>
      <div className="absolute bottom-[calc(5.5rem+env(safe-area-inset-bottom))] sm:bottom-[calc(6rem+env(safe-area-inset-bottom))] left-0 right-0 h-6 overflow-hidden opacity-[0.12] mask-fade-x">
        <div className="generation-sync-telemetry-h-reverse absolute inset-y-0 flex items-center whitespace-nowrap font-code text-[7px] sm:text-[8px] uppercase tracking-[0.35em] text-violet-300/70">
          <span className="pr-16">{telemetryTicker}</span>
          <span className="pr-16" aria-hidden>
            {telemetryTicker}
          </span>
        </div>
      </div>

      <div className="absolute inset-0" style={wellMaskStyle} />
      <div className="absolute inset-0 bg-gradient-to-b from-background/25 via-transparent to-background/40" />
    </div>
  );
}
