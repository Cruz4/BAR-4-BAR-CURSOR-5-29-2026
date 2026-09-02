'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import type { PathScreenKind } from '@/lib/manual-path-guide';

function Chrome({
  room,
  children,
  className,
}: {
  room: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-xl border border-white/10 bg-[#070b10] shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]',
        className
      )}
    >
      <div className="flex items-center justify-between border-b border-white/10 px-2.5 py-1.5">
        <span className="font-code text-[8px] font-bold uppercase tracking-[0.22em] text-cyan-300/80">
          {room}
        </span>
        <span className="flex gap-1" aria-hidden>
          <span className="h-1.5 w-1.5 rounded-full bg-white/20" />
          <span className="h-1.5 w-1.5 rounded-full bg-white/20" />
          <span className="h-1.5 w-1.5 rounded-full bg-white/20" />
        </span>
      </div>
      <div className="p-2.5">{children}</div>
    </div>
  );
}

function Glow({ children, on }: { children: React.ReactNode; on?: boolean }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-md border px-1.5 py-0.5 font-code text-[8px] font-bold uppercase tracking-wider',
        on
          ? 'border-cyan-300/60 bg-cyan-400/20 text-cyan-100 shadow-[0_0_16px_rgba(34,211,238,0.25)]'
          : 'border-white/10 bg-white/5 text-white/55'
      )}
    >
      {children}
    </span>
  );
}

export function ManualPathScreen({ kind }: { kind: PathScreenKind }) {
  if (kind === 'scene-booth' || kind === 'scene-home') {
    return (
      <Chrome room="The Scene">
        <div className="space-y-2">
          <div className="rounded-lg border border-white/10 bg-white/[0.03] p-2">
            <p className="mb-1.5 font-headline text-[11px] font-bold uppercase text-white/90">Your Booth</p>
            <div className="flex flex-wrap gap-1.5">
              <Glow on={kind === 'scene-booth'}>New release</Glow>
              <Glow>Live</Glow>
              <Glow>Camera</Glow>
              <Glow>Photo</Glow>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-1.5">
            <div className="rounded-md border border-white/10 bg-black/40 px-1.5 py-2 text-center font-code text-[7px] uppercase tracking-widest text-white/40">
              Block
            </div>
            <div className="rounded-md border border-white/10 bg-black/40 px-1.5 py-2 text-center font-code text-[7px] uppercase tracking-widest text-white/40">
              Discover
            </div>
            <div className="rounded-md border border-white/10 bg-black/40 px-1.5 py-2 text-center font-code text-[7px] uppercase tracking-widest text-white/40">
              Dock
            </div>
          </div>
        </div>
      </Chrome>
    );
  }

  if (kind === 'scene-block') {
    return (
      <Chrome room="Your Block">
        <div className="space-y-2">
          <div className="flex flex-wrap gap-1.5">
            <Glow on>Camera</Glow>
            <Glow on>Photo</Glow>
            <Glow>Post</Glow>
          </div>
          <div className="space-y-1.5">
            <div className="h-10 rounded-lg border border-white/10 bg-gradient-to-r from-white/10 to-transparent" />
            <div className="h-10 rounded-lg border border-white/10 bg-white/[0.03]" />
          </div>
        </div>
      </Chrome>
    );
  }

  if (kind === 'vault') {
    return (
      <Chrome room="The Vault">
        <div className="grid grid-cols-3 gap-1.5">
          {['Album', 'Album', '+ New'].map((label, index) => (
            <div
              key={`${label}-${index}`}
              className={cn(
                'aspect-square rounded-lg border',
                index === 2
                  ? 'border-cyan-300/40 bg-cyan-400/10 text-cyan-100'
                  : 'border-white/10 bg-white/[0.04] text-white/50'
              )}
            >
              <div className="flex h-full items-center justify-center font-code text-[8px] font-bold uppercase">
                {label}
              </div>
            </div>
          ))}
        </div>
      </Chrome>
    );
  }

  if (kind === 'sheet') {
    return (
      <Chrome room="Lyric sheet">
        <div className="grid grid-cols-[1fr_1.4fr_1fr] gap-1.5">
          <div className="space-y-1 rounded-md border border-sky-400/25 bg-sky-500/10 p-1.5">
            <p className="font-code text-[7px] font-bold uppercase text-sky-200">Status</p>
            <p className="font-code text-[7px] text-sky-100/70">DNA Drop · Collab</p>
          </div>
          <div className="space-y-1 rounded-md border border-white/10 bg-black/40 p-1.5">
            <div className="h-1.5 rounded bg-white/20" />
            <div className="h-1.5 w-4/5 rounded bg-cyan-300/40" />
            <div className="h-1.5 w-2/3 rounded bg-white/15" />
          </div>
          <div className="rounded-md border border-emerald-400/20 bg-emerald-500/10 p-1.5">
            <p className="font-code text-[7px] font-bold uppercase text-emerald-200">Co-Writer</p>
          </div>
        </div>
      </Chrome>
    );
  }

  if (kind === 'library') {
    return (
      <Chrome room="Library">
        <div className="space-y-1.5">
          <div className="h-8 rounded-lg border border-amber-300/30 bg-amber-400/10" />
          <div className="h-6 rounded-md border border-white/10 bg-white/[0.04]" />
          <div className="h-6 rounded-md border border-white/10 bg-white/[0.04]" />
        </div>
      </Chrome>
    );
  }

  if (kind === 'earnings') {
    return (
      <Chrome room="Earnings">
        <div className="space-y-2">
          <Glow on>Connect Stripe</Glow>
          <div className="h-8 rounded-lg border border-fuchsia-300/25 bg-fuchsia-500/10" />
          <p className="font-code text-[8px] uppercase tracking-widest text-white/40">Cash out sales</p>
        </div>
      </Chrome>
    );
  }

  if (kind === 'discover') {
    return (
      <Chrome room="Discover">
        <div className="grid grid-cols-2 gap-1.5">
          <div className="h-16 rounded-lg border border-emerald-300/25 bg-emerald-500/10" />
          <div className="h-16 rounded-lg border border-white/10 bg-white/[0.04]" />
        </div>
      </Chrome>
    );
  }

  if (kind === 'lock') {
    return (
      <Chrome room="Lock desk">
        <div className="flex h-16 items-center justify-center rounded-lg border border-white/10 bg-white/[0.03] font-code text-[9px] uppercase tracking-widest text-white/45">
          Public bar
        </div>
      </Chrome>
    );
  }

  return (
    <Chrome room="Pricing">
      <div className="grid grid-cols-2 gap-1.5">
        <div className="rounded-lg border border-amber-300/30 bg-amber-400/10 p-2 font-code text-[8px] uppercase text-amber-100">
          Ink
        </div>
        <div className="rounded-lg border border-fuchsia-300/30 bg-fuchsia-500/10 p-2 font-code text-[8px] uppercase text-fuchsia-100">
          Pro
        </div>
      </div>
    </Chrome>
  );
}
