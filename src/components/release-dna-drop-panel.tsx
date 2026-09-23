'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Dna, ExternalLink, Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ShareDialog } from '@/components/share-dialog';
import { hasLiveDnaDrop } from '@/lib/release-management';
import { DNA_DROP_UPGRADE_PATH } from '@/lib/dna-drop-access';
import { isProOrTrial } from '@/lib/subscription';
import { useAuth } from '@/hooks/use-auth';
import { cn } from '@/lib/utils';
import type { Album, Track } from '@/lib/types';

export function ReleaseDnaDropPanel({
  album,
  track,
  compact = false,
  className,
}: {
  album: Album;
  track?: Track;
  compact?: boolean;
  className?: string;
}) {
  const { user } = useAuth();
  const isPro = isProOrTrial(user);
  const [open, setOpen] = useState(false);
  const live = track ? hasLiveDnaDrop(track) : hasLiveDnaDrop(album) || (album.tracks || []).some((row) => hasLiveDnaDrop(row));
  const dnaShareId = (track?.shareId || album.shareId)?.trim();
  const vaultHref = track
    ? `/albums/${album.id}/tracks/${track.id}`
    : `/albums/${album.id}`;

  return (
    <>
      <div
        className={cn(
          'rounded-xl border border-violet-400/25 bg-violet-500/[0.06]',
          compact ? 'p-2' : 'space-y-2 p-3',
          className
        )}
      >
        {!compact ? (
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-violet-200/90">
            Lyrics DNA Drop · separate from this release
          </p>
        ) : null}
        <p className={cn('leading-relaxed text-muted-foreground', compact ? 'text-[9px]' : 'text-[10px]')}>
          {live
            ? 'Public lyric page is live. Update the snapshot after sheet edits.'
            : 'Publish a Pro lyric page from your Vault sheet — optional for audio-only releases.'}
        </p>
        <div className="flex flex-wrap items-center gap-1.5">
          {live && dnaShareId ? (
            <Button asChild size="sm" variant="secondary" className="h-8 gap-1 text-[9px] font-bold uppercase">
              <Link href={`/share/${dnaShareId}`}>
                <ExternalLink className="h-3 w-3" /> Lyric page
              </Link>
            </Button>
          ) : null}
          {isPro ? (
            <Button
              type="button"
              size="sm"
              variant={live ? 'outline' : 'default'}
              className={cn(
                'h-8 gap-1 text-[9px] font-bold uppercase',
                !live && 'bg-violet-600 hover:bg-violet-500'
              )}
              onClick={() => setOpen(true)}
            >
              <Globe className="h-3 w-3" />
              {live ? 'Update DNA Drop' : 'Publish DNA Drop'}
            </Button>
          ) : (
            <Button asChild size="sm" variant="outline" className="h-8 gap-1 text-[9px] font-bold uppercase">
              <Link href={DNA_DROP_UPGRADE_PATH}>
                <Dna className="h-3 w-3" /> Pro · DNA Drop
              </Link>
            </Button>
          )}
          {!compact ? (
            <Button asChild size="sm" variant="ghost" className="h-8 text-[9px] font-bold uppercase">
              <Link href={vaultHref}>Edit sheet in Vault</Link>
            </Button>
          ) : null}
        </div>
      </div>
      {isPro && track ? (
        <ShareDialog
          open={open}
          onOpenChange={setOpen}
          type="track"
          id={track.id}
          title={track.title || 'Untitled'}
          albumId={album.id}
          existingShareId={track.shareId}
        />
      ) : null}
      {isPro && !track ? (
        <ShareDialog
          open={open}
          onOpenChange={setOpen}
          type="album"
          id={album.id}
          title={album.title || 'Untitled'}
          existingShareId={album.shareId}
        />
      ) : null}
    </>
  );
}
