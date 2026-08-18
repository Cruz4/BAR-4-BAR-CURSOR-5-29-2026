'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import type { LyricClip, LyricClipBg, LyricClipText } from '@/lib/profile/lyric-clip';
import './lyric-clip-card.css';

const BG: Record<LyricClipBg, string> = {
  ink: 'bg-zinc-950',
  paper: 'bg-[#efe6d4]',
  night: 'bg-[#07111f]',
  alive: 'bg-[#050814]',
  neon: 'bg-[#120418]',
  dusk: 'bg-[#1a0e08]',
};

const TEXT: Record<LyricClipText, string> = {
  white: 'font-code text-white',
  gold: 'font-headline text-amber-200',
  cyan: 'font-code text-cyan-200',
  ink: 'font-code text-zinc-900',
  hand: 'font-serif italic text-zinc-100',
};

const NUM: Record<LyricClipText, string> = {
  white: 'text-white/35',
  gold: 'text-amber-200/40',
  cyan: 'text-cyan-200/40',
  ink: 'text-zinc-900/35',
  hand: 'text-zinc-100/35',
};

function AliveSky() {
  const stars = [
    { left: '8%', top: '12%', s: 2, d: '0s' },
    { left: '22%', top: '28%', s: 1.5, d: '0.6s' },
    { left: '41%', top: '9%', s: 2, d: '1.1s' },
    { left: '63%', top: '18%', s: 1.5, d: '0.3s' },
    { left: '78%', top: '7%', s: 2.5, d: '1.8s' },
    { left: '88%', top: '32%', s: 1.5, d: '0.9s' },
    { left: '14%', top: '44%', s: 1.5, d: '1.4s' },
    { left: '54%', top: '38%', s: 2, d: '0.2s' },
  ];
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      <div className="absolute inset-0 bg-gradient-to-b from-[#1b2a5a] via-[#0b1228] to-black" />
      <div className="lyric-clip-aurora absolute -left-1/4 top-[-30%] h-[90%] w-[150%] rounded-full bg-[radial-gradient(circle_at_30%_40%,rgba(56,189,248,0.35),transparent_55%),radial-gradient(circle_at_70%_30%,rgba(244,114,182,0.28),transparent_50%)]" />
      {stars.map((star, i) => (
        <span
          key={i}
          className="lyric-clip-star absolute rounded-full bg-white"
          style={{
            left: star.left,
            top: star.top,
            width: star.s,
            height: star.s,
            animationDelay: star.d,
          }}
        />
      ))}
      <div className="absolute inset-x-0 bottom-0 h-[38%] bg-[linear-gradient(to_top,#020617_20%,transparent)]" />
      <div className="absolute inset-x-0 bottom-0 h-16 bg-[linear-gradient(180deg,transparent,rgba(0,0,0,0.55))]" />
      <svg
        className="absolute inset-x-0 bottom-0 h-[34%] w-full text-black/80"
        viewBox="0 0 400 80"
        preserveAspectRatio="none"
      >
        <path
          fill="currentColor"
          d="M0 80 V48 H18 V28 H32 V52 H48 V18 H70 V44 H86 V30 H104 V56 H122 V22 H148 V50 H166 V14 H190 V46 H210 V26 H232 V54 H250 V20 H278 V48 H296 V32 H318 V58 H338 V24 H360 V46 H378 V36 H400 V80 Z"
        />
      </svg>
    </div>
  );
}

function StaticWash({ bg }: { bg: LyricClipBg }) {
  if (bg === 'alive') return <AliveSky />;
  if (bg === 'night') {
    return (
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <div className="absolute inset-0 bg-gradient-to-b from-sky-950/80 via-transparent to-black/40" />
      </div>
    );
  }
  if (bg === 'neon') {
    return (
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(244,114,182,0.35),transparent_42%),radial-gradient(circle_at_80%_80%,rgba(34,211,238,0.28),transparent_46%)]" />
      </div>
    );
  }
  if (bg === 'dusk') {
    return (
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-orange-400/25 via-rose-900/30 to-zinc-950" aria-hidden />
    );
  }
  if (bg === 'paper') {
    return (
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(120,90,50,0.08)_1px,transparent_1px)] bg-[length:100%_1.65rem]" aria-hidden />
    );
  }
  return null;
}

export function LyricClipCard({
  clip,
  numbered,
  className,
}: {
  clip: LyricClip;
  numbered?: { idx: number; text: string }[];
  className?: string;
}) {
  const rows =
    numbered && numbered.length > 0
      ? numbered
      : clip.lines.map((text, i) => ({ idx: clip.from + i, text }));
  const textOnPaper = clip.bg === 'paper' || clip.text === 'ink';

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-2xl border border-white/10 shadow-[0_12px_40px_rgba(0,0,0,0.4)]',
        BG[clip.bg],
        className
      )}
    >
      <StaticWash bg={clip.bg} />
      <div className="relative space-y-3 px-4 py-4 sm:px-5 sm:py-5">
        <p
          className={cn(
            'text-[9px] font-bold uppercase tracking-[0.22em]',
            textOnPaper ? 'text-zinc-700/70' : 'text-white/50'
          )}
        >
          {clip.section ? `[${clip.section}] · ` : ''}
          {String(clip.from).padStart(2, '0')}
          {clip.to !== clip.from ? `–${String(clip.to).padStart(2, '0')}` : ''}
          {clip.title ? ` · ${clip.title}` : ''}
        </p>
        <div className="space-y-1.5">
          {rows.map((row) => (
            <p
              key={row.idx}
              className={cn('flex gap-3 text-[15px] leading-snug sm:text-base', TEXT[clip.text])}
            >
              <span className={cn('w-6 shrink-0 text-right font-code text-[11px] tabular-nums', NUM[clip.text])}>
                {String(row.idx).padStart(2, '0')}
              </span>
              <span className="min-w-0 whitespace-pre-wrap break-words">{row.text || ' '}</span>
            </p>
          ))}
        </div>
      </div>
    </div>
  );
}
