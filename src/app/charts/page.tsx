'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  CheckCircle2,
  ChevronLeft,
  Headphones,
  MapPin,
  Music2,
  Repeat2,
  RotateCcw,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  TrendingUp,
  UserPlus,
  UserRound,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { StudioLoader } from '@/components/studio-loader';
import { LeaderboardHeatBackground } from '@/components/studio-page-background';
import { fetchMusicCharts } from '@/lib/music-charts-client';
import type {
  ArtistChartEntry,
  MusicChartsResponse,
  TrackChartEntry,
  TrackChartSignals,
} from '@/lib/music-charts';
import { profileHref } from '@/lib/profile/profile-slug';

const creatorSignalLabels: Array<{
  key: keyof ArtistChartEntry['signals'];
  label: string;
}> = [
  { key: 'qualifiedListeners', label: 'qualified' },
  { key: 'repeatListeners', label: 'repeat' },
  { key: 'follows', label: 'follows' },
  { key: 'innerCircleJoins', label: 'inner circle' },
  { key: 'convertedShares', label: 'share conversions' },
  { key: 'purchaseConversions', label: 'buyers' },
];

const musicFanSignalLabels: typeof creatorSignalLabels = [
  { key: 'convertedShares', label: 'qualified plays inspired' },
  { key: 'sharedLoves', label: 'shared Loves' },
  { key: 'repeatListeners', label: 'repeat listener days' },
  { key: 'purchaseConversions', label: 'purchases inspired' },
];

const trackSignalLabels: Array<{
  key: keyof TrackChartSignals;
  label: string;
  icon: typeof Headphones;
}> = [
  { key: 'qualifiedListeners', label: 'qualified', icon: Headphones },
  { key: 'completions', label: 'complete', icon: CheckCircle2 },
  { key: 'repeatListeners', label: 'repeat', icon: Repeat2 },
  { key: 'purchaseConversions', label: 'buyers', icon: ShoppingBag },
];

const trackProofExplanations: Record<keyof TrackChartSignals, { title: string; detail: string }> = {
  qualifiedListeners: {
    title: 'A listener reaches 80%',
    detail: 'The first time that person plays at least 80% of the song that day.',
  },
  completions: {
    title: 'A listener finishes the song',
    detail: 'They reach the end. These points are added on top of the 80% listening point.',
  },
  repeatListeners: {
    title: 'A listener returns on another day',
    detail: 'They previously reached 80%, then come back on a later day and reach 80% again.',
  },
  purchaseConversions: {
    title: 'A unique listener buys the song',
    detail: 'The first verified purchase from that listener counts. Paying more does not add more chart points.',
  },
};

function matchesLabel(values: string[], selected: string): boolean {
  if (!selected) return true;
  const target = selected.toLocaleLowerCase();
  return values.some((value) => value.toLocaleLowerCase() === target);
}

function ChartRank({ index }: { index: number }) {
  return (
    <Badge
      variant="outline"
      className="flex h-10 w-10 shrink-0 items-center justify-center border-cyan-400/35 bg-cyan-500/10 p-0 font-code text-sm text-cyan-200"
      aria-label={`Rank ${index + 1}`}
    >
      {index + 1}
    </Badge>
  );
}

