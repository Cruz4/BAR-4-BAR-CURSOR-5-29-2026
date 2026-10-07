'use client';

/**
 * The Imprint — live quote card renderer.
 */

import React, { forwardRef, useEffect, useLayoutEffect, useMemo, useState } from 'react';
import { useImprintMotionGate } from '@/hooks/use-imprint-motion-gate';
import { useImprintPressPlus } from '@/hooks/use-imprint-press-plus';
import { isPlusLayerKind, type QuotePressPlusLayer } from '@/lib/profile/quote-press-plus-layers';
import { renderPlusLayerBackdrop } from '@/lib/profile/quote-press-plus-backdrop';
import { ensureImprintKeyframesInjected } from '@/lib/profile/imprint-keyframes';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { profileHref } from '@/lib/profile/profile-slug';
import {
  quotePressTokens,
  type QuotePressConfig,
  type QuotePressLayer,
  type QuotePressTokens,
} from '@/lib/profile/quote-press';
import { localQuotePressFontFamily } from '@/lib/fonts/quote-press-fonts';
import { imprintDisplayText } from '@/lib/profile/imprint-word-break';
import { EmojiFontText } from '@/components/profile/emoji-font-text';
import { MentionText } from '@/components/profile/mention-text';

const GRAIN_URI =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3' seed='4'/%3E%3C/filter%3E%3Crect width='140' height='140' filter='url(%23n)' opacity='1'/%3E%3C/svg%3E\")";

