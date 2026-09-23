'use client';

import type { ReactNode } from 'react';
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
import {
  DNA_DROP_UPGRADE_PATH,
  buildDnaDropLoginPath,
  dnaDropSnapshotTrackPath,
} from '@/lib/dna-drop-access';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { proLockShell, proLockText } from '@/lib/pro-lock';
import { ShareArtistLink } from '@/components/share-artist-link';

type DnaDropAlbumHubProps = {
  album: DnaDropAlbumPayload;
  shareId: string;
  /** Public music hub id when it differs from the Lyrics DNA album share. */
  hubShareId?: string;
  ownerId: string;
  ownerName: string;
  houseRelease?: boolean;
  canViewDna?: boolean;
  signedIn?: boolean;
  /** Music release hub — use Album · title instead of Sequence · title. */
  releaseAudioHub?: boolean;
  artistName?: string;
  artistSlug?: string | null;
  artistUserId?: string | null;
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
  hasStrand,
  openHref,
  lockedHref,
  title,
}: {
  hasStrand: boolean;
  openHref?: string;
  lockedHref?: string;
  title: string;
}) {
  const noneLabel = 'No DNA';
  const openLabel = 'Lyrics DNA';
  const lockedLabel = 'Lyrics DNA';

  const wrap = (node: ReactNode, tip: string) => (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>{node}</TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-[16rem] text-[11px] leading-relaxed">
          {tip}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );

  if (!hasStrand) {
    return wrap(
      <span
        className={cn(
          'inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1.5 text-[9px] font-bold uppercase tracking-[0.14em]',
          'border-white/10 bg-black/20 text-muted-foreground/45 cursor-default'
        )}
        aria-disabled
      >
        <Dna className="h-3.5 w-3.5 shrink-0 opacity-50" />
        {noneLabel}
      </span>,
      'No Lyrics DNA Drop attached to this track in this snapshot.'
    );
  }

  if (openHref) {
    return wrap(
      <Link
        href={openHref}
        className={cn(
          'inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1.5 text-[9px] font-bold uppercase tracking-[0.14em] transition-colors',
          'border-cyan-400/55 bg-cyan-400/15 text-cyan-100 shadow-[0_0_18px_rgba(34,211,238,0.22)] hover:border-cyan-300/70 hover:bg-cyan-400/25'
        )}
        aria-label={`Open Lyrics DNA Drop for ${title}`}
      >
        <Dna className="h-3.5 w-3.5 shrink-0" />
        {openLabel}
      </Link>,
      `Open ${title}’s lyric snapshot and Creative DNA.`
    );
  }

  if (lockedHref) {
    return wrap(
      <Link
        href={lockedHref}
        className={cn(
          'inline-flex shrink-0 items-center gap-1.5 rounded-full border border-dashed px-2.5 py-1.5 text-[9px] font-bold uppercase tracking-[0.14em] transition-colors',
          proLockShell('sm'),
          'text-pink-200 hover:border-pink-400/70 hover:bg-pink-600/20',
          proLockText('normal-case tracking-[0.14em]')
        )}
        aria-label={`Studio Pro required for Lyrics DNA on ${title}`}
      >
        <Dna className="h-3.5 w-3.5 shrink-0" />
        {lockedLabel}
      </Link>,
      'Studio Pro opens Lyrics DNA Drops — upgrade on Studio Tier to read and import strands.'
    );
  }

  return null;
}

export function DnaDropAlbumHub({
  album,
  shareId,
  hubShareId,
  ownerName,
  houseRelease = false,
  canViewDna = true,
  signedIn = false,
  releaseAudioHub = false,
  artistName: artistNameProp,
  artistSlug,
  artistUserId,
}: DnaDropAlbumHubProps) {
  const creditedArtist = artistNameProp?.trim() || ownerName;
  const listenHubId = hubShareId?.trim() || shareId;
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
          {releaseAudioHub ? 'Album' : 'Sequence'} · {album.title}
        </h3>
        <ShareArtistLink
          name={creditedArtist}
          slug={artistSlug}
          userId={artistUserId}
          className="pt-0.5"
        />
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
              const hasStrand = trackLyricBarCount(track) > 0;
              const lyricDnaOpenHref = hasStrand && canViewDna
                ? dnaDropSnapshotTrackPath(shareId, track.id)
                : undefined;
              const lyricDnaLockedHref = hasStrand && !canViewDna
                ? signedIn
                  ? DNA_DROP_UPGRADE_PATH
                  : buildDnaDropLoginPath(shareId, 'view')
                : undefined;
              const lyricDnaHref = lyricDnaOpenHref;
              const songListenHref =
                firstDropsOn && hasAudio ? pressedSongHref(listenHubId, { trackId: track.id }) : undefined;
              const rowHref = songListenHref || lyricDnaHref;
              const trackTitle = track.title || `Untitled ${idx + 1}`;

              const main = (
                <>
                   <div
                     className={cn(
                       'relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border font-mono text-[11px] font-bold tabular-nums sm:h-11 sm:w-11',
                      rowHref
                        ? 'border-cyan-400/50 bg-cyan-400/10 text-cyan-200'
                        : 'border-border bg-muted/20 text-muted-foreground'
                    )}
                  >
                    {String(idx + 1).padStart(2, '0')}
                  </div>
                   <div className="min-w-0 flex-1 py-0.5 sm:py-1">
                     <h4 className="break-words font-headline text-[15px] font-bold uppercase leading-[1.15] tracking-tight sm:text-lg">
                       {trackTitle}
                     </h4>
                     <p className="mt-0.5 break-words text-[10px] leading-snug text-muted-foreground">
                       {trackSubtitle(track, firstDropsOn, canViewDna)}
                     </p>
                    <ShareArtistLink
                      name={creditedArtist}
                      slug={artistSlug}
                      userId={artistUserId}
                      showLabel={false}
                      size="sm"
                      disableLink={Boolean(rowHref)}
                      className="mt-0.5 text-fuchsia-200/80"
                    />
                     <p className="mt-1 flex items-start gap-1.5 text-[9px] uppercase leading-snug tracking-widest text-cyan-300/70">
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
                       'flex flex-col items-stretch gap-2 rounded-2xl border border-cyan-400/15 bg-black/20 px-3 py-3 sm:flex-row sm:items-center sm:gap-3 sm:px-4',
                       rowHref && 'hover:border-cyan-400/35'
                     )}
                  >
                    {rowHref ? (
                      <Link
                         href={rowHref}
                         className="-m-1 flex w-full min-w-0 items-center gap-3 rounded-xl p-1 transition-colors hover:bg-cyan-400/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/60 sm:flex-1 sm:gap-4"
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
                       <div className="flex w-full min-w-0 items-center gap-3 opacity-80 sm:flex-1 sm:gap-4">{main}</div>
                     )}
                     <div className="flex justify-start pl-[3.25rem] sm:block sm:pl-0">
                       <LyricsDnaTrackButton
                         hasStrand={hasStrand}
                         openHref={lyricDnaOpenHref}
                         lockedHref={lyricDnaLockedHref}
                         title={trackTitle}
                       />
                     </div>
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
