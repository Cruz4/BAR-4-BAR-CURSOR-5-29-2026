'use client';

import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  trackLyricBarCount,
  type DnaDropAlbumPayload,
  type DnaDropTrackPayload,
} from '@/lib/dna-drop';
import { ChevronRight, Dna, Lock, Music } from 'lucide-react';
import { dropPriceSummary, isCommerceLive, normalizeDropAudio, normalizeDropPrice } from '@/lib/drop-commerce';
import { cn } from '@/lib/utils';
import { useFirstDropsFeature } from '@/hooks/use-first-drops-feature';
import { orderAlbumTracks } from '@/lib/album-track-order';
import { pressedSongHref } from '@/lib/pressed-song';
import { dnaDropSnapshotTrackPath } from '@/lib/dna-drop-access';

type DnaDropAlbumHubProps = {
  album: DnaDropAlbumPayload;
  shareId: string;
  ownerId: string;
  ownerName: string;
  houseRelease?: boolean;
  canViewDna?: boolean;
  signedIn?: boolean;
};

function trackSubtitle(track: DnaDropTrackPayload, firstDropsOn: boolean, canViewDna: boolean): string {
  const bits: string[] = [];
  const bars = trackLyricBarCount(track);
  if (canViewDna) bits.push(bars > 0 ? `${bars} bar${bars === 1 ? '' : 's'}` : 'Empty strand');
  if (canViewDna && track.vibe?.enabled !== false && track.vibe?.genre) bits.push(track.vibe.genre);
  if (canViewDna && track.vibe?.enabled !== false && track.vibe?.tempoBPM) bits.push(`${track.vibe.tempoBPM} BPM`);
  if (firstDropsOn && normalizeDropAudio(track.dropAudio)) bits.push('Audio on the release');
  const price = firstDropsOn ? dropPriceSummary(normalizeDropPrice(track.dropPrice)) : '';
  if (price) bits.push(price);
  return bits.join(' · ') || (canViewDna ? 'Lyric strand' : 'Release track');
}

function LyricsDnaTrackButton({
  active,
  href,
  title,
  canViewDna,
}: {
  active: boolean;
  href?: string;
  title: string;
  canViewDna: boolean;
}) {
  const label = 'Lyrics DNA';
  if (active && href) {
    return (
      <Link
        href={href}
        className={cn(
          'inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1.5 text-[9px] font-bold uppercase tracking-[0.14em] transition-colors',
          'border-cyan-400/55 bg-cyan-400/15 text-cyan-100 shadow-[0_0_18px_rgba(34,211,238,0.22)] hover:border-cyan-300/70 hover:bg-cyan-400/25'
        )}
        aria-label={`Open Lyrics DNA Drop for ${title}`}
      >
        <Dna className="h-3.5 w-3.5 shrink-0" />
        {label}
      </Link>
    );
  }
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1.5 text-[9px] font-bold uppercase tracking-[0.14em]',
        'border-white/10 bg-black/20 text-muted-foreground/45 cursor-not-allowed'
      )}
      aria-disabled
      title={
        !canViewDna
          ? 'Studio Pro required to open Lyrics DNA Drops'
          : 'No lyrics strand in this snapshot'
      }
    >
      <Dna className="h-3.5 w-3.5 shrink-0 opacity-50" />
      {label}
    </span>
  );
}