function LayerBackdrop({ layer }: { layer: QuotePressLayer }) {
  if (isPlusLayerKind(layer.kind)) {
    return renderPlusLayerBackdrop(layer as QuotePressPlusLayer);
  }
  switch (layer.kind) {
    case 'gradientWash':
      return (
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background: `linear-gradient(${layer.angle}deg, ${layer.from}, ${layer.via}, ${layer.to})`,
          }}
          aria-hidden
        />
      );
    case 'grain':
      return (
        <div
          className="pointer-events-none absolute inset-0 mix-blend-overlay"
          style={{
            backgroundImage: GRAIN_URI,
            opacity: layer.opacity,
          }}
          aria-hidden
        />
      );
    case 'vignette':
      return (
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background: `radial-gradient(ellipse 85% 75% at 50% 45%, transparent 35%, rgba(0,0,0,${layer.strength}) 100%)`,
          }}
          aria-hidden
        />
      );
    case 'foilRim':
      return (
        <div
          className="pointer-events-none absolute inset-0 rounded-[inherit] p-[2px]"
          style={{
            background: layer.gradient,
            opacity: layer.opacity,
            WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
            WebkitMaskComposite: 'xor',
            maskComposite: 'exclude',
          }}
          aria-hidden
        />
      );
    case 'lightLeak':
      return (
        <div
          className="qp-anim pointer-events-none absolute rounded-full blur-2xl"
          style={{
            left: `${layer.x}%`,
            top: `${layer.y}%`,
            width: `${Math.min(layer.size, 55)}%`,
            height: `${Math.min(layer.size, 55)}%`,
            background: layer.color,
            transform: 'translate(-50%, -50%)',
            opacity: 0.45,
            animation: 'qp-drift 12s ease-in-out infinite',
            zIndex: 0,
          }}
          aria-hidden
        />
      );
    case 'scanLine':
      return (
        <div
          className="qp-anim pointer-events-none absolute inset-x-0 h-[18%]"
          style={{
            background: `linear-gradient(180deg, transparent, ${layer.color}44, transparent)`,
            animation: `qp-scan ${layer.speedSec}s ease-in-out infinite`,
          }}
          aria-hidden
        />
      );
    case 'mesh':
      return (
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            opacity: layer.opacity,
            backgroundImage: `repeating-linear-gradient(0deg, transparent, transparent 11px, rgba(255,255,255,0.06) 11px, rgba(255,255,255,0.06) 12px),
              repeating-linear-gradient(90deg, transparent, transparent ${100 / layer.cols}px, rgba(255,255,255,0.05) ${100 / layer.cols}px, rgba(255,255,255,0.05) ${100 / layer.cols + 1}px)`,
          }}
          aria-hidden
        />
      );
    case 'motes':
      return (
        <svg className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden>
          {layer.dots.map((d, i) => (
            <circle key={i} cx={`${d.x}%`} cy={`${d.y}%`} r={d.r} fill="currentColor" opacity={d.opacity} />
          ))}
        </svg>
      );
    case 'cornerMarks':
      return (
        <svg className="pointer-events-none absolute inset-2 h-[calc(100%-1rem)] w-[calc(100%-1rem)]" aria-hidden>
          <path
            d={
              layer.variant === 0
                ? 'M2 14 V2 H14 M86 2 H98 V14 M98 86 V98 H86 M14 98 H2 V86'
                : layer.variant === 1
                  ? 'M4 20 L4 4 L20 4 M80 4 L96 4 L96 20 M96 80 L96 96 L80 96 M20 96 L4 96 L4 80'
                  : 'M8 2 H2 V8 M92 2 H98 V8 M98 92 V98 H92 M8 98 H2 V92'
            }
            fill="none"
            stroke={layer.color}
            strokeWidth="1.5"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
      );
    case 'serialPlate':
      return null;
    case 'aurora':
      return (
        <div
          className="qp-anim pointer-events-none absolute -inset-[20%] opacity-80"
          style={{
            background: `conic-gradient(from 120deg at 50% 50%, ${layer.from}, ${layer.via}, ${layer.to}, ${layer.from})`,
            animation: `qp-aurora ${layer.durationSec}s ease-in-out infinite`,
            filter: 'blur(28px)',
          }}
          aria-hidden
        />
      );
    case 'starfield':
      return (
        <svg className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden>
          {layer.stars.map((star, i) => (
            <circle
              key={i}
              cx={`${star.x}%`}
              cy={`${star.y}%`}
              r={star.r}
              fill="currentColor"
              className="qp-anim"
              style={{ animation: `qp-twinkle ${2.2 + star.delaySec}s ease-in-out infinite`, animationDelay: `${star.delaySec}s` }}
            />
          ))}
        </svg>
      );
    case 'pulseGlow':
      return (
        <div
          className="qp-anim pointer-events-none absolute inset-[15%] rounded-full blur-3xl"
          style={{
            background: `radial-gradient(circle, ${layer.color}, transparent 68%)`,
            animation: `qp-pulse ${layer.durationSec}s ease-in-out infinite`,
          }}
          aria-hidden
        />
      );
    case 'driftBlob':
      return (
        <div
          className="qp-anim pointer-events-none absolute rounded-full blur-2xl"
          style={{
            left: `${layer.x}%`,
            top: `${layer.y}%`,
            width: `${layer.size}%`,
            height: `${layer.size}%`,
            background: layer.color,
            transform: 'translate(-50%, -50%)',
            animation: `qp-drift ${layer.durationSec}s ease-in-out infinite`,
          }}
          aria-hidden
        />
      );
    case 'rippleRing':
      return (
        <div
          className="qp-anim pointer-events-none absolute inset-[18%] rounded-full border"
          style={{
            borderColor: layer.color,
            animation: `qp-ripple ${layer.durationSec}s ease-out infinite`,
          }}
          aria-hidden
        />
      );
    case 'chromaBand':
      return (
        <div
          className="qp-anim pointer-events-none absolute -inset-x-[30%] top-[20%] h-[35%] opacity-40 blur-xl"
          style={{
            background: `linear-gradient(${layer.angle}deg, transparent, ${layer.color}, transparent)`,
            animation: `qp-chroma ${layer.durationSec}s linear infinite`,
          }}
          aria-hidden
        />
      );
    case 'sparkleField':
      return (
        <svg className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden>
          {layer.sparkles.map((sparkle, i) => (
            <circle
              key={i}
              cx={`${sparkle.x}%`}
              cy={`${sparkle.y}%`}
              r="1.2"
              fill="currentColor"
              className="qp-anim"
              style={{ animation: `qp-twinkle ${1.8 + sparkle.delaySec}s ease-in-out infinite`, animationDelay: `${sparkle.delaySec}s` }}
            />
          ))}
        </svg>
      );
    case 'breatheWash':
      return (
        <div
          className="qp-anim pointer-events-none absolute inset-0"
          style={{
            background: `radial-gradient(ellipse 90% 70% at 50% 40%, ${layer.color}, transparent)`,
            animation: `qp-breathe ${layer.durationSec}s ease-in-out infinite`,
          }}
          aria-hidden
        />
      );
    case 'orbitDots':
      return (
        <div className="pointer-events-none absolute inset-0" aria-hidden>
          {Array.from({ length: layer.count }, (_, i) => (
            <div
              key={i}
              className="qp-anim absolute left-1/2 top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full"
              style={{
                background: layer.color,
                animation: `qp-orbit ${layer.durationSec + i}s linear infinite`,
                animationDelay: `${i * 0.4}s`,
              }}
            />
          ))}
        </div>
      );
    case 'waveWash':
      return (
        <div
          className="qp-anim pointer-events-none absolute inset-x-0 bottom-0 h-[45%] opacity-50"
          style={{
            background: `linear-gradient(180deg, transparent, ${layer.color})`,
            animation: `qp-wave ${layer.durationSec}s ease-in-out infinite`,
          }}
          aria-hidden
        />
      );
    case 'prismaticSheen':
      return (
        <div
          className="qp-anim pointer-events-none absolute inset-0 mix-blend-screen"
          style={{
            opacity: layer.opacity,
            background: 'linear-gradient(120deg, rgba(255,0,120,.18), rgba(0,220,255,.16), rgba(255,220,0,.14))',
            animation: `qp-prism ${layer.durationSec}s ease-in-out infinite`,
          }}
          aria-hidden
        />
      );
    case 'inkBleed':
      return (
        <div
          className="pointer-events-none absolute rounded-full blur-3xl"
          style={{
            left: `${layer.x}%`,
            top: `${layer.y}%`,
            width: '42%',
            height: '42%',
            transform: 'translate(-50%, -50%)',
            background: `radial-gradient(circle, ${layer.color}, transparent 70%)`,
          }}
          aria-hidden
        />
      );
    case 'haloPulse':
      return (
        <div
          className="qp-anim pointer-events-none absolute inset-[8%] rounded-[inherit] border"
          style={{
            borderColor: layer.color,
            boxShadow: `0 0 24px ${layer.color}`,
            animation: `qp-halo ${layer.durationSec}s ease-in-out infinite`,
          }}
          aria-hidden
        />
      );
    case 'noiseDrift':
      return (
        <div
          className="qp-anim pointer-events-none absolute -inset-[15%] mix-blend-overlay"
          style={{
            backgroundImage: GRAIN_URI,
            opacity: layer.opacity,
            animation: `qp-noise-drift ${layer.durationSec}s linear infinite`,
          }}
          aria-hidden
        />
      );
    case 'laserGrid':
      return (
        <div
          className="qp-anim pointer-events-none absolute inset-0 opacity-25"
          style={{
            backgroundImage: `linear-gradient(${layer.color}55 1px, transparent 1px), linear-gradient(90deg, ${layer.color}55 1px, transparent 1px)`,
            backgroundSize: '28px 28px',
            animation: `qp-grid ${layer.durationSec}s linear infinite`,
          }}
          aria-hidden
        />
      );
    case 'emberField':
      return (
        <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
          {layer.embers.map((ember, i) => (
            <div
              key={i}
              className="qp-anim absolute bottom-0 h-2 w-2 rounded-full bg-orange-300/80 blur-[1px]"
              style={{
                left: `${ember.x}%`,
                animation: `qp-ember ${4 + ember.delaySec}s ease-in infinite`,
                animationDelay: `${ember.delaySec}s`,
              }}
            />
          ))}
        </div>
      );
    default:
      return null;
  }
}

