'use client';

import Link from 'next/link';
import { CheckCircle2, Dna, Music2, Users } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import type { Album, Track } from '@/lib/types';
import {
  hasLiveCollabSheet,
  hasLiveFirstDrop,
  matchesLooseTrackFilter,
  type LooseTrackFilter,
} from '@/lib/track-live-flags';
import { hasLiveDnaDrop } from '@/lib/release-management';

type Scope = 'loose' | 'albums';

type StatusKey = Exclude<LooseTrackFilter, 'all' | 'live'>;

const STATUS_KEYS: Array<{
  key: StatusKey;
  label: string;
  Icon: typeof Dna;
  lit: string;
}> = [
  { key: 'complete', label: 'Done', Icon: CheckCircle2, lit: 'border-green-400/55 bg-green-500/15 text-green-200 shadow-[0_0_14px_rgba(34,197,94,0.22)]' },
  { key: 'collab', label: 'Collab', Icon: Users, lit: 'border-violet-400/55 bg-violet-500/15 text-violet-200 shadow-[0_0_14px_rgba(167,139,250,0.22)]' },
  { key: 'dna', label: 'Lyric DNA', Icon: Dna, lit: 'border-cyan-400/55 bg-cyan-500/15 text-cyan-100 shadow-[0_0_16px_rgba(34,211,238,0.28)]' },
  { key: 'first-drop', label: 'Pressed', Icon: Music2, lit: 'border-amber-400/55 bg-amber-500/15 text-amber-100 shadow-[0_0_14px_rgba(251,191,36,0.22)]' },
];

function trackMatchesStatus(track: Track, key: StatusKey): boolean {
  if (key === 'complete') return track.status === 'complete';
  if (key === 'collab') return hasLiveCollabSheet(track);
  if (key === 'dna') return hasLiveDnaDrop(track);
  if (key === 'first-drop') return hasLiveFirstDrop(track);
  return false;
}

function albumMatchesStatus(album: Album, key: StatusKey): boolean {
  if (key === 'dna' && hasLiveDnaDrop(album)) return true;
  return (album.tracks || []).some((track) => trackMatchesStatus(track, key));
}

export function VaultStatusBadgeRow({
  scope,
  looseTracks,
  albums,
  className,
}: {
  scope: Scope;
  looseTracks: Track[];
  albums: Album[];
  className?: string;
}) {
  return (
    <div className={cn('flex flex-wrap items-center gap-1', className)}>
      {STATUS_KEYS.map(({ key, label, Icon, lit }) => {
        const list =
          scope === 'loose'
            ? looseTracks
                .filter((track) => (key === 'dna' ? hasLiveDnaDrop(track) : matchesLooseTrackFilter(track, key)))
                .map((track) => ({
                  href: `/albums/unassigned/tracks/${track.id}`,
                  title: track.title || 'Untitled',
                }))
            : [
                ...albums
                  .filter((album) => albumMatchesStatus(album, key) && key === 'dna' && hasLiveDnaDrop(album))
                  .map((album) => ({
                    href: `/albums/${album.id}`,
                    title: `${album.title || 'Untitled album'} · album DNA`,
                  })),
                ...albums.flatMap((album) =>
                  (album.tracks || [])
                    .filter((track) => trackMatchesStatus(track, key))
                    .map((track) => ({
                      href: `/albums/${album.id}/tracks/${track.id}`,
                      title: `${track.title || 'Untitled'} · ${album.title || 'Album'}`,
                    }))
                ),
              ];

        const count = list.length;
        const disabled = count === 0;

        return (
          <Popover key={key}>
            <PopoverTrigger asChild>
              <button
                type="button"
                disabled={disabled}
                className={cn(
                  'inline-flex h-7 min-w-[2.25rem] items-center justify-center gap-1 rounded-full border px-2 text-[9px] font-bold uppercase tracking-[0.12em] transition-colors',
                  disabled
                    ? 'cursor-default border-white/10 bg-black/20 text-muted-foreground/35'
                    : cn(lit, 'hover:brightness-110')
                )}
                title={disabled ? `No ${label}` : `${count} ${label}`}
                aria-label={`${label}: ${count}`}
              >
                <Icon className="h-3 w-3 shrink-0" />
                <span className="tabular-nums">{count}</span>
              </button>
            </PopoverTrigger>
            {!disabled ? (
              <PopoverContent
                align="start"
                side="bottom"
                className="w-56 max-h-64 overflow-y-auto p-2"
                onOpenAutoFocus={(e) => e.preventDefault()}
              >
                <p className="mb-1.5 px-1 text-[9px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
                  {label}
                </p>
                <ul className="space-y-0.5">
                  {list.map((row) => (
                    <li key={row.href}>
                      <Link
                        href={row.href}
                        className="block truncate rounded-md px-2 py-1.5 text-xs font-medium hover:bg-muted/80"
                      >
                        {row.title}
                      </Link>
                    </li>
                  ))}
                </ul>
              </PopoverContent>
            ) : null}
          </Popover>
        );
      })}
    </div>
  );
}
