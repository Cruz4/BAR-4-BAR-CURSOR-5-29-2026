'use client';

import { CheckCircle2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { DnaDropLiveIndicator } from '@/components/dna-drop-live-indicator';
import { CollabSheetLiveIndicator } from '@/components/collab-sheet/collab-sheet-live-indicator';
import { FirstDropLiveIndicator } from '@/components/first-drop-live-indicator';
import type { Track, Album } from '@/lib/types';
import { cn } from '@/lib/utils';
import {
  albumHasCompleteTrack,
  getAlbumCollabTrack,
  getAlbumFirstDropTrack,
  getAlbumLiveDnaShareId,
} from '@/lib/track-live-flags';
import { releaseShareIdOf } from '@/lib/release-management';

function CompleteLiveIndicator({
  variant = 'compact',
}: {
  variant?: 'badge' | 'dot' | 'compact';
}) {
  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>
          {variant === 'dot' ? (
            <span
              className="relative inline-flex h-7 w-7 items-center justify-center rounded-full border border-green-500/45 bg-black/85 shadow-[0_0_14px_rgba(34,197,94,0.25)]"
              aria-label="Has complete tracks"
            >
              <CheckCircle2 className="h-3.5 w-3.5 text-green-400" />
            </span>
          ) : variant === 'compact' ? (
            <span
              className="inline-flex items-center gap-1 rounded-full border border-green-500/35 bg-green-500/10 pl-1.5 pr-2 py-0.5 shrink-0"
              aria-label="Track marked complete"
            >
              <CheckCircle2 className="h-3 w-3 shrink-0 text-green-400" />
            </span>
          ) : (
            <Badge
              variant="outline"
              className="h-5 gap-1 px-1.5 text-[8px] font-bold uppercase tracking-wide border-green-500/40 bg-green-500/10 text-green-300 shrink-0"
            >
              <CheckCircle2 className="h-2.5 w-2.5 shrink-0" />
              Done
            </Badge>
          )}
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-[200px]">
          <p className="text-[10px] font-bold uppercase text-green-300">Track complete</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">Marked finished in Track Status.</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export function TrackLiveIndicators({
  track,
  variant = 'compact',
  className,
  showComplete = true,
  linkLivePages = false,
  releaseHref,
  releaseLive,
}: {
  track: Track;
  variant?: 'badge' | 'dot' | 'compact';
  className?: string;
  showComplete?: boolean;
  /** Album rows can link each live badge to its own public destination. */
  linkLivePages?: boolean;
  /** Override for an audio track included in a parent album release. */
  releaseHref?: string;
  releaseLive?: boolean;
}) {
  const releaseId = releaseShareIdOf(track);
  return (
    <div className={cn('flex flex-wrap items-center gap-1.5', className)}>
      <DnaDropLiveIndicator
        shareId={track.shareId}
        variant={variant}
        href={linkLivePages && track.shareId ? `/share/${track.shareId}` : undefined}
      />
      <FirstDropLiveIndicator
        track={track}
        variant={variant}
        live={releaseLive}
        href={releaseHref || (linkLivePages && releaseId ? `/song/${releaseId}` : undefined)}
      />
      <CollabSheetLiveIndicator collabSheetId={track.collabSheetId} variant={variant} />
      {showComplete && track.status === 'complete' ? <CompleteLiveIndicator variant={variant} /> : null}
    </div>
  );
}

export function AlbumLiveIndicators({
  album,
  variant = 'compact',
  className,
  showComplete = true,
}: {
  album: Album;
  variant?: 'badge' | 'dot' | 'compact';
  className?: string;
  showComplete?: boolean;
}) {
  const dnaShareId = getAlbumLiveDnaShareId(album);
  const collabTrack = getAlbumCollabTrack(album);
  const firstDropTrack = getAlbumFirstDropTrack(album);

  return (
    <div className={cn('flex flex-wrap items-center gap-1.5', className)}>
      <DnaDropLiveIndicator shareId={dnaShareId} variant={variant} />
      {firstDropTrack ? <FirstDropLiveIndicator track={firstDropTrack} variant={variant} /> : null}
      <CollabSheetLiveIndicator collabSheetId={collabTrack?.collabSheetId} variant={variant} />
      {showComplete && albumHasCompleteTrack(album) ? <CompleteLiveIndicator variant={variant} /> : null}
    </div>
  );
}
