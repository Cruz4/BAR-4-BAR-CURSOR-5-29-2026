'use client';

/**
 * Living Field — multi-layer composition + scroll parallax.
 *
 * Seed picks a unique stack from 12 layer vocabularies. Scroll shifts depth /
 * phase (inviting, reactive). Hue never changes with scroll.
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import {
  apertureMask,
  pressTokens,
  type FieldLayer,
  type PressingConfig,
  type PressingTokens,
} from '@/lib/profile/pressing';

const GRAIN_DATA_URI =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' seed='2'/%3E%3C/filter%3E%3Crect width='160' height='160' filter='url(%23n)' opacity='1'/%3E%3C/svg%3E\")";

const LIVING_CSS = `
@keyframes ph-groove-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
@keyframes ph-groove-spin-rev { from { transform: rotate(0deg); } to { transform: rotate(-360deg); } }
@keyframes ph-well-breath {
  0%, 100% { opacity: var(--ph-well-o, 0.35); transform: scale(1); }
  50% { opacity: calc(var(--ph-well-o, 0.35) * 1.45); transform: scale(1.06); }
}
@keyframes ph-ghost-drift {
  0% { transform: translate3d(-1.5%, 1%, 0); }
  50% { transform: translate3d(1.5%, -1%, 0); }
  100% { transform: translate3d(-1.5%, 1%, 0); }
}
@keyframes ph-ribbon-flow {
  0% { transform: translateX(-2%); opacity: 0.7; }
  50% { transform: translateX(2%); opacity: 1; }
  100% { transform: translateX(-2%); opacity: 0.7; }
}
@keyframes ph-ripple {
  0% { transform: scale(0.35); opacity: 0.35; }
  70% { opacity: 0.08; }
  100% { transform: scale(1.55); opacity: 0; }
}
@keyframes ph-mote {
  0%, 100% { transform: translate3d(0,0,0); }
  50% { transform: translate3d(1.2%, -1.8%, 0); }
}
@keyframes ph-blade-sweep {
  0% { transform: translateX(-30%) rotate(var(--ph-blade-a, 0deg)); opacity: 0.15; }
  50% { transform: translateX(10%) rotate(var(--ph-blade-a, 0deg)); opacity: 0.45; }
  100% { transform: translateX(-30%) rotate(var(--ph-blade-a, 0deg)); opacity: 0.15; }
}
@keyframes ph-stylus-glow {
  0%, 100% { opacity: 0.5; }
  50% { opacity: 1; }
}
@media (prefers-reduced-motion: reduce) {
  .ph-living-anim { animation: none !important; }
}
`;

type LivingPressFieldProps = {
  config?: PressingConfig;
  tokens?: PressingTokens;
  compact?: boolean;
  className?: string;
  onTokensChange?: (tokens: PressingTokens) => void;
};

function useSmoothScroll(enabled: boolean): number {
  const [scroll, setScroll] = useState(0);
  const target = useRef(0);
  const raf = useRef<number | null>(null);

  useEffect(() => {
    if (!enabled) return;
    const read = () => {
      const max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
      target.current = window.scrollY / max;
    };
    const tick = () => {
      setScroll((prev) => {
        const next = prev + (target.current - prev) * 0.08;
        return Math.abs(next - prev) < 0.0004 ? target.current : next;
      });
      raf.current = window.requestAnimationFrame(tick);
    };
    read();
    window.addEventListener('scroll', read, { passive: true });
    raf.current = window.requestAnimationFrame(tick);
    return () => {
      window.removeEventListener('scroll', read);
      if (raf.current) window.cancelAnimationFrame(raf.current);
    };
  }, [enabled]);

  return scroll;
}

function LayerView({
  layer,
  tokens,
  scroll,
  motionOk,
  restless,
  compact,
}: {
  layer: FieldLayer;
  tokens: PressingTokens;
  scroll: number;
  motionOk: boolean;
  restless: boolean;
  compact: boolean;
}) {
  const stroke = `hsl(${tokens.hue} ${Math.round(tokens.saturation * 0.7)}% 68%)`;
  const fillSoft = `hsl(${tokens.hue} ${Math.round(tokens.saturation * 0.6)}% 58%)`;
  const speedMul = restless ? 0.55 : 1;
  const parallax = (1 - layer.depth) * scroll * (compact ? 12 : 28);
  const parallaxX = (layer.depth - 0.5) * scroll * (compact ? 6 : 14);

  const wrap = (child: React.ReactNode) => (
    <div
      className="absolute inset-0"
      style={{
        transform: `translate3d(${parallaxX.toFixed(2)}px, ${parallax.toFixed(2)}px, 0)`,
        willChange: 'transform',
      }}
    >
      {child}
    </div>
  );

  switch (layer.kind) {
    case 'grooves':
      return wrap(
        <svg
          className="absolute left-1/2 top-[40%] h-[min(110vw,920px)] w-[min(110vw,920px)] -translate-x-1/2 -translate-y-1/2"
          viewBox="0 0 100 100"
        >
          {layer.rings.map((ring, i) => (
            <g
              key={i}
              className={motionOk ? 'ph-living-anim' : undefined}
              style={{
                transformOrigin: '50px 50px',
                animation: motionOk
                  ? `${ring.reverse ? 'ph-groove-spin-rev' : 'ph-groove-spin'} ${ring.rotateSec * speedMul}s linear infinite`
                  : undefined,
              }}
            >
              <path
                d={ring.d}
                fill="none"
                stroke={stroke}
                strokeOpacity={ring.opacity}
                strokeWidth={ring.strokeWidth}
                strokeLinejoin="round"
              />
            </g>
          ))}
          {motionOk && layer.stylusPath && (
            <g className="ph-living-anim" style={{ animation: 'ph-stylus-glow var(--ph-breath) ease-in-out infinite' }}>
              <circle r={compact ? 0.55 : 0.85} fill={fillSoft}>
                <animateMotion
                  dur={`${layer.stylusSec * speedMul}s`}
                  repeatCount="indefinite"
                  path={layer.stylusPath}
                />
              </circle>
            </g>
          )}
        </svg>
      );

    case 'wells':
      return wrap(
        <div className="absolute inset-0">
          {layer.wells.map((w, i) => (
            <div
              key={i}
              className={cn('absolute rounded-full blur-3xl', motionOk && 'ph-living-anim')}
              style={
                {
                  left: `${w.x}%`,
                  top: `${w.y}%`,
                  width: `${w.r * (compact ? 3 : 5)}vmin`,
                  height: `${w.r * (compact ? 3 : 5)}vmin`,
                  marginLeft: '-10%',
                  marginTop: '-10%',
                  background: fillSoft,
                  ['--ph-well-o' as string]: String(w.opacity * (0.85 + scroll * 0.25)),
                  opacity: w.opacity,
                  animation: motionOk
                    ? `ph-well-breath calc(var(--ph-breath) * ${1 + i * 0.25}) ease-in-out infinite`
                    : undefined,
                  animationDelay: `${i * 0.4}s`,
                } as React.CSSProperties
              }
            />
          ))}
        </div>
      );

    case 'ribbons':
      return wrap(
        <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
          {layer.paths.map((p, i) => (
            <path
              key={i}
              d={p.d}
              fill="none"
              stroke={stroke}
              strokeOpacity={p.opacity * (0.75 + scroll * 0.35)}
              strokeWidth={p.width}
              strokeLinecap="round"
              className={motionOk ? 'ph-living-anim' : undefined}
              style={{
                animation: motionOk
                  ? `ph-ribbon-flow calc(var(--ph-motion) * ${0.8 + i * 0.2}) ease-in-out infinite`
                  : undefined,
              }}
            />
          ))}
        </svg>
      );

    case 'mesh': {
      const lines: React.ReactNode[] = [];
      const warp = layer.warp * (1 + scroll * 0.35);
      for (let c = 0; c <= layer.cols; c++) {
        const x = (c / layer.cols) * 100;
        const bulge = Math.sin((c / layer.cols) * Math.PI + scroll * Math.PI) * warp * 3;
        lines.push(
          <path
            key={`c${c}`}
            d={`M ${x} 0 Q ${x + bulge} 50 ${x} 100`}
            fill="none"
            stroke={stroke}
            strokeOpacity={layer.opacity}
            strokeWidth={0.15}
          />
        );
      }
      for (let r = 0; r <= layer.rows; r++) {
        const y = (r / layer.rows) * 100;
        const bulge = Math.cos((r / layer.rows) * Math.PI + scroll * Math.PI) * warp * 3;
        lines.push(
          <path
            key={`r${r}`}
            d={`M 0 ${y} Q 50 ${y + bulge} 100 ${y}`}
            fill="none"
            stroke={stroke}
            strokeOpacity={layer.opacity}
            strokeWidth={0.15}
          />
        );
      }
      return wrap(
        <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
          {lines}
        </svg>
      );
    }

    case 'ghosts':
      return wrap(
        <div className="absolute inset-0 overflow-hidden">
          {layer.words.map((w, i) => (
            <p
              key={i}
              className={cn(
                'absolute font-headline font-bold uppercase leading-none select-none',
                motionOk && 'ph-living-anim'
              )}
              style={{
                left: `${w.x}%`,
                top: `${w.y + scroll * 8}%`,
                fontSize: compact ? `${w.size * 0.45}vw` : `${w.size}vw`,
                color: `hsl(${tokens.hue} 28% 82%)`,
                opacity: 0.035 + scroll * 0.02,
                transform: `rotate(${w.rot}deg)`,
                mixBlendMode: 'soft-light',
                animation: motionOk
                  ? `ph-ghost-drift calc(var(--ph-motion) * ${1.1 + i * 0.3}) ease-in-out infinite`
                  : undefined,
              }}
            >
              {w.text}
            </p>
          ))}
        </div>
      );

    case 'curtains':
      return wrap(
        <div className="absolute inset-0">
          {layer.sheets.map((s, i) => (
            <div
              key={i}
              className="absolute top-0 h-full"
              style={{
                left: `${s.x + scroll * (i % 2 === 0 ? -4 : 4)}%`,
                width: `${s.width}%`,
                marginLeft: `-${s.width / 2}%`,
                background: `linear-gradient(180deg, transparent, ${fillSoft}, transparent)`,
                opacity: s.opacity * (0.8 + scroll * 0.4),
                filter: 'blur(18px)',
                mixBlendMode: 'screen',
              }}
            />
          ))}
        </div>
      );

    case 'facets':
      return wrap(
        <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
          {layer.polys.map((p, i) => (
            <polygon
              key={i}
              points={p.points}
              fill={fillSoft}
              fillOpacity={p.opacity * (0.7 + scroll * 0.4)}
              stroke={stroke}
              strokeOpacity={p.opacity * 1.4}
              strokeWidth={0.2}
              style={{ transform: `translateY(${(scroll * (i + 1) * 1.5).toFixed(2)}px)` }}
            />
          ))}
        </svg>
      );

    case 'ripples':
      return wrap(
        <div className="absolute inset-0">
          {layer.origins.map((o, i) => (
            <div
              key={i}
              className="absolute"
              style={{ left: `${o.x}%`, top: `${o.y}%` }}
            >
              {[0, 1, 2].map((ring) => (
                <span
                  key={ring}
                  className={cn('absolute rounded-full border', motionOk && 'ph-living-anim')}
                  style={{
                    width: compact ? 80 : 160,
                    height: compact ? 80 : 160,
                    marginLeft: compact ? -40 : -80,
                    marginTop: compact ? -40 : -80,
                    borderColor: stroke,
                    opacity: 0.2,
                    animation: motionOk
                      ? `ph-ripple calc(var(--ph-breath) * ${1.4 + ring * 0.35}) ease-out infinite`
                      : undefined,
                    animationDelay: `${o.delay + ring * 0.55 + scroll * 0.4}s`,
                  }}
                />
              ))}
            </div>
          ))}
        </div>
      );

    case 'arcs':
      return wrap(
        <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
          {layer.curves.map((c, i) => (
            <path
              key={i}
              d={c.d}
              fill="none"
              stroke={stroke}
              strokeOpacity={c.opacity * (0.7 + scroll * 0.4)}
              strokeWidth={0.35}
              strokeLinecap="round"
            />
          ))}
        </svg>
      );

    case 'motes':
      return wrap(
        <div className="absolute inset-0">
          {layer.orbs.map((o, i) => (
            <span
              key={i}
              className={cn('absolute rounded-full blur-md', motionOk && 'ph-living-anim')}
              style={{
                left: `${o.x}%`,
                top: `${o.y + scroll * o.drift * 6}%`,
                width: o.r * (compact ? 4 : 7),
                height: o.r * (compact ? 4 : 7),
                background: fillSoft,
                opacity: o.opacity,
                animation: motionOk
                  ? `ph-mote calc(var(--ph-motion) * ${o.drift}) ease-in-out infinite`
                  : undefined,
                animationDelay: `${i * 0.2}s`,
              }}
            />
          ))}
        </div>
      );

    case 'blade':
      return wrap(
        <div
          className={cn('absolute inset-y-[-20%] left-1/2 w-[18%] -translate-x-1/2', motionOk && 'ph-living-anim')}
          style={
            {
              ['--ph-blade-a' as string]: `${layer.angle + scroll * 8}deg`,
              background: `linear-gradient(90deg, transparent, ${fillSoft}, transparent)`,
              opacity: layer.opacity,
              filter: 'blur(12px)',
              mixBlendMode: 'screen',
              animation: motionOk ? `ph-blade-sweep calc(var(--ph-motion) * 0.9) ease-in-out infinite` : undefined,
            } as React.CSSProperties
          }
        />
      );

    case 'film': {
      const edge = (side: 'left' | 'right') => (
        <div
          key={side}
          className="absolute top-0 h-full w-10 sm:w-14"
          style={{
            [side]: 0,
            background:
              side === 'left'
                ? `linear-gradient(90deg, ${fillSoft}, transparent)`
                : `linear-gradient(270deg, ${fillSoft}, transparent)`,
            opacity: layer.opacity * (0.7 + scroll * 0.3),
            maskImage:
              'repeating-linear-gradient(to bottom, #000 0 10px, transparent 10px 18px)',
            WebkitMaskImage:
              'repeating-linear-gradient(to bottom, #000 0 10px, transparent 10px 18px)',
          }}
        />
      );
      return wrap(
        <div className="absolute inset-0">
          {(layer.side === 'left' || layer.side === 'both') && edge('left')}
          {(layer.side === 'right' || layer.side === 'both') && edge('right')}
        </div>
      );
    }

    default:
      return null;
  }
}

export function LivingPressField({
  config,
  tokens: tokensProp,
  compact = false,
  className,
  onTokensChange,
}: LivingPressFieldProps) {
  const [reducedMotion, setReducedMotion] = useState(false);

  const tokens = useMemo(() => {
    if (config) return pressTokens(config);
    return tokensProp!;
  }, [config, tokensProp]);

  useEffect(() => {
    onTokensChange?.(tokens);
  }, [tokens, onTokensChange]);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(mq.matches);
    const onChange = () => setReducedMotion(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  const motionOk = tokens.alive && !reducedMotion;
  const showLife = tokens.alive;
  const restless = tokens.autoDrift && motionOk;
  const scroll = useSmoothScroll(showLife && !compact && !reducedMotion);
  const pos = compact ? 'absolute' : 'fixed';
  const vignette = apertureMask(tokens.aperture, tokens.hue);

  return (
    <div aria-hidden className={cn('pointer-events-none inset-0 overflow-hidden', pos, className)}>
      <style>{LIVING_CSS}</style>

      <div
        className="absolute inset-0"
        style={{
          background: `radial-gradient(ellipse 90% 70% at 50% 38%, hsl(${tokens.hue} ${Math.round(tokens.saturation * 0.32)}% ${tokens.bgL + 2}%), var(--ph-bg))`,
        }}
      />

      {showLife &&
        tokens.layers.map((layer, i) => (
          <LayerView
            key={`${layer.kind}-${i}`}
            layer={layer}
            tokens={tokens}
            scroll={scroll}
            motionOk={motionOk}
            restless={restless}
            compact={compact}
          />
        ))}

      <div className="absolute inset-0" style={{ background: vignette }} />

      {!compact && (
        <div
          className="absolute inset-0"
          style={{
            background:
              'radial-gradient(ellipse 66% 56% at 50% 38%, transparent 18%, color-mix(in srgb, var(--ph-bg) 90%, transparent) 100%)',
          }}
        />
      )}

      <p className="absolute bottom-6 right-6 font-code text-[9px] uppercase tracking-[0.35em] text-[var(--ph-muted)] opacity-40">
        {tokens.plateSerial}
        {' · '}
        {tokens.compositionId}
        {restless ? ' · restless' : ''}
      </p>

      <div
        className="absolute inset-0 mix-blend-overlay"
        style={{ backgroundImage: GRAIN_DATA_URI, opacity: 'var(--ph-grain)' }}
      />
    </div>
  );
}