function TrackChartRow({ entry, index }: { entry: TrackChartEntry; index: number }) {
  return (
    <article className="rounded-xl border border-cyan-400/15 bg-cyan-500/[0.04] p-3 sm:p-4">
      <div className="flex min-w-0 items-start gap-3">
        <ChartRank index={index} />
        <div className="min-w-0 flex-1">
          <Link
            href={`/song/${entry.shareId}`}
            className="block truncate font-headline text-base font-bold uppercase text-white hover:text-cyan-200 hover:underline"
          >
            {entry.title}
          </Link>
          <p className="mt-0.5 truncate font-code text-[10px] uppercase tracking-wider text-white/55">
            by{' '}
            <Link href={profileHref(entry.artistSlug) || `/${entry.artistSlug}`} className="text-fuchsia-300 hover:underline">
              {entry.artistName}
            </Link>
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {trackSignalLabels.map(({ key, label, icon: Icon }) =>
              (entry.signals[key] || 0) > 0 ? (
                <span key={key} className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-black/25 px-2 py-1 font-code text-[9px] uppercase text-white/60">
                  <Icon className="h-3 w-3 text-cyan-300/80" /> {entry.signals[key]} {label}
                </span>
              ) : null
            )}
          </div>
          {(entry.genres.length > 0 || entry.regions.length > 0) ? (
            <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[9px] text-muted-foreground">
              {entry.genres.length > 0 ? <span>{entry.genres.join(' · ')}</span> : null}
              {entry.regions.length > 0 ? <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" /> {entry.regions.join(' · ')}</span> : null}
            </p>
          ) : null}
          <p className="mt-2 font-code text-[9px] text-cyan-100/45">
            Why it charts: {entry.reasons.join(' · ')}
          </p>
        </div>
        <div className="shrink-0 text-right">
          <p className="font-code text-xl font-black tabular-nums text-cyan-300">{entry.score}</p>
          <p className="font-code text-[8px] uppercase tracking-widest text-cyan-100/40">proof</p>
        </div>
      </div>
    </article>
  );
}

function ArtistChartRow({ entry, index }: { entry: ArtistChartEntry; index: number }) {
  const signalLabels = entry.audience === 'music_fan' ? musicFanSignalLabels : creatorSignalLabels;
  return (
    <article className="rounded-xl border border-fuchsia-400/15 bg-fuchsia-500/[0.04] p-3 sm:p-4">
      <div className="flex min-w-0 items-start gap-3">
        <ChartRank index={index} />
        <div className="min-w-0 flex-1">
          <Link
            href={profileHref(entry.profileSlug) || `/${entry.profileSlug}`}
            className="block truncate font-headline text-base font-bold uppercase text-white hover:text-fuchsia-200 hover:underline"
          >
            {entry.displayName}
          </Link>
          <p className="mt-1 truncate font-code text-[9px] text-fuchsia-100/50">
            Why they’re rising: {entry.reasons.join(' · ')}
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {signalLabels.map(({ key, label }) =>
              (entry.signals[key] || 0) > 0 ? (
                <span key={key} className="rounded-full border border-white/10 bg-black/25 px-2 py-1 font-code text-[9px] uppercase text-white/60">
                  {entry.signals[key]} {label}
                </span>
              ) : null
            )}
          </div>
          {(entry.genres.length > 0 || entry.regions.length > 0) ? (
            <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[9px] text-muted-foreground">
              {entry.genres.length > 0 ? <span>{entry.genres.join(' · ')}</span> : null}
              {entry.regions.length > 0 ? <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" /> {entry.regions.join(' · ')}</span> : null}
            </p>
          ) : null}
        </div>
        <div className="shrink-0 text-right">
          <p className="font-code text-xl font-black tabular-nums text-fuchsia-300">{entry.score}</p>
          <p className="font-code text-[8px] uppercase tracking-widest text-fuchsia-100/40">momentum</p>
        </div>
      </div>
    </article>
  );
}

export default function ChartsPage() {
  const [charts, setCharts] = useState<MusicChartsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [view, setView] = useState<'songs' | 'creators' | 'musicFans'>('songs');
  const [genre, setGenre] = useState('');
  const [region, setRegion] = useState('');

  useEffect(() => {
    let cancelled = false;
    void fetchMusicCharts()
      .then((next) => {
        if (!cancelled) setCharts(next);
      })
      .catch((caught: unknown) => {
        if (!cancelled) setError(caught instanceof Error ? caught.message : 'Could not load charts.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const filteredTracks = useMemo(
    () => (charts?.tracks || []).filter((entry) => matchesLabel(entry.genres, genre) && matchesLabel(entry.regions, region)),
    [charts?.tracks, genre, region]
  );
  const filteredCreators = useMemo(
    () => (charts?.creators || charts?.artists || []).filter((entry) => matchesLabel(entry.genres, genre) && matchesLabel(entry.regions, region)),
    [charts?.artists, charts?.creators, genre, region]
  );
  const filteredMusicFans = useMemo(
    () => (charts?.musicFans || []).filter((entry) => matchesLabel(entry.genres, genre) && matchesLabel(entry.regions, region)),
    [charts?.musicFans, genre, region]
  );
  const hasFilters = Boolean(genre || region);

  if (loading) return <StudioLoader size="lg" fullscreen />;

  return (
    <div className="relative min-h-[calc(100vh-4rem)] overflow-hidden">
      <LeaderboardHeatBackground />
      <main className="container relative z-10 mx-auto max-w-4xl space-y-6 px-4 py-8 sm:py-10">
        <header className="space-y-4">
          <Button size="sm" variant="outline" className="h-8 gap-1.5 font-bold uppercase" asChild>
            <Link href="/">
              <ChevronLeft className="h-3.5 w-3.5" /> The Scene
            </Link>
          </Button>
          <div className="flex items-start gap-3">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-cyan-400/35 bg-cyan-500/10 shadow-[0_0_28px_rgba(34,211,238,0.16)]">
              <TrendingUp className="h-6 w-6 text-cyan-300" />
            </span>
            <div>
              <h1 className="font-headline text-3xl font-bold uppercase tracking-tight sm:text-4xl">Bar 4 Bar Charts</h1>
              <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
                Songs, creators, and Music Fans rising through verified attention and real discovery impact.
              </p>
              <p className="mt-1 font-code text-[9px] uppercase tracking-widest text-cyan-200/55">
                Rolling {charts?.window.days || 7} days · {charts?.window.from || '—'} through {charts?.window.through || '—'}
              </p>
            </div>
          </div>
        </header>

        {error ? (
          <div className="rounded-xl border border-red-400/30 bg-red-500/10 p-4 text-sm text-red-200">{error}</div>
        ) : null}

        <Card className="border-cyan-400/20 bg-black/35 backdrop-blur-sm">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm uppercase text-cyan-100">
              <ShieldCheck className="h-4 w-4 text-cyan-300" /> How song chart scores work
            </CardTitle>
            <CardDescription className="max-w-2xl text-sm leading-relaxed text-cyan-100/65">
              Songs earn points from real listening and buying during the rolling {charts?.window.days || 7}-day chart period. More verified points means a higher chart position.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2 sm:grid-cols-2">
              {(charts?.formula.tracks || []).map((part) => {
                const explanation = trackProofExplanations[part.signal];
                return (
                  <div key={part.signal} className="rounded-lg border border-cyan-400/15 bg-cyan-500/[0.05] p-3">
                    <p className="font-code text-xs font-black uppercase tracking-wide text-cyan-200">
                      +{part.points} {part.points === 1 ? 'point' : 'points'}
                    </p>
                    <p className="mt-1 text-sm font-semibold text-white/90">{explanation.title}</p>
                    <p className="mt-1 text-xs leading-relaxed text-white/55">{explanation.detail}</p>
                  </div>
                );
              })}
            </div>

            <div className="rounded-lg border border-white/10 bg-black/25 p-3 text-xs leading-relaxed text-white/65">
              <p>
                <span className="font-bold text-white/85">Example:</span> If a returning listener reaches 80% and finishes the song, that adds 1 + 2 + 3 = 6 points. Their first verified purchase adds another 8 points.
              </p>
            </div>

            <div className="space-y-1 text-xs leading-relaxed text-white/55">
              <p><span className="font-bold text-white/75">Kept fair:</span> Replaying the same song repeatedly on the same day does not keep adding listening points, and artists cannot score their own songs.</p>
              <p><span className="font-bold text-white/75">No pay-to-rank:</span> Ink balance, Pro tier, ads, sponsorships, and the amount someone pays add zero points.</p>
              <p><span className="font-bold text-white/75">Location charts:</span> A member only represents the Scene or region they chose to make public.</p>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-3 rounded-xl border border-white/10 bg-black/25 p-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
          <label className="space-y-1.5">
            <span className="flex items-center gap-1.5 font-code text-[9px] font-bold uppercase tracking-widest text-muted-foreground">
              <Sparkles className="h-3 w-3" /> Genre
            </span>
            <select value={genre} onChange={(event) => setGenre(event.target.value)} className="h-10 w-full rounded-md border border-white/10 bg-[hsl(216_35%_7%)] px-3 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-cyan-400">
              <option value="">All genres</option>
              {(charts?.filters.genres || []).map((label) => <option key={label} value={label}>{label}</option>)}
            </select>
          </label>
          <label className="space-y-1.5">
            <span className="flex items-center gap-1.5 font-code text-[9px] font-bold uppercase tracking-widest text-muted-foreground">
              <MapPin className="h-3 w-3" /> Scene / region
            </span>
            <select value={region} onChange={(event) => setRegion(event.target.value)} className="h-10 w-full rounded-md border border-white/10 bg-[hsl(216_35%_7%)] px-3 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-cyan-400">
              <option value="">Everywhere</option>
              {(charts?.filters.regions || []).map((label) => <option key={label} value={label}>{label}</option>)}
            </select>
          </label>
          <Button type="button" variant="outline" className="h-10 gap-1.5" disabled={!hasFilters} onClick={() => { setGenre(''); setRegion(''); }}>
            <RotateCcw className="h-3.5 w-3.5" /> Reset
          </Button>
        </div>

        <Tabs value={view} onValueChange={(next) => setView(next as 'songs' | 'creators' | 'musicFans')} className="space-y-4">
          <TabsList className="grid h-11 w-full grid-cols-3 border border-white/10 bg-black/35">
            <TabsTrigger value="songs" className="gap-1.5 font-bold uppercase"><Music2 className="h-4 w-4" /> Songs ({filteredTracks.length})</TabsTrigger>
            <TabsTrigger value="creators" className="gap-1.5 font-bold uppercase"><UserRound className="h-4 w-4" /> Creators ({filteredCreators.length})</TabsTrigger>
            <TabsTrigger value="musicFans" className="gap-1.5 font-bold uppercase"><Headphones className="h-4 w-4" /> Music Fans ({filteredMusicFans.length})</TabsTrigger>
          </TabsList>
          <TabsContent value="songs" className="space-y-3">
            {filteredTracks.length ? filteredTracks.map((entry, index) => <TrackChartRow key={entry.shareId} entry={entry} index={index} />) : (
              <div className="rounded-xl border border-dashed border-white/15 bg-black/20 px-5 py-14 text-center text-sm text-muted-foreground">No qualified song momentum in this category yet.</div>
            )}
          </TabsContent>
          <TabsContent value="creators" className="space-y-3">
            {filteredCreators.length ? filteredCreators.map((entry, index) => <ArtistChartRow key={entry.userId} entry={entry} index={index} />) : (
              <div className="rounded-xl border border-dashed border-white/15 bg-black/20 px-5 py-14 text-center text-sm text-muted-foreground">No qualified creator momentum in this category yet.</div>
            )}
          </TabsContent>
          <TabsContent value="musicFans" className="space-y-3">
            {filteredMusicFans.length ? filteredMusicFans.map((entry, index) => <ArtistChartRow key={entry.userId} entry={entry} index={index} />) : (
              <div className="rounded-xl border border-dashed border-white/15 bg-black/20 px-5 py-14 text-center text-sm text-muted-foreground">Music Fan discovery impact is still warming up.</div>
            )}
          </TabsContent>
        </Tabs>

        <p className="text-center font-code text-[9px] uppercase tracking-wider text-muted-foreground">
          <UserPlus className="mr-1 inline h-3 w-3" /> People appear only with a live public profile and leaderboard sharing enabled.
        </p>
      </main>
    </div>
  );
}
