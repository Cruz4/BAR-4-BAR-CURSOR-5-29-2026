'use client';

import React, { useEffect, useRef, useMemo } from 'react';
import { Hexagon } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ActiveRules {
  dna?: boolean;
  intents?: boolean;
  style?: boolean;
  vibe?: boolean;
  guardrails?: boolean;
  instructions?: boolean;
}

/** What the workstation loader is doing — drives copy, palette, and strain panel. */
export type SynthesisLoaderMode = 'extract' | 'synthesize';

interface DNASynthesisLoaderProps {
  progress: number;
  activeRules?: ActiveRules;
  statusText?: string;
  /** extract = reading text for DNA profile; synthesize = draft/remix from active rules */
  mode?: SynthesisLoaderMode;
  /** Anchor for logo well ring + ambient suction center (parent measures this) */
  logoAnchorRef?: React.RefObject<HTMLDivElement | null>;
  /** @deprecated use `size` instead */
  compact?: boolean;
  size?: 'compact' | 'default' | 'large' | 'workstation';
  /** Shrink helix so title/strains fit in modal viewports */
  constrainHeight?: boolean;
  /** Hide status line (e.g. when parent renders it in a pinned footer) */
  hideStatus?: boolean;
}

const SIZE_CONFIG = {
  compact: {
    canvasW: 200,
    canvasH: 240,
    logo: 224,
    strandRadius: 34,
    maxW: 320,
    titleClass: 'text-[11px] tracking-[0.35em]',
    statusClass: 'text-[9px] tracking-[0.2em]',
    strainsMaxW: 260,
    strainsTitle: 'text-[8px]',
    strainsLabel: 'text-[7px]',
    gap: 'gap-3',
    dotScale: 0.95,
  },
  default: {
    canvasW: 300,
    canvasH: 350,
    logo: 310,
    strandRadius: 52,
    maxW: 420,
    titleClass: 'text-xs tracking-[0.35em]',
    statusClass: 'text-[10px] tracking-[0.22em]',
    strainsMaxW: 340,
    strainsTitle: 'text-[9px]',
    strainsLabel: 'text-[8px]',
    gap: 'gap-4',
    dotScale: 1.08,
  },
  large: {
    canvasW: 580,
    canvasH: 680,
    logo: 540,
    strandRadius: 94,
    maxW: 700,
    titleClass: 'text-sm sm:text-base md:text-lg tracking-[0.35em] sm:tracking-[0.4em]',
    statusClass: 'text-[10px] sm:text-xs md:text-sm tracking-[0.22em] sm:tracking-[0.25em]',
    strainsMaxW: 560,
    strainsTitle: 'text-[10px] sm:text-[11px]',
    strainsLabel: 'text-[9px] sm:text-[10px]',
    gap: 'gap-4 sm:gap-5 md:gap-7',
    dotScale: 1.28,
  },
  workstation: {
    canvasW: 460,
    canvasH: 540,
    logo: 410,
    strandRadius: 74,
    maxW: 520,
    titleClass: 'text-sm sm:text-base tracking-[0.38em]',
    statusClass: 'text-[10px] sm:text-xs tracking-[0.24em]',
    strainsMaxW: 460,
    strainsTitle: 'text-[10px]',
    strainsLabel: 'text-[9px]',
    gap: 'gap-4 sm:gap-5',
    dotScale: 1.16,
  },
} as const;

type LoaderSize = keyof typeof SIZE_CONFIG;

function resolveSize(compact?: boolean, size?: LoaderSize): LoaderSize {
  if (size) return size;
  return compact === false ? 'default' : 'compact';
}

/** Maps `large` to a viewport-appropriate tier for phone / tablet / desktop. */
function useResponsiveLoaderSize(requested: LoaderSize): LoaderSize {
  const [effective, setEffective] = React.useState<LoaderSize>(() =>
    requested === 'large' ? 'workstation' : requested
  );

  React.useEffect(() => {
    if (requested !== 'large') {
      setEffective(requested);
      return;
    }

    const pick = (): LoaderSize => {
      const w = window.innerWidth;
      if (w < 420) return 'compact';
      if (w < 768) return 'default';
      if (w < 1200) return 'workstation';
      return 'large';
    };

    setEffective(pick());
    const mqls = [
      window.matchMedia('(max-width: 419px)'),
      window.matchMedia('(max-width: 767px)'),
      window.matchMedia('(max-width: 1199px)'),
    ];
    const onChange = () => setEffective(pick());
    mqls.forEach((mql) => mql.addEventListener('change', onChange));
    return () => mqls.forEach((mql) => mql.removeEventListener('change', onChange));
  }, [requested]);

  return requested === 'large' ? effective : requested;
}

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
  intents: 'Intents',
  style: 'Style DNA',
  vibe: 'Vibe',
  guardrails: 'Guardrails',
  instructions: 'Special Instructions',
};

