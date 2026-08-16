'use client';

import React from 'react';

/**
 * Ultra-fine grain: large tile + blur so it dithers banding without visible pixels.
 * (Coarse 200px turbulence tiles read as blocky on wide screens.)
 */
export const STUDIO_GRAIN_URI =
  "data:image/svg+xml,%3Csvg viewBox='0 0 512 512' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='g'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3CfeGaussianBlur stdDeviation='0.65'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23g)'/%3E%3C/svg%3E";

/** @deprecated use STUDIO_GRAIN_URI */
export const STUDIO_PAGE_NOISE_URI = STUDIO_GRAIN_URI;

type MeshOrbProps = {
  className?: string;
  style?: React.CSSProperties;
};

function MeshOrb({ className, style }: MeshOrbProps) {
  return (
    <div
      className={`pointer-events-none absolute rounded-full smooth-gradient-layer ${className ?? ''}`}
      style={style}
      aria-hidden
    />
  );
}

export function StudioPageBackground() {
  return (
    <div
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden isolate"
      data-studio-page-bg
      aria-hidden
    >
      <div className="absolute inset-0 studio-page-base" />

      <MeshOrb
        className="left-1/2 top-[-18%] h-[min(85vh,820px)] w-[min(140vw,1400px)] -translate-x-1/2 bg-sky-400/[0.16] dark:bg-sky-500/[0.13] blur-[100px] sm:blur-[140px]"
      />
      <MeshOrb
        className="right-[-12%] top-[8%] h-[min(55vh,520px)] w-[min(70vw,680px)] bg-pink-400/[0.11] dark:bg-pink-500/[0.07] blur-[90px] sm:blur-[120px]"
      />
      <MeshOrb
        className="bottom-[-8%] left-[-10%] h-[min(50vh,480px)] w-[min(75vw,720px)] bg-blue-500/[0.13] dark:bg-blue-600/[0.11] blur-[95px] sm:blur-[130px]"
      />

      <div className="absolute inset-0 studio-page-vignette opacity-90 dark:opacity-100" />

      <div
        className="absolute inset-0 opacity-[0.022] mix-blend-soft-light"
        style={{
          backgroundImage: `url("${STUDIO_GRAIN_URI}")`,
          backgroundSize: '240px 240px',
        }}
      />
    </div>
  );
}

export function LeaderboardHeatBackground() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden isolate" aria-hidden>
      <MeshOrb
        className="bottom-[-35%] left-1/2 h-[min(70vh,640px)] w-[min(130vw,1200px)] -translate-x-1/2 bg-orange-500/[0.28] dark:bg-orange-500/[0.22] blur-[110px] sm:blur-[150px]"
      />
      <MeshOrb
        className="bottom-[5%] left-[-8%] h-[min(40vh,380px)] w-[min(55vw,520px)] bg-red-600/[0.16] dark:bg-red-600/[0.12] blur-[85px] sm:blur-[115px]"
      />
      <MeshOrb
        className="bottom-[8%] right-[-6%] h-[min(38vh,360px)] w-[min(50vw,480px)] bg-amber-400/[0.14] dark:bg-amber-400/[0.1] blur-[80px] sm:blur-[110px]"
      />
      <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-orange-200/40 via-orange-100/15 to-transparent dark:from-orange-950/50 dark:via-orange-950/15 dark:to-transparent" />
    </div>
  );
}

/** First Drops library — fuchsia lathe glow over the studio mesh. */
export function DeckNeonBackground() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden isolate" aria-hidden>
      <MeshOrb
        className="left-[-8%] top-[-12%] h-[min(55vh,520px)] w-[min(80vw,720px)] bg-fuchsia-500/[0.18] dark:bg-fuchsia-500/[0.14] blur-[100px] sm:blur-[140px]"
      />
      <MeshOrb
        className="right-[-10%] top-[18%] h-[min(48vh,460px)] w-[min(70vw,640px)] bg-cyan-400/[0.12] dark:bg-cyan-400/[0.1] blur-[95px] sm:blur-[130px]"
      />
      <MeshOrb
        className="bottom-[-18%] left-1/3 h-[min(40vh,380px)] w-[min(90vw,800px)] bg-violet-600/[0.12] dark:bg-violet-500/[0.1] blur-[110px] sm:blur-[150px]"
      />
    </div>
  );
}