export function DnaDropAlbumHub({
  album,
  shareId,
  ownerName,
  houseRelease = false,
  canViewDna = true,
}: DnaDropAlbumHubProps) {
  const { enabled: firstDropsOn } = useFirstDropsFeature();
  const tracks = orderAlbumTracks(album.tracks ?? [], album);
  const strandCount = tracks.length;
  const barCount = tracks.reduce((n, track) => n + trackLyricBarCount(track), 0);
  const audioCount = tracks.filter((t) => normalizeDropAudio(t.dropAudio)).length;
  const albumForSale = firstDropsOn && audioCount > 0 && (
    houseRelease || isCommerceLive(normalizeDropPrice(album.dropPrice))
  );

  return (
    <Card className="border-2 border-cyan-400/25 shadow-[0_0_80px_-28px_rgba(217,70,239,0.55)] relative overflow-hidden bg-card/40 backdrop-blur-md min-h-[50vh]">
      <div className="pointer-events-none absolute inset-y-0 left-[2.35rem] w-px bg-gradient-to-b from-cyan-400/70 via-fuchsia-500/35 to-transparent hidden sm:block" />
      <div className="border-b border-cyan-400/15 px-4 py-5 sm:px-8 sm:py-6 space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline" className="text-[9px] uppercase tracking-widest border-cyan-400/40 text-cyan-300">
            Lyrics DNA Drop
          </Badge>
          <span className="text-[9px] font-bold uppercase tracking-widest text-fuchsia-300/80">
            {strandCount} strand{strandCount === 1 ? '' : 's'} · {barCount} bars frozen
          </span>
        </div>
        <h3 className="font-headline text-xl sm:text-3xl font-bold uppercase tracking-tight">
          Sequence · {album.title}
        </h3>
        <p className="text-[11px] text-muted-foreground font-code leading-relaxed max-w-2xl">
          {canViewDna
            ? 'This is a frozen lyric snapshot, not the album in your vault. Open a strand to read that song’s lyrics and Creative DNA.'
            : albumForSale
              ? 'Listen from the playlist. Lyrics DNA Drop on each strand is Studio Pro.'
              : 'Sign in with Studio Pro to open each song’s Lyrics DNA Drop from this snapshot.'}
        </p>
      </div>

      <CardContent className="p-4 sm:p-6">
        {tracks.length === 0 ? (
          <p className="text-sm text-muted-foreground italic py-12 text-center">No strands in this snapshot.</p>
        ) : (
          <ol className="space-y-2">
            {tracks.map((track, idx) => {
              const hasAudio = Boolean(normalizeDropAudio(track.dropAudio));
              const hasLyricDna = canViewDna && trackLyricBarCount(track) > 0;
              const lyricDnaHref = hasLyricDna ? dnaDropSnapshotTrackPath(shareId, track.id) : undefined;
              const songListenHref =
                firstDropsOn && hasAudio ? pressedSongHref(shareId, { trackId: track.id }) : undefined;
              const rowHref = songListenHref || lyricDnaHref;
              const trackTitle = track.title || `Untitled ${idx + 1}`;

              const main = (
                <>
                  <div
                    className={cn(
                      'relative z-10 flex h-11 w-11 shrink-0 items-center justify-center rounded-full border font-mono text-[11px] font-bold tabular-nums',
                      rowHref
                        ? 'border-cyan-400/50 bg-cyan-400/10 text-cyan-200'
                        : 'border-border bg-muted/20 text-muted-foreground'
                    )}
                  >
                    {String(idx + 1).padStart(2, '0')}
                  </div>
                  <div className="min-w-0 flex-1 py-1">
                    <h4 className="font-headline text-base sm:text-lg font-bold uppercase tracking-tight leading-tight truncate">
                      {trackTitle}
                    </h4>
                    <p className="text-[10px] text-muted-foreground truncate">
                      {trackSubtitle(track, firstDropsOn, canViewDna)}
                    </p>
                    <p className="mt-1 text-[9px] uppercase tracking-widest text-cyan-300/70 flex items-center gap-1.5">
                      {songListenHref ? (
                        <>
                          <Music className="h-3 w-3 shrink-0" />
                          Song page · stream this track
                        </>
                      ) : lyricDnaHref ? (
                        <>
                          <Dna className="h-3 w-3 shrink-0" />
                          Lyrics DNA strand
                        </>
                      ) : !canViewDna && hasAudio ? (
                        'Listen from the album playlist'
                      ) : (
                        <>
                          <Lock className="h-3 w-3 shrink-0" />
                          {hasAudio ? 'Audio on the album · no lyric strand' : 'Not in this snapshot'}
                        </>
                      )}
                    </p>
                  </div>
                </>
              );

              return (
                <li key={track.id}>
                  <div
                    className={cn(
                      'flex flex-wrap items-center gap-2 sm:gap-3 rounded-2xl border border-cyan-400/15 bg-black/20 px-3 py-3 sm:px-4',
                      rowHref && 'hover:border-cyan-400/35'
                    )}
                  >
                    {rowHref ? (
                      <Link
                        href={rowHref}
                        className="flex min-w-0 flex-1 items-center gap-3 sm:gap-4 transition-colors hover:bg-cyan-400/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/60 rounded-xl -m-1 p-1"
                        aria-label={
                          songListenHref
                            ? `Open song page for ${trackTitle}`
                            : `Open Lyrics DNA Drop for ${trackTitle}`
                        }
                      >
                        {main}
                        <ChevronRight className="h-5 w-5 text-cyan-300 shrink-0" aria-hidden />
                      </Link>
                    ) : (
                      <div className="flex min-w-0 flex-1 items-center gap-3 sm:gap-4 opacity-80">{main}</div>
                    )}
                    <LyricsDnaTrackButton
                      active={hasLyricDna}
                      href={lyricDnaHref}
                      title={trackTitle}
                      canViewDna={canViewDna}
                    />
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}