function baseTextStyle(tokens: QuotePressTokens): React.CSSProperties {
  return {
    color: tokens.textColor,
    textShadow: tokens.textShadow,
  };
}

function renderDisplayChunk(
  chunk: string,
  withMentions: boolean | undefined,
  style: React.CSSProperties,
  key: string
) {
  const display = imprintDisplayText(chunk);
  return (
    <span key={key} style={style}>
      {withMentions ? (
        <MentionText text={display} />
      ) : (
        <EmojiFontText text={display} style={style} />
      )}
    </span>
  );
}

function ImprintTextBody({
  text,
  tokens,
  withMentions,
}: {
  text: string;
  tokens: QuotePressTokens;
  withMentions?: boolean;
}) {
  const sorted = [...tokens.highlights].sort((a, b) => a.start - b.start);

  if (!sorted.length && tokens.fillMode !== 'solid') {
    const chunks = text.split(/(\s+)/);
    const contentWordCount = chunks.filter((part) => part && !/^\s+$/.test(part)).length;
    const splitAt = Math.ceil(contentWordCount / 2);
    let wordIndex = 0;
    return (
      <span style={baseTextStyle(tokens)}>
        {chunks.map((part, i) => {
          if (!part) return null;
          if (/^\s+$/.test(part)) {
            return <span key={`ws-${i}`}>{part}</span>;
          }
          const useAccent =
            tokens.fillMode === 'gradient' ? wordIndex % 2 === 1 : wordIndex >= splitAt;
          wordIndex += 1;
          return renderDisplayChunk(
            part,
            withMentions,
            { color: useAccent ? tokens.accentColor : tokens.textColor },
            `w-${i}`
          );
        })}
      </span>
    );
  }

  if (!sorted.length) {
    const display = imprintDisplayText(text);
    const body = withMentions ? (
      <MentionText text={display} />
    ) : (
      <EmojiFontText text={display} style={baseTextStyle(tokens)} />
    );
    return <span style={baseTextStyle(tokens)}>{body}</span>;
  }

  const parts: React.ReactNode[] = [];
  let cursor = 0;
  sorted.forEach((hl, i) => {
    if (hl.start > cursor) {
      const chunk = text.slice(cursor, hl.start);
      parts.push(
        renderDisplayChunk(chunk, withMentions, { color: tokens.textColor }, `t-${i}`)
      );
    }
    const chunk = text.slice(hl.start, hl.end);
    parts.push(
      <span
        key={`h-${i}`}
        style={{
          ...hl.style,
          color: hl.style.color || tokens.accentColor,
        }}
      >
        {withMentions ? (
          <MentionText text={imprintDisplayText(chunk)} />
        ) : (
          <EmojiFontText text={imprintDisplayText(chunk)} style={{ color: hl.style.color || tokens.accentColor }} />
        )}
      </span>
    );
    cursor = hl.end;
  });
  if (cursor < text.length) {
    const chunk = text.slice(cursor);
    parts.push(
      renderDisplayChunk(chunk, withMentions, { color: tokens.textColor }, 'tail')
    );
  }

  return (
    <span style={{ textShadow: tokens.textShadow }}>
      {parts}
    </span>
  );
}

