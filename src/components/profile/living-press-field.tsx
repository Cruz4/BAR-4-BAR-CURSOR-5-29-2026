'use client';

/**
 * Living Field — multi-layer composition + scroll parallax.
 *
 * Seed picks a unique stack from 24 layer vocabularies. Scroll shifts depth /
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
  100% { transform: scale(1.45); opacity: 0.06; }
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
@keyframes ph-scan-sweep {
  0% { transform: translateY(0%); opacity: 0.2; }
  50% { opacity: 0.55; }
  100% { transform: translateY(88%); opacity: 0.2; }
}
@keyframes ph-orbit-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
@keyframes ph-aurora-shift {
  0%, 100% { opacity: 0.55; filter: blur(28px) hue-rotate(0deg); }
  50% { opacity: 0.95; filter: blur(34px) hue-rotate(8deg); }
}
@keyframes ph-signal-pulse {
  0%, 100% { stroke-opacity: 0.45; }
  50% { stroke-opacity: 1; }
}
@keyframes ph-nova-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
@keyframes ph-circuit-blink {
  0%, 100% { opacity: 0.45; }
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
  /**
   * Window-scroll parallax. Overlay surfaces (immersive Scene feed) keep the
   * same look at scroll=0 and skip the unused window RAF.
   */
  followWindowScroll?: boolean;
  /**
   * Paint the composition (layers, hue, vignette, grain) with no breathe, spin,
   * or parallax. Swipe-feed only — Artist Home stays alive.
   */
  staticField?: boolean;
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
                  ? `${ring.reverse ? 'ph-groove-spin-rev' : 'ph-groove-spin'} ${ring.rotateSec * speedMul}s linear infinite alternate`
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
            <g className="ph-living-anim" style={{ animation: 'ph-stylus-glow var(--ph-breath) ease-in-out infinite alternate' }}>
              <circle r={compact ? 0.55 : 0.85} fill={fillSoft}>
                <animateMotion
                  dur={`${layer.stylusSec * speedMul * 2}s`}
                  repeatCount="indefinite"
                  path={layer.stylusPath}
                  keyPoints="0;1;0"
                  keyTimes="0;0.5;1"
                  calcMode="linear"
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
                    ? `ph-well-breath calc(var(--ph-breath) * ${1 + i * 0.25}) ease-in-out ${i * 0.4}s infinite alternate`
                    : undefined,
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
                  ? `ph-ribbon-flow calc(var(--ph-motion) * ${0.8 + i * 0.2}) ease-in-out infinite alternate`
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
                  ? `ph-ghost-drift calc(var(--ph-motion) * ${1.1 + i * 0.3}) ease-in-out infinite alternate`
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
                      ? `ph-ripple calc(var(--ph-breath) * ${1.4 + ring * 0.35}) ease-in-out ${o.delay + ring * 0.55}s infinite alternate`
                      : undefined,
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
                  ? `ph-mote calc(var(--ph-motion) * ${o.drift}) ease-in-out ${i * 0.2}s infinite alternate`
                  : undefined,
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
              animation: motionOk ? `ph-blade-sweep calc(var(--ph-motion) * 0.9) ease-in-out infinite alternate` : undefined,
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

    case 'lattice':
      return wrap(
        <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
          {layer.cells.map((c, i) => {
            const pts = [0, 1, 2, 3, 4, 5]
              .map((k) => {
                const a = (Math.PI / 3) * k - Math.PI / 6;
                return `${(c.cx + Math.cos(a) * c.r).toFixed(2)},${(c.cy + Math.sin(a) * c.r * 0.92).toFixed(2)}`;
              })
              .join(' ');
            return (
              <polygon
                key={i}
                points={pts}
                fill="none"
                stroke={stroke}
                strokeOpacity={c.opacity * (0.75 + scroll * 0.4)}
                strokeWidth={0.22}
              />
            );
          })}
        </svg>
      );

    case 'beams': {
      const { focus, rays } = layer;
      return wrap(
        <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
          {rays.map((ray, i) => {
            const rad = (ray.angle * Math.PI) / 180;
            const x2 = focus.x + Math.cos(rad) * ray.length;
            const y2 = focus.y + Math.sin(rad) * ray.length;
            return (
              <line
                key={i}
                x1={focus.x}
                y1={focus.y}
                x2={x2}
                y2={y2}
                stroke={stroke}
                strokeOpacity={ray.opacity * (0.7 + scroll * 0.45)}
                strokeWidth={ray.width}
                strokeLinecap="round"
                style={{ filter: 'blur(0.6px)' }}
              />
            );
          })}
          <circle
            cx={focus.x}
            cy={focus.y}
            r={1.8}
            fill={fillSoft}
            fillOpacity={0.25 + scroll * 0.2}
          />
        </svg>
      );
    }

    case 'orbitals':
      return wrap(
        <svg
          className="absolute left-1/2 top-[42%] h-[min(95vw,780px)] w-[min(95vw,780px)] -translate-x-1/2 -translate-y-1/2"
          viewBox="0 0 100 100"
        >
          <g
            className={motionOk ? 'ph-living-anim' : undefined}
            style={{
              transformOrigin: `${layer.cx}px ${layer.cy}px`,
              animation: motionOk
                ? `ph-orbit-spin ${layer.spinSec * speedMul}s linear infinite alternate`
                : undefined,
            }}
          >
            {layer.rings.map((ring, i) => (
              <circle
                key={`r${i}`}
                cx={layer.cx}
                cy={layer.cy}
                r={ring.r}
                fill="none"
                stroke={stroke}
                strokeOpacity={ring.opacity}
                strokeWidth={0.25}
                strokeDasharray={i % 2 === 0 ? undefined : '1.2 1.8'}
              />
            ))}
            {layer.nodes.map((n, i) => {
              const rad = (n.angle * Math.PI) / 180;
              const x = layer.cx + Math.cos(rad) * n.orbit;
              const y = layer.cy + Math.sin(rad) * n.orbit;
              return (
                <circle
                  key={`n${i}`}
                  cx={x}
                  cy={y}
                  r={n.size}
                  fill={fillSoft}
                  fillOpacity={n.opacity}
                />
              );
            })}
          </g>
        </svg>
      );

    case 'scan':
      return wrap(
        <div className="absolute inset-0 overflow-hidden mix-blend-soft-light">
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: `repeating-linear-gradient(
                to bottom,
                ${stroke} 0 1px,
                transparent 1px ${100 / layer.lineCount}%
              )`,
              opacity: layer.opacity * (0.8 + scroll * 0.35),
            }}
          />
          {motionOk ? (
            <div
              className="ph-living-anim absolute left-0 right-0 h-[12%]"
              style={{
                background: `linear-gradient(180deg, transparent, ${fillSoft}, transparent)`,
                opacity: layer.sweepOpacity,
                filter: 'blur(10px)',
                animation: `ph-scan-sweep ${layer.periodSec * speedMul}s ease-in-out infinite alternate`,
              }}
            />
          ) : null}
        </div>
      );

    case 'constellation':
      return wrap(
        <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
          {layer.edges.map((e, i) => (
            <path
              key={`e${i}`}
              d={e.d}
              fill="none"
              stroke={stroke}
              strokeOpacity={e.opacity * (0.7 + scroll * 0.4)}
              strokeWidth={0.2}
            />
          ))}
          {layer.stars.map((s, i) => (
            <circle
              key={`s${i}`}
              cx={s.x}
              cy={s.y + scroll * 4}
              r={s.r}
              fill={fillSoft}
              fillOpacity={s.opacity}
            />
          ))}
        </svg>
      );

    case 'prisms':
      return wrap(
        <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
          {layer.shards.map((p, i) => (
            <polygon
              key={i}
              points={p.points}
              fill={fillSoft}
              fillOpacity={p.opacity * (0.55 + scroll * 0.35)}
              stroke={stroke}
              strokeOpacity={p.opacity * 1.6}
              strokeWidth={0.18}
            />
          ))}
        </svg>
      );

    case 'aurora':
      return wrap(
        <div className="absolute inset-0 overflow-hidden">
          {layer.bands.map((b, i) => (
            <div
              key={i}
              className={cn('absolute top-[-10%] h-[120%]', motionOk && 'ph-living-anim')}
              style={{
                left: `${b.x + scroll * (i % 2 === 0 ? -3 : 3)}%`,
                width: `${b.width}%`,
                marginLeft: `-${b.width / 2}%`,
                background: `linear-gradient(180deg, transparent 0%, ${fillSoft} 35%, hsl(${tokens.hue2} ${Math.round(tokens.saturation * 0.7)}% 62%) 55%, transparent 100%)`,
                opacity: b.opacity,
                transform: `skewX(${b.skew}deg)`,
                mixBlendMode: 'screen',
                animation: motionOk
                  ? `ph-aurora-shift calc(var(--ph-breath) * ${1.2 + i * 0.35}) ease-in-out ${i * 0.5}s infinite alternate`
                  : undefined,
              }}
            />
          ))}
        </div>
      );

    case 'horizon': {
      const lines: React.ReactNode[] = [];
      const vanishY = layer.vanishY;
      for (let r = 0; r <= layer.rows; r++) {
        const t = r / layer.rows;
        const y = vanishY + t * t * (100 - vanishY);
        lines.push(
          <line
            key={`h${r}`}
            x1={0}
            y1={y}
            x2={100}
            y2={y}
            stroke={stroke}
            strokeOpacity={layer.opacity * (0.4 + t * 0.8)}
            strokeWidth={0.15 + t * 0.15}
          />
        );
      }
      for (let c = 0; c <= layer.cols; c++) {
        const t = c / layer.cols;
        const xTop = 50 + (t - 0.5) * 18;
        const xBot = t * 100;
        lines.push(
          <line
            key={`v${c}`}
            x1={xTop}
            y1={vanishY}
            x2={xBot}
            y2={100}
            stroke={stroke}
            strokeOpacity={layer.opacity * 0.75}
            strokeWidth={0.18}
          />
        );
      }
      return wrap(
        <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
          {lines}
        </svg>
      );
    }

    case 'signal':
      return wrap(
        <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
          {layer.traces.map((t, i) => (
            <path
              key={i}
              d={t.d}
              fill="none"
              stroke={stroke}
              strokeOpacity={t.opacity * (0.7 + scroll * 0.4)}
              strokeWidth={t.width}
              strokeLinecap="round"
              className={motionOk ? 'ph-living-anim' : undefined}
              style={{
                animation: motionOk
                  ? `ph-signal-pulse calc(var(--ph-breath) * ${0.9 + i * 0.25}) ease-in-out infinite alternate`
                  : undefined,
              }}
            />
          ))}
        </svg>
      );

    case 'spires':
      return wrap(
        <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
          {layer.needles.map((n, i) => (
            <line
              key={i}
              x1={n.x}
              y1={100}
              x2={n.x}
              y2={100 - n.height}
              stroke={stroke}
              strokeOpacity={n.opacity * (0.75 + scroll * 0.35)}
              strokeWidth={n.width}
              strokeLinecap="round"
            />
          ))}
        </svg>
      );

    case 'nova': {
      const rays: React.ReactNode[] = [];
      for (let i = 0; i < layer.rays; i++) {
        const a = (i / layer.rays) * Math.PI * 2;
        const len = 28 + (i % 3) * 8;
        rays.push(
          <line
            key={i}
            x1={layer.cx}
            y1={layer.cy}
            x2={layer.cx + Math.cos(a) * len}
            y2={layer.cy + Math.sin(a) * len}
            stroke={stroke}
            strokeOpacity={layer.opacity * (i % 2 === 0 ? 1 : 0.55)}
            strokeWidth={0.2 + (i % 3) * 0.08}
            strokeLinecap="round"
          />
        );
      }
      return wrap(
        <svg
          className="absolute left-1/2 top-[38%] h-[min(90vw,720px)] w-[min(90vw,720px)] -translate-x-1/2 -translate-y-1/2"
          viewBox="0 0 100 100"
        >
          <g
            className={motionOk ? 'ph-living-anim' : undefined}
            style={{
              transformOrigin: `${layer.cx}px ${layer.cy}px`,
              animation: motionOk
                ? `ph-nova-spin ${layer.spinSec * speedMul}s linear infinite alternate`
                : undefined,
            }}
          >
            {rays}
            <circle cx={layer.cx} cy={layer.cy} r={1.4} fill={fillSoft} fillOpacity={0.35} />
          </g>
        </svg>
      );
    }

    case 'circuit':
      return wrap(
        <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
          {layer.traces.map((t, i) => (
            <path
              key={`t${i}`}
              d={t.d}
              fill="none"
              stroke={stroke}
              strokeOpacity={t.opacity * (0.7 + scroll * 0.35)}
              strokeWidth={0.35}
              strokeLinejoin="round"
              strokeLinecap="square"
            />
          ))}
          {layer.nodes.map((n, i) => (
            <circle
              key={`n${i}`}
              cx={n.x}
              cy={n.y}
              r={n.r}
              fill={fillSoft}
              fillOpacity={n.opacity}
              className={motionOk && i % 3 === 0 ? 'ph-living-anim' : undefined}
              style={{
                animation:
                  motionOk && i % 3 === 0
                    ? `ph-circuit-blink calc(var(--ph-breath) * ${1 + (i % 4) * 0.2}) ease-in-out infinite alternate`
                    : undefined,
              }}
            />
          ))}
        </svg>
      );

    default:
      return null;
  }
}

export function LivingPressField({
  config,
  tokens: tokensProp,
  compact = false,
  followWindowScroll = true,
  staticField = false,
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
    if (staticField) return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(mq.matches);
    const onChange = () => setReducedMotion(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [staticField]);

  const motionOk = !staticField && tokens.alive && !reducedMotion;
  const showLife = staticField || tokens.alive;
  const restless = tokens.autoDrift && motionOk;
  const scroll = useSmoothScroll(showLife && !staticField && !compact && !reducedMotion && followWindowScroll);
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