const FALLBACK_PALETTE = ['#d946ef', '#3b82f6', '#10b981'];

/** Core strain colors for extraction — yellow, blue, pink, green */
export const DNA_STRAIN_PALETTE = ['#f59e0b', '#38bdf8', '#d946ef', '#10b981'] as const;

/** Helix geometry helpers — mirrored strands + major/minor groove */
function helixPoint(
  frac: number,
  strand: 0 | 1,
  t: number,
  centerX: number,
  baseRadius: number,
  helixTurns: number
) {
  const theta = frac * Math.PI * 2 * helixTurns + t;
  // Major/minor groove: radius breathes with 2× frequency so one side is wider
  const groove = 0.2 * Math.cos(theta * 2);
  const radius = baseRadius * (strand === 0 ? 1 + groove : 1 - groove);
  const phase = strand === 0 ? 0 : Math.PI;
  const depth = Math.sin(theta + phase);
  const x = centerX + Math.cos(theta + phase) * radius;
  return { x, depth, theta, radius, groove };
}

function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${Math.max(0, Math.min(1, alpha))})`;
}

function statusForProgress(p: number, custom?: string, mode: SynthesisLoaderMode = 'synthesize'): string {
  if (custom) return custom;
  if (mode === 'extract') {
    if (p < 20) return 'Reading source lyrics...';
    if (p < 55) return 'Mapping strain patterns from text...';
    if (p < 92) return 'Extracting DNA profile...';
    return 'Profile extraction complete...';
  }
  if (p < 20) return 'Applying active generation rules...';
  if (p < 55) return 'Pulling elements together based on active rules...';
  if (p < 92) return 'Weaving neural strands into project DNA...';
  return 'Generation complete. Finalizing output...';
}

export function getDnaLoaderStatusText(
  progress: number,
  custom?: string,
  mode: SynthesisLoaderMode = 'synthesize'
): string {
  return statusForProgress(progress, custom, mode);
}

/** App logo — faint backbone behind the helix */
function LogoMotif({ logoSize, constrainHeight }: { logoSize: number; constrainHeight?: boolean }) {
  return (
    <img
      src="/Logo.png"
      alt=""
      aria-hidden
      className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-[2] object-contain select-none"
      style={{
        opacity: 0.35,
        width: constrainHeight
          ? `min(${logoSize}px, 76vw, 30vh)`
          : `min(${logoSize}px, 82vw)`,
        height: 'auto',
        filter: 'drop-shadow(0 0 16px rgba(217,70,239,0.12))',
      }}
    />
  );
}

function drawDot(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  color: string,
  alpha: number,
  glow = 6
) {
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fillStyle = hexToRgba(color, alpha);
  ctx.shadowColor = color;
  ctx.shadowBlur = glow;
  ctx.fill();
  ctx.shadowBlur = 0;
}

export function DNASynthesisLoader({
  progress,
  activeRules = {},
  statusText,
  mode = 'synthesize',
  logoAnchorRef,
  compact = true,
  size,
  constrainHeight = false,
  hideStatus = false,
}: DNASynthesisLoaderProps) {
  const requested = resolveSize(compact, size);
  const responsiveSize = useResponsiveLoaderSize(requested);
  const cfg = SIZE_CONFIG[responsiveSize];
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef<number>(0);
  const progressRef = useRef(progress);

  progressRef.current = progress;

  const activeRuleList = useMemo(
    () =>
      mode === 'synthesize'
        ? Object.entries(activeRules).filter(([, v]) => v).map(([k]) => k)
        : [],
    [activeRules, mode]
  );

  const palette = useMemo(() => {
    if (mode === 'extract') return [...DNA_STRAIN_PALETTE];
    return activeRuleList.length > 0
      ? activeRuleList.map((r) => RULE_COLORS[r])
      : FALLBACK_PALETTE;
  }, [activeRuleList, mode]);

  const completion = Math.min(1, Math.max(0, progress / 100));
  const displayStatus = statusForProgress(progress, statusText, mode);
  const loaderTitle = mode === 'extract' ? 'DNA Extraction' : 'Creative Syncing';

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const W = canvas.width;
    const H = canvas.height;
    const CENTER_X = W / 2;
    const CENTER_Y = H / 2;
    const RUNGS = 24;
    const STRAND_RADIUS = cfg.strandRadius;
    const HELIX_HEIGHT = H * 0.82;
    const BOTTOM_Y = CENTER_Y + HELIX_HEIGHT / 2;
    const TOP_Y = CENTER_Y - HELIX_HEIGHT / 2;
    const HELIX_TURNS = 3.2;
    const DOTS_PER_STRAND = RUNGS * 7;

    const particles: {
      x: number;
      y: number;
      tx: number;
      ty: number;
      alpha: number;
      color: string;
      size: number;
    }[] = [];

    const wrapY = (y: number) => {
      let wy = y;
      while (wy < TOP_Y - 14) wy += HELIX_HEIGHT;
      while (wy > BOTTOM_Y + 10) wy -= HELIX_HEIGHT;
      return wy;
    };

    const spawnParticle = (completionFactor: number) => {
      const frac = Math.random() * completionFactor;
      const ty = wrapY(BOTTOM_Y - frac * HELIX_HEIGHT);
      const { x: tx } = helixPoint(frac, Math.random() > 0.5 ? 1 : 0, 0, CENTER_X, STRAND_RADIUS, HELIX_TURNS);
      const color = palette[Math.floor(Math.random() * palette.length)];
      particles.push({
        x: CENTER_X + (Math.random() - 0.5) * W * 0.45,
        y: BOTTOM_Y + 18 + Math.random() * 16,
        tx,
        ty,
        alpha: 0.85 + Math.random() * 0.15,
        color,
        size: 1.5 + Math.random() * 2,
      });
    };

    let lastSpawn = 0;

    const draw = (timestamp: number) => {
      const t = timestamp * 0.0011;
      const completionFactor = Math.min(1, progressRef.current / 100);
      const upwardFlow = t * 26;

      ctx.clearRect(0, 0, W, H);

      const grd = ctx.createRadialGradient(CENTER_X, CENTER_Y, 8, CENTER_X, CENTER_Y, STRAND_RADIUS * 2.8);
      grd.addColorStop(0, `rgba(217,70,239,${0.05 + completionFactor * 0.1})`);
      grd.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = grd;
      ctx.fillRect(0, 0, W, H);

      if (timestamp - lastSpawn > 65) {
        spawnParticle(completionFactor);
        lastSpawn = timestamp;
      }

      // Two mirrored strands — 180° offset, major/minor groove via radius modulation
      for (const strand of [0, 1] as const) {
        for (let i = 0; i <= DOTS_PER_STRAND; i++) {
          const frac = i / DOTS_PER_STRAND;
          if (frac > completionFactor + 0.03) break;

          const y = wrapY(BOTTOM_Y - frac * HELIX_HEIGHT - upwardFlow);
          const { x, depth, groove } = helixPoint(frac, strand, t, CENTER_X, STRAND_RADIUS, HELIX_TURNS);

          const ruleIdx = (i + strand * 2) % palette.length;
          const dotColor = palette[ruleIdx];
          const majorBoost = groove > 0 ? 1.08 : 0.92;
          const dotAlpha = (0.42 + Math.abs(depth) * 0.48) * Math.min(1, completionFactor + 0.2);
          const dotSize = (2 + depth * 1.5) * majorBoost * cfg.dotScale;

          drawDot(ctx, x, y, dotSize, dotColor, dotAlpha, 4 + Math.abs(depth) * 6);
        }
      }

      // Base-pair rungs — dot pairs bridging mirrored strands at same height
      for (let i = 0; i < RUNGS; i++) {
        const frac = i / Math.max(1, RUNGS - 1);
        if (frac > completionFactor) break;

        const y = wrapY(BOTTOM_Y - frac * HELIX_HEIGHT - upwardFlow);
        const a = helixPoint(frac, 0, t, CENTER_X, STRAND_RADIUS, HELIX_TURNS);
        const b = helixPoint(frac, 1, t, CENTER_X, STRAND_RADIUS, HELIX_TURNS);

        if (Math.abs(a.depth) > 0.94 && Math.abs(b.depth) > 0.94) continue;

        const leftColor = palette[i % palette.length];
        const rightColor = palette[(i + 1) % palette.length];
        const pairAlpha = (0.38 + (Math.abs(a.depth) + Math.abs(b.depth)) * 0.28) * completionFactor;
        const pairSizeA = 2.2 + a.depth * 0.9;
        const pairSizeB = 2.2 + b.depth * 0.9;

        drawDot(ctx, a.x, y, pairSizeA, leftColor, pairAlpha + 0.12, 5);
        drawDot(ctx, b.x, y, pairSizeB, rightColor, pairAlpha + 0.12, 5);
      }

      // Rising particles
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += (p.tx - p.x) * 0.08;
        p.y += (p.ty - p.y) * 0.06 - 0.55;
        p.alpha -= 0.018;
        if (p.alpha <= 0 || p.y < TOP_Y - 24) {
          particles.splice(i, 1);
          continue;
        }
        drawDot(ctx, p.x, p.y, p.size, p.color, p.alpha, 8);
      }

      frameRef.current = requestAnimationFrame(draw);
    };

    frameRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(frameRef.current);
  }, [activeRuleList.join(','), palette.join(','), cfg.strandRadius, cfg.dotScale, cfg.canvasW, cfg.canvasH]);

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center w-full mx-auto px-1 sm:px-2 text-center shrink-0',
        constrainHeight ? 'gap-3 sm:gap-4' : cfg.gap
      )}
      style={{ maxWidth: `min(${cfg.maxW}px, 100%)` }}
    >
      <p
        className={cn(
          'w-full shrink-0 font-headline font-bold uppercase',
          'text-cyan-100 sm:text-white',
          'drop-shadow-[0_0_18px_rgba(56,189,248,0.65)]',
          cfg.titleClass
        )}
      >
        {loaderTitle}
      </p>

      <div
        className={cn(
          'relative w-full flex justify-center items-center shrink-0',
          constrainHeight
            ? 'max-h-[32vh] sm:max-h-[38vh] md:max-h-[44vh]'
            : 'overflow-visible'
        )}
        style={
          constrainHeight
            ? undefined
            : { minHeight: `min(${cfg.canvasH + 12}px, 50vh)` }
        }
      >
        <div
          ref={logoAnchorRef}
          className="absolute left-1/2 top-1/2 z-0 -translate-x-1/2 -translate-y-1/2 pointer-events-none opacity-0"
          style={{
            width: constrainHeight ? 'min(62%, 240px)' : 'min(58%, 260px)',
            aspectRatio: '1',
          }}
          aria-hidden
        />
        <LogoMotif logoSize={cfg.logo} constrainHeight={constrainHeight} />
        <canvas
          ref={canvasRef}
          width={cfg.canvasW}
          height={cfg.canvasH}
          className={cn(
            'relative z-10 block w-full max-w-[min(92vw,520px)] h-auto',
            constrainHeight && 'max-h-[32vh] sm:max-h-[38vh] md:max-h-[44vh] object-contain'
          )}
          style={{
            filter: `drop-shadow(0 0 ${12 + progress * 0.25}px rgba(217,70,239,${0.2 + completion * 0.35}))`,
          }}
        />
      </div>

      {mode === 'synthesize' && activeRuleList.length > 0 && (
        <div
          className="w-full mx-auto shrink-0 rounded-xl border border-white/15 bg-black/55 backdrop-blur-sm px-2.5 py-2 sm:px-4 sm:py-3"
          style={{ maxWidth: `min(${cfg.strainsMaxW}px, 100%)` }}
        >
          <p
            className={cn(
              'font-bold uppercase tracking-widest text-white/70 flex items-center justify-center gap-1.5 mb-2',
              cfg.strainsTitle
            )}
          >
            <Hexagon className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-cyan-400" /> Active Neural Strains
          </p>
          <div className="flex flex-wrap gap-x-2 sm:gap-x-3 gap-y-1.5 justify-center">
            {activeRuleList.map((rule) => (
              <div key={rule} className="flex items-center gap-1 sm:gap-1.5">
                <div
                  className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full shrink-0"
                  style={{
                    backgroundColor: RULE_COLORS[rule],
                    boxShadow: `0 0 6px ${RULE_COLORS[rule]}`,
                  }}
                />
                <span className={cn('font-bold uppercase tracking-wider text-white/55', cfg.strainsLabel)}>
                  {RULE_LABELS[rule]}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {!hideStatus && (
      <p
        className={cn(
          'font-code uppercase text-white/65 text-center leading-relaxed px-1 sm:px-2 shrink-0',
          cfg.statusClass
        )}
      >
        {displayStatus}
      </p>
      )}
    </div>
  );
}