function ImprintSignature({
  accentColor,
  creatorSlug,
}: {
  accentColor: string;
  creatorSlug?: string;
}) {
  const href = creatorSlug ? profileHref(creatorSlug) : undefined;
  const label = creatorSlug ? `AKAsheet/${creatorSlug}` : 'AKAsheet';

  return (
    <div
      className="absolute bottom-2 right-2 z-[2] max-w-[88%] text-right"
      data-imprint-signature
    >
      {href ? (
        <Link
          href={href}
          className="font-code text-[9px] tracking-[0.08em] opacity-55 transition-opacity hover:opacity-75"
          style={{ color: accentColor }}
        >
          {label}
        </Link>
      ) : (
        <span
          className="font-code text-[9px] tracking-[0.08em] opacity-55"
          style={{ color: accentColor }}
        >
          {label}
        </span>
      )}
    </div>
  );
}

export type QuotePressCardProps = {
  text: string;
  config?: QuotePressConfig | null;
  /** Tighter padding for nested reply cards — typography matches the feed card. */
  compact?: boolean;
  withMentions?: boolean;
  className?: string;
  /** Artist slug for AKAsheet/{slug} signature link. */
  creatorSlug?: string;
  /** Hide signature for composer-only previews when needed. */
  showSignature?: boolean;
};

