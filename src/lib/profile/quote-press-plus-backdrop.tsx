import type { ReactNode } from 'react';
import type { QuotePressPlusLayer } from '@/lib/profile/quote-press-plus-layers';

const GRAIN_URI =
  "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.5'/%3E%3C/svg%3E\")";

export function renderPlusLayerBackdrop(layer: QuotePressPlusLayer): ReactNode {
  const { color, accent, durationSec, variant } = layer;
  const anim = 'qp-anim pointer-events-none absolute';
  switch (layer.kind) {
    case 'conicSweep':
      return (
        <div
          className={`${anim} -inset-[25%] opacity-70 blur-2xl`}
          style={{
            background: `conic-gradient(from ${variant * 90}deg, ${color}, ${accent}, transparent, ${color})`,
            animation: `qp-plus-spin ${durationSec}s linear infinite`,
          }}
          aria-hidden
        />
      );
    case 'bokehOrbs':
      return (
        <div className={`${anim} inset-0`} aria-hidden>
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className="qp-anim absolute rounded-full blur-2xl"
              style={{
                width: `${18 + i * 8}%`,
                height: `${18 + i * 8}%`,
                left: `${10 + i * 18}%`,
                top: `${12 + (variant + i) * 14}%`,
                background: i % 2 ? accent : color,
                animation: `qp-plus-float ${durationSec + i}s ease-in-out infinite`,
                animationDelay: `${i * 0.35}s`,
              }}
            />
          ))}
        </div>
      );
    case 'ribbonSweep':
      return (
        <div
          className={`${anim} -inset-x-[40%] top-[25%] h-[30%] opacity-45 blur-lg`}
          style={{
            background: `linear-gradient(105deg, transparent, ${accent}, ${color}, transparent)`,
            animation: `qp-plus-sweep ${durationSec}s ease-in-out infinite`,
          }}
          aria-hidden
        />
      );
    case 'glassShard':
      return (
        <div
          className={`${anim} inset-0 mix-blend-screen opacity-30`}
          style={{
            background: `linear-gradient(${120 + variant * 30}deg, transparent 40%, ${accent} 50%, transparent 60%)`,
            animation: `qp-plus-shimmer ${durationSec}s ease-in-out infinite`,
          }}
          aria-hidden
        />
      );
    case 'inkRipple':
      return (
        <div
          className={`${anim} inset-[20%] rounded-full border-2`}
          style={{
            borderColor: color,
            animation: `qp-ripple ${durationSec * 0.85}s ease-out infinite`,
          }}
          aria-hidden
        />
      );
    case 'tapeStrip':
      return (
        <div
          className={`${anim} left-[-8%] top-[18%] h-3 w-[116%] -rotate-3 opacity-50`}
          style={{
            background: `repeating-linear-gradient(90deg, ${color}55, ${color}55 6px, transparent 6px, transparent 12px)`,
          }}
          aria-hidden
        />
      );
    case 'halftoneBloom':
      return (
        <div
          className={`${anim} inset-0 opacity-25`}
          style={{
            backgroundImage: `radial-gradient(${accent} 1px, transparent 1px)`,
            backgroundSize: `${8 + variant * 2}px ${8 + variant * 2}px`,
            animation: `qp-plus-breathe ${durationSec}s ease-in-out infinite`,
          }}
          aria-hidden
        />
      );
    case 'signalNoise':
      return (
        <div
          className={`${anim} -inset-[10%] mix-blend-overlay opacity-40`}
          style={{
            backgroundImage: GRAIN_URI,
            animation: `qp-noise-drift ${durationSec * 1.2}s linear infinite`,
          }}
          aria-hidden
        />
      );
    case 'flareCross':
      return (
        <div className={`${anim} inset-0`} aria-hidden>
          <div
            className="absolute left-1/2 top-1/2 h-[120%] w-px -translate-x-1/2 -translate-y-1/2 opacity-35"
            style={{ background: `linear-gradient(transparent, ${accent}, transparent)` }}
          />
          <div
            className="absolute left-1/2 top-1/2 h-px w-[120%] -translate-x-1/2 -translate-y-1/2 opacity-35"
            style={{ background: `linear-gradient(90deg, transparent, ${accent}, transparent)` }}
          />
        </div>
      );
    case 'softBloom':
      return (
        <div
          className={`${anim} inset-[10%] rounded-[inherit] blur-2xl`}
          style={{
            background: `radial-gradient(circle, ${accent}, transparent 70%)`,
            animation: `qp-pulse ${durationSec}s ease-in-out infinite`,
          }}
          aria-hidden
        />
      );
    case 'twinLeak':
      return (
        <>
          <div
            className={`${anim} -left-[15%] top-[8%] h-[55%] w-[45%] rounded-full blur-3xl opacity-50`}
            style={{ background: color }}
            aria-hidden
          />
          <div
            className={`${anim} -right-[12%] bottom-[6%] h-[50%] w-[40%] rounded-full blur-3xl opacity-45`}
            style={{ background: accent }}
            aria-hidden
          />
        </>
      );
    case 'gradientMesh':
      return (
        <div
          className={`${anim} inset-0 opacity-55`}
          style={{
            background: `
              radial-gradient(at 20% 30%, ${color} 0%, transparent 50%),
              radial-gradient(at 80% 20%, ${accent} 0%, transparent 45%),
              radial-gradient(at 60% 80%, ${color} 0%, transparent 50%)`,
            animation: `qp-aurora ${durationSec}s ease-in-out infinite`,
          }}
          aria-hidden
        />
      );
    case 'filmGate':
      return (
        <div
          className={`${anim} inset-x-0 top-0 h-[12%] bg-black/50`}
          style={{ boxShadow: `0 8px 24px ${color}33` }}
          aria-hidden
        />
      );
    case 'scanSweep':
      return (
        <div
          className={`${anim} inset-x-0 h-[18%] opacity-40`}
          style={{
            background: `linear-gradient(180deg, transparent, ${accent}, transparent)`,
            animation: `qp-scan ${durationSec * 0.7}s linear infinite`,
          }}
          aria-hidden
        />
      );
    case 'foilBand':
      return (
        <div
          className={`${anim} inset-x-[8%] bottom-[12%] h-px opacity-70`}
          style={{
            background: `linear-gradient(90deg, transparent, ${color}, ${accent}, transparent)`,
            animation: `qp-plus-shimmer ${durationSec}s ease-in-out infinite`,
          }}
          aria-hidden
        />
      );
    case 'dotMatrix':
      return (
        <div
          className={`${anim} inset-0 opacity-20`}
          style={{
            backgroundImage: `radial-gradient(${color} 1.5px, transparent 1.5px)`,
            backgroundSize: '14px 14px',
          }}
          aria-hidden
        />
      );
    case 'waxSeal':
      return (
        <div
          className={`${anim} right-[10%] top-[10%] h-10 w-10 rounded-full border-2 opacity-50`}
          style={{ borderColor: accent, boxShadow: `0 0 18px ${color}` }}
          aria-hidden
        />
      );
    case 'refraction':
      return (
        <div
          className={`${anim} inset-0 mix-blend-color-dodge opacity-25`}
          style={{
            background: `linear-gradient(${variant * 45}deg, ${color}44, transparent, ${accent}44)`,
            animation: `qp-chroma ${durationSec}s linear infinite`,
          }}
          aria-hidden
        />
      );
    case 'slowShimmer':
      return (
        <div
          className={`${anim} inset-0 opacity-35`}
          style={{
            background: `linear-gradient(120deg, transparent 30%, ${accent} 50%, transparent 70%)`,
            animation: `qp-plus-sweep ${durationSec * 1.4}s ease-in-out infinite`,
          }}
          aria-hidden
        />
      );
    case 'edgeGlow':
      return (
        <div
          className={`${anim} inset-0 rounded-[inherit]`}
          style={{ boxShadow: `inset 0 0 28px ${color}, inset 0 0 48px ${accent}` }}
          aria-hidden
        />
      );
    case 'depthFog':
      return (
        <div
          className={`${anim} inset-0`}
          style={{
            background: `radial-gradient(ellipse 80% 60% at 50% 100%, ${color}55, transparent)`,
            animation: `qp-breathe ${durationSec}s ease-in-out infinite`,
          }}
          aria-hidden
        />
      );
    case 'prismRing':
      return (
        <div
          className={`${anim} inset-[14%] rounded-full border`}
          style={{
            borderColor: accent,
            animation: `qp-halo ${durationSec}s ease-in-out infinite`,
          }}
          aria-hidden
        />
      );
    case 'slideSheen':
      return (
        <div
          className={`${anim} -inset-y-[20%] left-[-30%] w-[45%] skew-x-12 opacity-30 blur-md`}
          style={{
            background: accent,
            animation: `qp-plus-sweep ${durationSec * 0.9}s ease-in-out infinite`,
          }}
          aria-hidden
        />
      );
    case 'staticRain':
      return (
        <div
          className={`${anim} inset-0 opacity-15`}
          style={{
            backgroundImage: `linear-gradient(180deg, ${color}22 1px, transparent 1px)`,
            backgroundSize: '3px 8px',
            animation: `qp-scan ${durationSec * 0.5}s linear infinite`,
          }}
          aria-hidden
        />
      );
    case 'ghostLines':
      return (
        <div className={`${anim} inset-0`} aria-hidden>
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="absolute inset-x-[12%] h-px opacity-25"
              style={{
                top: `${22 + i * 22}%`,
                background: `linear-gradient(90deg, transparent, ${color}, transparent)`,
              }}
            />
          ))}
        </div>
      );
    case 'liquidMetal':
      return (
        <div
          className={`${anim} inset-0 mix-blend-screen opacity-30`}
          style={{
            background: `linear-gradient(160deg, ${color}, ${accent}, ${color})`,
            animation: `qp-prism ${durationSec}s ease-in-out infinite`,
          }}
          aria-hidden
        />
      );
    case 'sunRays':
      return (
        <div
          className={`${anim} -inset-[30%] opacity-25`}
          style={{
            background: `conic-gradient(from 0deg at 50% 120%, transparent, ${accent}, transparent 25%)`,
            animation: `qp-plus-spin ${durationSec * 2}s linear infinite`,
          }}
          aria-hidden
        />
      );
    case 'moonArc':
      return (
        <div
          className={`${anim} right-[-5%] top-[-8%] h-24 w-24 rounded-full opacity-35 blur-sm`}
          style={{ background: `radial-gradient(circle at 30% 30%, ${accent}, transparent 65%)` }}
          aria-hidden
        />
      );
    case 'vinylSpin':
      return (
        <div
          className={`${anim} left-1/2 top-1/2 h-[55%] w-[55%] -translate-x-1/2 -translate-y-1/2 rounded-full border opacity-25`}
          style={{
            borderColor: color,
            background: `repeating-radial-gradient(circle, ${accent}22 0 2px, transparent 2px 6px)`,
            animation: `qp-plus-spin ${durationSec * 1.6}s linear infinite`,
          }}
          aria-hidden
        />
      );
    case 'threadWeave':
      return (
        <div
          className={`${anim} inset-0 opacity-20`}
          style={{
            backgroundImage: `linear-gradient(${color} 1px, transparent 1px), linear-gradient(90deg, ${accent} 1px, transparent 1px)`,
            backgroundSize: '22px 22px',
          }}
          aria-hidden
        />
      );
    case 'pixelDust':
      return (
        <div className={`${anim} inset-0`} aria-hidden>
          {Array.from({ length: 12 }, (_, i) => (
            <div
              key={i}
              className="qp-anim absolute h-1 w-1 rounded-sm"
              style={{
                left: `${(i * 17 + variant * 5) % 92}%`,
                top: `${(i * 23 + variant * 7) % 88}%`,
                background: i % 2 ? color : accent,
                animation: `qp-twinkle ${2 + (i % 4)}s ease-in-out infinite`,
              }}
            />
          ))}
        </div>
      );
    case 'chromaPulse':
      return (
        <div
          className={`${anim} inset-[12%] rounded-[inherit] opacity-40`}
          style={{
            background: `linear-gradient(${variant * 60}deg, ${color}44, ${accent}55)`,
            animation: `qp-plus-breathe ${durationSec}s ease-in-out infinite`,
          }}
          aria-hidden
        />
      );
    default:
      return null;
  }
}
