'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ChevronRight, MapPin, Music2, TrendingUp } from 'lucide-react';
import { fetchMusicCharts } from '@/lib/music-charts-client';
import type { MusicChartsResponse } from '@/lib/music-charts';
import { profileHref } from '@/lib/profile/profile-slug';

export function SceneChartSpotlight({ excludedUserIds }: { excludedUserIds?: Set<string> }) {
  const [charts, setCharts] = useState<MusicChartsResponse | null>(null);

  useEffect(() => {
    let cancelled = false;
    void fetchMusicCharts({ trackLimit: 6, artistLimit: 6 })
      .then((next) => {
        if (!cancelled) setCharts(next);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  const tracks = useMemo(
    () => (charts?.tracks || []).filter((entry) => !excludedUserIds?.has(entry.artistId)).slice(0, 3),
    [charts?.tracks, excludedUserIds]
  );
  const artists = useMemo(
    () => (charts?.artists || []).filter((entry) => !excludedUserIds?.has(entry.userId)).slice(0, 2),
    [charts?.artists, excludedUserIds]
  );

  return (
    <section className="mt-3 overflow-hidden rounded-xl border border-cyan-400/20 bg-[hsl(216_38%_7%)] shadow-[0_12px_32px_rgba(0,0,0,0.2)]" aria-label="Bar 4 Bar chart spotlight">
      <div className="flex items-center justify-between gap-3 border-b border-white/8 px-3 py-2.5">
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 font-code text-[9px] font-bold uppercase tracking-[0.2em] text-cyan-300">
            <TrendingUp className="h-3.5 w-3.5" /> Charts · real listener proof
          </p>
          <p className="mt-0.5 truncate text-[9px] text-muted-foreground">Qualified listens · repeats · completions · unique buyers</p>
        </div>
        <Link href="/charts" className="inline-flex shrink-0 items-center gap-1 font-code text-[9px] font-bold uppercase tracking-wider text-cyan-300 hover:text-cyan-100">
          View charts <ChevronRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      <div className="grid gap-px bg-white/8 sm:grid-cols-[minmax(0,1.35fr)_minmax(0,0.65fr)]">
        <div className="min-w-0 bg-[hsl(216_38%_7%)] p-2.5">
          <p className="mb-1.5 px-1 font-code text-[8px] font-bold uppercase tracking-widest text-white/35">Songs moving now</p>
          {tracks.length ? tracks.map((entry, index) => (
            <Link key={entry.shareId} href={`/share/${entry.shareId}`} className="group flex min-w-0 items-center gap-2 rounded-lg px-1.5 py-1.5 hover:bg-white/[0.05]">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-cyan-400/25 bg-cyan-500/10 font-code text-[9px] text-cyan-200">{index + 1}</span>
              <Music2 className="h-3.5 w-3.5 shrink-0 text-fuchsia-300/80" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[11px] font-bold text-white group-hover:text-cyan-200">{entry.title}</span>
                <span className="block truncate font-code text-[8px] uppercase tracking-wider text-muted-foreground">{entry.artistName}</span>
              </span>
              <span className="shrink-0 font-code text-[10px] font-bold tabular-nums text-cyan-300">{entry.score}</span>
            </Link>
          )) : (
            <p className="px-1.5 py-4 text-[10px] text-muted-foreground">Qualified song momentum is warming up.</p>
          )}
        </div>

        <div className="min-w-0 bg-[hsl(216_38%_7%)] p-2.5">
          <p className="mb-1.5 px-1 font-code text-[8px] font-bold uppercase tracking-widest text-white/35">Trending artists</p>
          {artists.length ? artists.map((entry, index) => (
            <Link key={entry.userId} href={profileHref(entry.profileSlug) || `/${entry.profileSlug}`} className="group flex min-w-0 items-center gap-2 rounded-lg px-1.5 py-2 hover:bg-white/[0.05]">
              <span className="font-code text-[9px] text-fuchsia-300">#{index + 1}</span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[10px] font-bold uppercase text-white group-hover:text-fuchsia-200">{entry.displayName}</span>
                <span className="mt-0.5 flex min-w-0 items-center gap-1 truncate font-code text-[8px] text-muted-foreground">
                  {entry.regions.length ? <><MapPin className="h-2.5 w-2.5 shrink-0" /> {entry.regions.join(' · ')}</> : `${entry.score} momentum`}
                </span>
              </span>
            </Link>
          )) : (
            <p className="px-1.5 py-4 text-[10px] text-muted-foreground">Emerging artists will appear as proof is earned.</p>
          )}
        </div>
      </div>
    </section>
  );
}