export const QuotePressCard = forwardRef<HTMLDivElement, QuotePressCardProps>(function QuotePressCard(
  {
    text,
    config,
    compact = false,
    withMentions = false,
    className,
    creatorSlug,
    showSignature = true,
  },
  forwardedRef
) {
  const [fontsReady, setFontsReady] = useState(false);
  const [quoteFontSize, setQuoteFontSize] = useState<string | null>(null);
  const { ref: motionRef, motionPaused } = useImprintMotionGate<HTMLDivElement>();
  const imprintPressPlus = useImprintPressPlus();
  const tokens = useMemo(
    () => quotePressTokens(text, config, { imprintPressPlus }),
    [text, config, imprintPressPlus]
  );

  useEffect(() => {
    ensureImprintKeyframesInjected();
  }, []);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    void document.fonts.ready.then(() => setFontsReady(true));
  }, []);

  useEffect(() => {
    setQuoteFontSize(null);
  }, [text, config, tokens.fontSizeClamp]);

  useLayoutEffect(() => {
    const root = motionRef.current;
    if (!root) return;

    const syncQuoteFontSize = () => {
      const quote = root.querySelector<HTMLElement>('blockquote');
      if (!quote) return;
      const px = getComputedStyle(quote).fontSize;
      if (px.endsWith('px')) setQuoteFontSize(px);
    };

    syncQuoteFontSize();
    const observer = new ResizeObserver(syncQuoteFontSize);
    observer.observe(root);
    void document.fonts.ready.then(syncQuoteFontSize);
    return () => observer.disconnect();
  }, [text, config, tokens.fontSizeClamp, fontsReady]);

  const setRefs = (node: HTMLDivElement | null) => {
    motionRef.current = node;
    if (typeof forwardedRef === 'function') forwardedRef(node);
    else if (forwardedRef) forwardedRef.current = node;
  };

  const quoteLayer = tokens.layers.find((l) => l.kind === 'quoteMarks');
  const divider = tokens.layers.find((l) => l.kind === 'divider');

  return (
    <div
      ref={setRefs}
      data-imprint-root
      data-imprint-motion={motionPaused ? 'paused' : 'live'}
      className={cn('relative w-full', className)}
    >
        <figure
          data-imprint-card
          className={cn(
            'relative mx-auto w-full max-w-xl overflow-hidden rounded-xl border',
            compact ? 'p-3 sm:p-4' : 'p-4 sm:p-6',
            showSignature && 'pb-8',
            !fontsReady && 'opacity-90'
          )}
        style={{
          clipPath: tokens.frameClip,
          borderColor: tokens.cardBorder,
          boxShadow: tokens.cardGlow,
          color: tokens.accentColor,
        }}
        aria-label={`Imprint quote: ${text.slice(0, 120)}`}
      >
        <div className="absolute inset-0 rounded-[inherit]" style={{ background: tokens.cardBackground }} />
        {tokens.layers.map((layer, i) => (
          <LayerBackdrop key={`${layer.kind}-${i}`} layer={layer} />
        ))}

        {divider?.kind === 'divider' && divider.position === 'above' ? (
          <div
            className="relative mb-3 h-px w-12"
            style={{ background: divider.color }}
            aria-hidden
          />
        ) : null}

        <blockquote
          lang="en"
          className="relative z-[1] whitespace-pre-wrap"
          style={{
            fontFamily: localQuotePressFontFamily(tokens.fontFamily),
            fontWeight: tokens.fontWeight,
            fontStyle: tokens.fontStyle,
            letterSpacing: tokens.letterSpacing,
            lineHeight: tokens.lineHeight,
            textAlign: tokens.textAlign,
            color: tokens.textColor,
            fontSize: quoteFontSize ?? tokens.fontSizeClamp,
            overflowWrap: 'break-word',
            wordBreak: 'normal',
            hyphens: 'manual',
          }}
        >
          {quoteLayer?.kind === 'quoteMarks' ? (
            <span
              className="mr-1 select-none opacity-70"
              style={{ color: quoteLayer.color, fontSize: `${quoteLayer.size}em` }}
              aria-hidden
            >
              {quoteLayer.open}
            </span>
          ) : null}
          <ImprintTextBody text={text} tokens={tokens} withMentions={withMentions} />
          {quoteLayer?.kind === 'quoteMarks' ? (
            <span
              className="ml-0.5 select-none opacity-70"
              style={{ color: quoteLayer.color, fontSize: `${quoteLayer.size}em` }}
              aria-hidden
            >
              {quoteLayer.close}
            </span>
          ) : null}
        </blockquote>

        {divider?.kind === 'divider' && divider.position === 'below' ? (
          <div
            className="relative mt-3 h-px w-16 ml-auto"
            style={{ background: divider.color }}
            aria-hidden
          />
        ) : null}

        {tokens.ornament === 'barcode' ? (
          <div className="relative mt-3 flex gap-[2px] opacity-60" aria-hidden>
            {[2, 1, 3, 1, 2, 4, 1, 2, 3, 1, 2, 4, 1, 3, 2].map((w, i) => (
              <div
                key={i}
                className="rounded-[1px]"
                style={{ width: w, height: 10, backgroundColor: tokens.accentColor }}
              />
            ))}
          </div>
        ) : null}
        {tokens.ornament === 'stamp' ? (
          <div
            className="relative mt-3 inline-flex rounded border border-dashed px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest opacity-70"
            style={{ borderColor: tokens.accentColor, color: tokens.accentColor }}
            aria-hidden
          >
            Imprint
          </div>
        ) : null}
        {tokens.ornament === 'glyph' ? (
          <p className="relative mt-2 text-center text-lg opacity-50" style={{ color: tokens.accentColor }} aria-hidden>
            ✦
          </p>
        ) : null}
        {tokens.ornament === 'brackets' ? (
          <p className="relative mt-2 text-center font-mono text-xs opacity-60" style={{ color: tokens.accentColor }} aria-hidden>
            [ {tokens.serial} ]
          </p>
        ) : null}
        {tokens.ornament === 'dots' ? (
          <div className="relative mt-3 flex justify-center gap-1.5 opacity-60" aria-hidden>
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-1.5 w-1.5 rounded-full" style={{ background: tokens.accentColor }} />
            ))}
          </div>
        ) : null}
        {tokens.ornament === 'frame' ? (
          <div
            className="pointer-events-none absolute inset-2 rounded-[inherit] border opacity-35"
            style={{ borderColor: tokens.accentColor }}
            aria-hidden
          />
        ) : null}

        {showSignature ? (
          <ImprintSignature accentColor={tokens.accentColor} creatorSlug={creatorSlug} />
        ) : null}
      </figure>
      <span className="sr-only">{text}</span>
    </div>
  );
});
