'use client';

import Link from 'next/link';
import { Dna, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';
import { hasLiveDnaDrop } from '@/lib/release-management';
import type { Album, Track } from '@/lib/types';

export function releaseRowDnaLive(album: Album, track?: Track): boolean {
  if (track) return hasLiveDnaDrop(track);
  if (hasLiveDnaDrop(album)) return true;
  return (album.tracks || []).some((row) => hasLiveDnaDrop(row));
}

export function ReleaseDnaStatusBadges({
  album,
  track,
  dnaShareId,
  className,
}: {
  album: Album;
  track?: Track;
  /** Public lyric page share id (track.shareId or album.shareId). */
  dnaShareId?: string;
  className?: string;
}) {
  const live = releaseRowDnaLive(album, track);
  const shareId = (dnaShareId || track?.shareId || album.shareId)?.trim();

  return (
    <span className={cn('flex flex-wrap gap-1', className)}>
      {live ? (
        <>
          <span className="inline-flex items-center gap-1 rounded-full border border-fuchsia-400/35 bg-fuchsia-500/10 px-2 py-0.5 text-[8px] font-bold uppercase tracking-[.14em] text-fuchsia-100">
            <Dna className="h-2.5 w-2.5" /> Lyric DNA live
          </span>
          {shareId ? (
            <Link
              href={`/share/${shareId}`}
              className="inline-flex items-center rounded-full border border-cyan-400/30 bg-cyan-500/10 px-2 py-0.5 text-[8px] font-bold uppercase tracking-[.14em] text-cyan-100 hover:border-cyan-300/50"
            >
              Open lyric page
            </Link>
          ) : null}
        </>
      ) : (
        <span className="inline-flex items-center gap-1 rounded-full border border-white/15 bg-black/40 px-2 py-0.5 text-[8px] font-bold uppercase tracking-[.14em] text-muted-foreground">
          <FileText className="h-2.5 w-2.5" /> No lyric DNA
        </span>
      )}
    </span>
  );
}
