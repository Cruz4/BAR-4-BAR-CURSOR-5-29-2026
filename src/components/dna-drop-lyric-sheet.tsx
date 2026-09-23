'use client';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { HighlightedText } from '@/components/highlighted-text';
import type { Track } from '@/lib/types';
import { Clock } from 'lucide-react';
import { ShareArtistLink } from '@/components/share-artist-link';
import {
  DnaDropLinkedAlbumPanel,
  type DnaDropLinkedAlbumTrack,
} from '@/components/dna-drop-linked-album-panel';
import { cn } from '@/lib/utils';

type DnaDropLyricSheetProps = {
  title: string;
  sections: Track['sections'] | undefined;
  rhymeGroups: { words: string[] }[];
  updatedLabel: string;
  albumShareId?: string;
  albumTitle?: string;
  albumTheme?: string;
  albumTracks?: DnaDropLinkedAlbumTrack[];
  currentTrackId?: string;
  artistName?: string;
  artistSlug?: string | null;
  artistUserId?: string | null;
  className?: string;
};

export function DnaDropLyricSheet({
  title,
  sections,
  rhymeGroups,
  updatedLabel,
  albumShareId,
  albumTitle,
  albumTheme,
  albumTracks,
  currentTrackId,
  artistName,
  artistSlug,
  artistUserId,
  className,
}: DnaDropLyricSheetProps) {
  const linkedAlbumTitle = albumTitle?.trim();
  const showLinkedAlbum = Boolean(linkedAlbumTitle);
  const bars = (sections ?? []).reduce(
    (n, sec) => n + (sec.bars?.filter((bar) => bar.text?.trim()).length ?? 0),
    0
  );

  return (
    <Card
      className={cn(
        'relative min-h-[60vh] overflow-hidden border-2 border-cyan-400/25 bg-notebook shadow-[0_0_80px_-24px_rgba(34,211,238,0.55)] md:min-h-[80vh]',
        '[--lyrics-gutter:2.75rem] md:[--lyrics-gutter:3.25rem] lg:[--lyrics-gutter:3.75rem]',
        '[--lyrics-lh:22px] md:[--lyrics-lh:30px] lg:[--lyrics-lh:34px]',
        className
      )}
    >
      <style>{`
        .bg-notebook {
          background-image:
            linear-gradient(90deg, transparent var(--lyrics-gutter), #22d3ee22 var(--lyrics-gutter), #22d3ee22 calc(var(--lyrics-gutter) + 1px), transparent calc(var(--lyrics-gutter) + 1px)),
            repeating-linear-gradient(transparent, transparent calc(var(--lyrics-lh) - 1px), #d946ef08 calc(var(--lyrics-lh) - 1px), #d946ef08 var(--lyrics-lh));
          background-size: 100% var(--lyrics-lh);
          background-attachment: local;
        }
      `}</style>
      <CardHeader className="relative z-10 space-y-3 border-b border-cyan-400/15 bg-card/80 px-5 py-5 sm:px-8 sm:py-6 md:px-10 md:py-8">
        <div className="flex flex-wrap items-center gap-2 sm:gap-4">
          <Badge variant="outline" className="border-cyan-400/40 text-[9px] uppercase tracking-widest text-cyan-300">
            Song Lyrics DNA Drop
          </Badge>
          <div className="flex items-center gap-2 text-[9px] font-bold uppercase text-muted-foreground">
            <Clock className="h-3 w-3" /> {updatedLabel}
          </div>
          <span className="text-[9px] uppercase tracking-widest text-fuchsia-300/80">
            {bars} bar{bars === 1 ? '' : 's'} frozen
          </span>
        </div>
        <h3 className="font-headline text-2xl font-bold uppercase tracking-tight text-foreground sm:text-3xl md:text-4xl">
          {title}
        </h3>
        {artistName ? (
          <ShareArtistLink
            name={artistName}
            slug={artistSlug}
            userId={artistUserId}
            className="pt-0.5"
          />
        ) : null}
        {showLinkedAlbum ? (
          <DnaDropLinkedAlbumPanel
            albumTitle={linkedAlbumTitle!}
            albumShareId={albumShareId}
            albumTheme={albumTheme}
            tracks={albumTracks}
            currentTrackId={currentTrackId}
            className="mt-1"
          />
        ) : null}
      </CardHeader>
      <CardContent className="relative z-10 p-0">
        <div className="space-y-10 px-5 py-8 sm:px-8 sm:py-10 md:space-y-12 md:px-10 md:py-12 lg:px-12 lg:py-14">
          {(sections ?? []).length === 0 ? (
            <p className="pl-[calc(var(--lyrics-gutter)+0.75rem)] text-sm italic leading-relaxed text-muted-foreground">
              No lyrics were frozen in this strand.
            </p>
          ) : (
            (sections ?? []).map((sec) => (
              <div key={sec.id} className="space-y-1">
                <h4 className="mb-3 pl-[calc(var(--lyrics-gutter)+0.75rem)] font-headline text-base font-bold uppercase text-cyan-300 sm:text-xl md:mb-4 md:text-2xl">
                  {sec.type}
                </h4>
                {sec.bars.map((bar) => (
                  <div
                    key={bar.idx}
                    className="relative flex min-h-[var(--lyrics-lh)] items-start pl-[calc(var(--lyrics-gutter)+0.75rem)] pr-2 sm:pr-4 md:pr-8"
                  >
                    <span className="absolute left-0 w-[var(--lyrics-gutter)] pr-2 text-right font-mono text-[10px] font-bold tabular-nums leading-[var(--lyrics-lh)] text-cyan-500/40 md:text-xs">
                      {String(bar.idx).padStart(2, '0')}
                    </span>
                    <p className="min-w-0 w-full max-w-none text-[15px] font-code font-semibold leading-[var(--lyrics-lh)] tracking-normal text-foreground/92 break-words whitespace-pre-wrap sm:text-base md:text-lg lg:text-xl xl:text-[1.35rem] xl:leading-[var(--lyrics-lh)]">
                      {bar.text ? <HighlightedText text={bar.text} rhymeGroups={rhymeGroups} /> : '...'}
                    </p>
                  </div>
                ))}
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
