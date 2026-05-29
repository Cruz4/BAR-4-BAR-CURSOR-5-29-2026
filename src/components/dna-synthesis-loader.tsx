'use client';

import React, { useEffect, useRef, useMemo } from 'react';
import { Hexagon } from 'lucide-react';

export interface ActiveRules {
  dna?: boolean;
  intents?: boolean;
  style?: boolean;
  vibe?: boolean;
  guardrails?: boolean;
  instructions?: boolean;
}

interface DNASynthesisLoaderProps {
  progress: number;
  activeRules?: ActiveRules;
  statusText?: string;
  compact?: boolean;
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

function statusForProgress(p: number, custom?: string): string {
  if (custom) return custom;
  if (p < 20) return 'Applying active generation rules...';
  if (p < 55) return 'Pulling elements together based on active rules...';
  if (p < 92) return 'Weaving neural strands into project DNA...';
  return 'Generation complete. Finalizing output...';
}

/** App logo — faint backbone behind the helix (4× prior size) */
function LogoMotif({ compact }: { compact: boolean }) {
  const size = compact ? 224 : 288;
  return (
    <img
      src="/Logo.png"
      alt=""
      aria-hidden
      className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-0 object-contain select-none"
      style={{
        opacity: 0.35,
        width: size,
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
  compact = true,
}: DNASynthesisLoaderProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef<number>(0);

  const activeRuleList = useMemo(
    () => Object.entries(activeRules).filter(([, v]) => v).map(([k]) => k),
    [activeRules]
  );

  const palette = useMemo(
    () =>
      activeRuleList.length > 0
        ? activeRuleList.map((r) => RULE_COLORS[r])
        : FALLBACK_PALETTE,
    [activeRuleList]
  );

  const completion = Math.min(1, Math.max(0, progress / 100));
  const displayStatus = statusForProgress(progress, statusText);

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
    const STRAND_RADIUS = compact ? 34 : 48;
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
      const completionFactor = Math.min(1, progress / 100);
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
          const dotSize = (2 + depth * 1.5) * majorBoost * (compact ? 0.95 : 1.08);

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
  }, [activeRuleList.join(','), progress, palette.join(','), compact]);

  const canvasW = compact ? 200 : 280;
  const canvasH = compact ? 240 : 320;

  return (
    <div className="flex flex-col items-center gap-3 w-full max-w-[320px] mx-auto overflow-visible px-2">
      <p className="text-[11px] font-headline font-bold uppercase tracking-[0.35em] text-primary/90">
        Creative Syncing
      </p>

      <div
        className="relative w-full flex justify-center items-center overflow-visible"
        style={{ minHeight: canvasH + 8 }}
      >
        <LogoMotif compact={compact} />
        <canvas
          ref={canvasRef}
          width={canvasW}
          height={canvasH}
          className="relative z-10 block"
          style={{
            filter: `drop-shadow(0 0 ${12 + progress * 0.25}px rgba(217,70,239,${0.2 + completion * 0.35}))`,
          }}
        />
      </div>

      {activeRuleList.length > 0 && (
        <div className="w-full max-w-[260px] rounded-lg border border-white/10 bg-black/50 backdrop-blur-sm px-2.5 py-2">
          <p className="text-[8px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1 mb-1.5">
            <Hexagon className="h-2.5 w-2.5 text-primary" /> Active Neural Strains
          </p>
          <div className="flex flex-wrap gap-x-2 gap-y-1 justify-center">
            {activeRuleList.map((rule) => (
              <div key={rule} className="flex items-center gap-1">
                <div
                  className="w-2 h-2 rounded-full shrink-0 animate-pulse"
                  style={{
                    backgroundColor: RULE_COLORS[rule],
                    boxShadow: `0 0 6px ${RULE_COLORS[rule]}`,
                  }}
                />
                <span className="text-[7px] font-bold uppercase tracking-wider text-muted-foreground">
                  {RULE_LABELS[rule]}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <p className="text-[9px] font-code uppercase tracking-[0.2em] text-muted-foreground animate-pulse text-center leading-relaxed px-2">
        {displayStatus}
      </p>
    </div>
  );
}
