'use client';

import Link from 'next/link';
import { Disc3, ExternalLink, Music, Settings2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ReleaseDnaDropPanel } from '@/components/release-dna-drop-panel';
import { openFirstDropLathe } from '@/lib/first-drop-lathe';
import { normalizeDropAudio } from '@/lib/drop-commerce';
import { releaseShareIdOf, releaseStatusOf } from '@/lib/release-management';
import { cn } from '@/lib/utils';
import type { Album, ReleaseStatus } from '@/lib/types';

const STATUS_LABEL: Record<ReleaseStatus, string> = {
  live: 'Live',
  draft: 'Draft',
  unlisted: 'Offline',
};

export function AlbumVaultReleasePanel({ album, className }: { album: Album; className?: string }) {
  const albumRecord = { ...album, tracks: album.tracks };
  const releaseId = releaseShareIdOf(albumRecord);
  const status = releaseStatusOf(albumRecord);
  const audioTrackCount = (album.tracks || []).filter((t) => normalizeDropAudio(t.dropAudio)).length;
  const hasReleaseWork = Boolean(releaseId || status || audioTrackCount > 0);

  const openAlbumDesk = () => {
    openFirstDropLathe({
      albumId: album.id,
      mode: 'album',
      ...(releaseId ? { shareId: releaseId } : {}),
    });
  };

  return (
    <div className={cn('space-y-3', className)}>
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-fuchsia-200/90 sm:text-sm">
          Album drop &amp; release
        </p>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground sm:text-sm">
          Music releases and Lyrics DNA Drops are separate. Update pricing, audio, lyric snapshots, or take either
          offline — without leaving this album.
        </p>
      </div>

      <div className="space-y-2 rounded-xl border border-fuchsia-400/25 bg-fuchsia-500/[0.06] p-3">
        <div className="flex flex-wrap items-center gap-2">
          <Disc3 className="h-4 w-4 shrink-0 text-fuchsia-300" aria-hidden />
          <span className="text-xs font-bold uppercase tracking-wider text-fuchsia-100">Music release</span>
          {status ? (
            <span
              className={cn(
                'rounded-full border px-2 py-0.5 text-[11px] font-bold uppercase tracking-[.1em] sm:text-xs',
                status === 'live' && 'border-emerald-400/40 bg-emerald-500/10 text-emerald-100',
                status === 'unlisted' && 'border-white/20 bg-black/30 text-muted-foreground',
                status === 'draft' && 'border-amber-400/35 bg-amber-500/10 text-amber-100'
              )}
            >
              {STATUS_LABEL[status]}
            </span>
          ) : (
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Not published</span>
          )}
        </div>
        <p className="text-xs leading-relaxed text-muted-foreground sm:text-sm">
          {audioTrackCount > 0
            ? `${audioTrackCount} track${audioTrackCount === 1 ? '' : 's'} with audio on this album.`
            : 'Upload recordings on the release desk to press this album live.'}
        </p>
        <div className="flex flex-wrap gap-1.5 pt-0.5">
          {releaseId && status === 'live' ? (
            <Button asChild size="sm" variant="secondary" className="h-9 gap-1.5 text-xs font-bold uppercase">
              <Link href={`/share/${releaseId}`}>
                <ExternalLink className="h-3 w-3" /> Open release page
              </Link>
            </Button>
          ) : null}
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-9 gap-1.5 text-xs font-bold uppercase"
            onClick={openAlbumDesk}
          >
            <Settings2 className="h-3 w-3" />
            {status === 'live' ? 'Update release' : hasReleaseWork ? 'Open release desk' : 'New album release'}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="h-9 gap-1.5 text-xs font-bold uppercase text-fuchsia-200/90"
            onClick={() => openFirstDropLathe({ albumId: album.id, mode: 'song' })}
          >
            <Music className="h-3 w-3" /> Release a single
          </Button>
        </div>
      </div>

      <ReleaseDnaDropPanel album={album} />
    </div>
  );
}
