'use client';

import Link from 'next/link';
import { Disc3, ChevronRight } from 'lucide-react';
import { dnaDropSharePath, dnaDropSnapshotTrackPath } from '@/lib/dna-drop-access';
import { cn } from '@/lib/utils';

export type DnaDropLinkedAlbumTrack = {
  id: string;
  title: string;
  /** Lyric bars in this snapshot — controls whether strand link is shown. */
  lyricBarCount: number;
};

export type DnaDropLinkedAlbumPanelProps = {
  albumTitle: string;
  /** When set, album title and strands link into the album Lyrics DNA hub. */
  albumShareId?: string;
  albumTheme?: string;
  tracks?: DnaDropLinkedAlbumTrack[];
  currentTrackId?: string;
  className?: string;
};

export function DnaDropLinkedAlbumPanel({
  albumTitle,
  albumShareId,
  albumTheme,
  tracks,
  currentTrackId,
  className,
}: DnaDropLinkedAlbumPanelProps) {
  const title = albumTitle.trim() || 'Untitled album';
  const hubHref = albumShareId?.trim() ? dnaDropSharePath(albumShareId.trim()) : undefined;
  const showTrackList = Boolean(tracks?.length && hubHref);

  return (
    <div
      className={cn(
        'rounded-xl border border-cyan-400/20 bg-cyan-950/20 px-3 py-3 sm:px-4 sm:py-3.5',
        className
      )}
    >
      <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-cyan-300/80">Linked album</p>
      <div className="mt-2 flex items-start gap-2.5">
        <Disc3 className="mt-0.5 h-4 w-4 shrink-0 text-cyan-400/70" aria-hidden />
        <div className="min-w-0 flex-1 space-y-1">
          {hubHref ? (
            <Link
              href={hubHref}
              className="group inline-flex max-w-full items-center gap-1.5 text-sm font-bold uppercase tracking-tight text-cyan-100 hover:text-cyan-50"
            >
              <span className="truncate">{title}</span>
              <ChevronRight className="h-4 w-4 shrink-0 opacity-70 transition-transform group-hover:translate-x-0.5" />
            </Link>
          ) : (
            <p className="truncate text-sm font-bold uppercase tracking-tight text-foreground/90">{title}</p>
          )}
          {albumTheme?.trim() ? (
            <p className="text-[11px] italic leading-snug text-muted-foreground">&ldquo;{albumTheme.trim()}&rdquo;</p>
          ) : null}
          {!hubHref ? (
            <p className="text-[10px] leading-snug text-muted-foreground">
              This strand belongs to an album in the artist&apos;s vault. The album Lyrics DNA sequence is not shared
              yet.
            </p>
          ) : null}
        </div>
      </div>

      {showTrackList ? (
        <ul className="mt-3 space-y-1 border-t border-cyan-400/15 pt-3" aria-label={`Tracks on ${title}`}>
          {tracks!.map((track, index) => {
            const isCurrent = Boolean(currentTrackId && track.id === currentTrackId);
            const strandHref =
              track.lyricBarCount > 0
                ? dnaDropSnapshotTrackPath(albumShareId!, track.id)
                : undefined;
            const row = (
              <>
                <span className="w-5 shrink-0 tabular-nums text-[10px] text-muted-foreground/70">
                  {String(index + 1).padStart(2, '0')}
                </span>
                <span className="min-w-0 flex-1 truncate">{track.title || 'Untitled'}</span>
                {track.lyricBarCount > 0 ? (
                  <span className="hidden shrink-0 text-[9px] uppercase tracking-wider text-muted-foreground sm:inline">
                    {track.lyricBarCount} bar{track.lyricBarCount === 1 ? '' : 's'}
                  </span>
                ) : (
                  <span className="shrink-0 text-[9px] uppercase tracking-wider text-muted-foreground/50">
                    No strand
                  </span>
                )}
              </>
            );
            return (
              <li key={track.id}>
                {strandHref && !isCurrent ? (
                  <Link
                    href={strandHref}
                    className="flex items-center gap-2 rounded-lg px-1.5 py-1.5 text-[11px] font-semibold text-foreground/85 transition-colors hover:bg-cyan-400/10 hover:text-cyan-100"
                  >
                    {row}
                  </Link>
                ) : (
                  <div
                    className={cn(
                      'flex items-center gap-2 rounded-lg px-1.5 py-1.5 text-[11px] font-semibold',
                      isCurrent
                        ? 'bg-cyan-400/15 text-cyan-50 ring-1 ring-cyan-400/25'
                        : 'text-muted-foreground/70'
                    )}
                    aria-current={isCurrent ? 'true' : undefined}
                  >
                    {row}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
