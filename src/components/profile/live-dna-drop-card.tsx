'use client';

/**
 * Shared live DNA Drop list cards — album DNA with nested track DNA,
 * plus standalone track drops.
 */

import Link from 'next/link';
import { CassetteTape, Disc3, ChevronRight, Music } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDropPulseLine } from '@/lib/drop-pulse';

export type LiveDnaDropItem = {
  shareId: string;
  title: string;
  type: 'album' | 'track';
  /** Present when this track sits under a live album DNA drop. */
  albumTitle?: string;
  /** Parent album DNA share id when nested under that album. */
  albumShareId?: string;
  /** 0-based album tracklist position (set order). */
  trackIndex?: number;
  trackCount?: number;
  hasDropAudio?: boolean;
  dropPriceSummary?: string;
  playCount?: number;
  previewCount?: number;
  purchaseCount?: number;
  firstBuyerName?: string;
};

type LiveDnaDropLinkCardProps = {
  drop: LiveDnaDropItem;
  onNavigate?: () => void;
  className?: string;
  /** Compact nested track under an album group. */
  nested?: boolean;
};

export function LiveDnaDropLinkCard({
  drop,
  onNavigate,
  className,
  nested = false,
}: LiveDnaDropLinkCardProps) {
  const isAlbum = drop.type === 'album';
  const firstDrop = Boolean(drop.hasDropAudio);
  const pulse = formatDropPulseLine(drop);

  return (
    <Link
      href={`/share/${drop.shareId}`}
      onClick={onNavigate}
      className={cn(
        'group flex items-center transition-colors',
        nested
          ? 'gap-2.5 rounded-lg border border-emerald-500/25 bg-emerald-500/[0.07] px-2.5 py-2 hover:border-emerald-400/45'
          : firstDrop
            ? 'gap-3 rounded-xl border border-fuchsia-500/40 bg-gradient-to-br from-fuchsia-500/15 via-black/40 to-black/20 p-3.5 sm:p-4 hover:border-fuchsia-400/55'
            : isAlbum
            ? 'gap-3 rounded-xl border border-violet-500/35 bg-gradient-to-br from-violet-500/15 via-black/40 to-black/20 p-3.5 sm:p-4 hover:border-violet-400/55'
            : 'gap-3 rounded-xl border border-emerald-500/30 bg-gradient-to-br from-emerald-500/10 via-black/35 to-black/20 p-3.5 sm:p-4 hover:border-emerald-400/50',
        className
      )}
    >
      <span
        className={cn(
          'flex shrink-0 items-center justify-center rounded-lg border',
          nested
            ? 'h-8 w-8 border-emerald-400/30 bg-emerald-500/10 text-emerald-300'
            : firstDrop
              ? 'h-11 w-11 border-fuchsia-400/40 bg-fuchsia-500/15 text-fuchsia-300'
            : isAlbum
              ? 'h-11 w-11 border-violet-400/40 bg-violet-500/15 text-violet-300'
              : 'h-11 w-11 border-emerald-400/35 bg-emerald-500/10 text-emerald-300'
        )}
      >
        {firstDrop && !nested ? (
          <Music className="h-5 w-5" />
        ) : isAlbum ? (
          <Disc3 className={nested ? 'h-3.5 w-3.5' : 'h-5 w-5'} />
        ) : (
          <CassetteTape className={nested ? 'h-3.5 w-3.5' : 'h-5 w-5'} />
        )}
      </span>
      <div className="min-w-0 flex-1">
        {!nested && (
          <p
            className={cn(
              'text-[9px] font-bold uppercase tracking-[0.22em]',
              firstDrop ? 'text-fuchsia-300/90' : isAlbum ? 'text-violet-300/90' : 'text-emerald-300/90'
            )}
          >
            {firstDrop ? 'First Drop' : isAlbum ? 'Album DNA' : 'Track DNA'}
            {drop.dropPriceSummary ? ` · ${drop.dropPriceSummary}` : null}
            {pulse ? ` · ${pulse}` : null}
            {isAlbum && typeof drop.trackCount === 'number'
              ? ` · ${drop.trackCount} track${drop.trackCount === 1 ? '' : 's'}`
              : null}
          </p>
        )}
        <p
          className={cn(
            'truncate font-bold text-[var(--ph-text,#fff)]',
            nested ? 'text-xs' : 'text-sm'
          )}
        >
          {drop.title}
        </p>
        {!nested &&
          (!isAlbum && drop.albumTitle ? (
            <p className="truncate text-[10px] text-[var(--ph-muted,rgba(255,255,255,0.55))]">
              From album · {drop.albumTitle}
            </p>
          ) : (
            <p className="text-[10px] text-[var(--ph-muted,rgba(255,255,255,0.45))]">
              {firstDrop
                ? 'Preview 30s · buy once to stream'
                : isAlbum
                  ? 'Open album · or pick a track below'
                  : 'Open track DNA Drop'}
            </p>
          ))}
        {nested && (
          <p className="text-[9px] font-bold uppercase tracking-widest text-emerald-300/70">
            {drop.hasDropAudio
              ? `First Drop${drop.dropPriceSummary ? ` · ${drop.dropPriceSummary}` : ''}`
              : 'Track DNA · open'}
          </p>
        )}
      </div>
      <ChevronRight
        className={cn(
          'shrink-0 opacity-50 transition-opacity group-hover:opacity-100',
          nested ? 'h-3.5 w-3.5 text-emerald-300' : isAlbum ? 'h-4 w-4 text-violet-300' : 'h-4 w-4 text-emerald-300'
        )}
      />
    </Link>
  );
}

export type AlbumDnaGroup = {
  album: LiveDnaDropItem;
  tracks: LiveDnaDropItem[];
};

/** Group track DNA under their live album; leftover tracks stay standalone. */
export function groupLiveDnaDrops(drops: LiveDnaDropItem[]): {
  albumGroups: AlbumDnaGroup[];
  standaloneTracks: LiveDnaDropItem[];
} {
  const albums = drops.filter((d) => d.type === 'album');
  const tracks = drops.filter((d) => d.type === 'track');
  const albumIds = new Set(albums.map((a) => a.shareId));
  const albumTitles = new Map(albums.map((a) => [a.title.trim().toLowerCase(), a.shareId]));

  const grouped = new Map<string, LiveDnaDropItem[]>();
  const standalone: LiveDnaDropItem[] = [];

  for (const track of tracks) {
    const byId =
      track.albumShareId && albumIds.has(track.albumShareId) ? track.albumShareId : undefined;
    const byTitle = track.albumTitle
      ? albumTitles.get(track.albumTitle.trim().toLowerCase())
      : undefined;
    const parentId = byId || byTitle;
    if (parentId) {
      const list = grouped.get(parentId) || [];
      list.push(track);
      grouped.set(parentId, list);
    } else {
      standalone.push(track);
    }
  }

  const albumGroups: AlbumDnaGroup[] = albums.map((album) => {
    const nested = (grouped.get(album.shareId) || []).slice().sort((a, b) => {
      const ai = typeof a.trackIndex === 'number' ? a.trackIndex : Number.POSITIVE_INFINITY;
      const bi = typeof b.trackIndex === 'number' ? b.trackIndex : Number.POSITIVE_INFINITY;
      if (ai !== bi) return ai - bi;
      return a.title.localeCompare(b.title);
    });
    return {
      album: {
        ...album,
        trackCount: nested.length || album.trackCount,
      },
      tracks: nested,
    };
  });

  return { albumGroups, standaloneTracks: standalone };
}

type LiveDnaDropsGroupedListProps = {
  drops: LiveDnaDropItem[];
  onNavigate?: () => void;
  /** Wider shelf grid vs compact dialog stack. */
  layout?: 'shelf' | 'dialog';
};

export function LiveDnaDropsGroupedList({
  drops,
  onNavigate,
  layout = 'shelf',
}: LiveDnaDropsGroupedListProps) {
  const { albumGroups, standaloneTracks } = groupLiveDnaDrops(drops);
  const firstDrops = drops.filter((d) => d.hasDropAudio && d.type === 'track');
  if (!albumGroups.length && !standaloneTracks.length) return null;

  return (
    <div className="space-y-5">
      {firstDrops.length > 0 && (
        <div className="space-y-2">
          <p className="text-[9px] font-bold uppercase tracking-[0.28em] text-fuchsia-300/90">
            First Drops · {firstDrops.length} — listen / buy
          </p>
          <div
            className={cn(
              'grid gap-3',
              layout === 'shelf' ? 'sm:grid-cols-2' : 'grid-cols-1'
            )}
          >
            {firstDrops.map((drop) => (
              <LiveDnaDropLinkCard key={`fd-${drop.shareId}`} drop={drop} onNavigate={onNavigate} />
            ))}
          </div>
        </div>
      )}
      {albumGroups.length > 0 && (
        <div className="space-y-3">
          <p className="text-[9px] font-bold uppercase tracking-[0.28em] text-violet-300/80">
            Album DNA · {albumGroups.length}
          </p>
          <div className={cn(layout === 'shelf' ? 'grid gap-4' : 'space-y-3')}>
            {albumGroups.map(({ album, tracks }) => (
              <div
                key={album.shareId}
                className="rounded-2xl border border-violet-500/20 bg-violet-500/[0.04] p-3 sm:p-3.5 space-y-2.5"
              >
                <LiveDnaDropLinkCard
                  drop={{
                    ...album,
                    trackCount: tracks.length || album.trackCount,
                  }}
                  onNavigate={onNavigate}
                />
                {tracks.length > 0 && (
                  <div className="space-y-1.5 pl-1 sm:pl-2">
                    <p className="text-[8px] font-bold uppercase tracking-[0.24em] text-emerald-300/65 px-0.5">
                      Tracks in this album · {tracks.length} — open one directly
                    </p>
                    <div
                      className={cn(
                        'grid gap-1.5',
                        layout === 'shelf' ? 'sm:grid-cols-2' : 'grid-cols-1'
                      )}
                    >
                      {tracks.map((track) => (
                        <LiveDnaDropLinkCard
                          key={track.shareId}
                          drop={track}
                          nested
                          onNavigate={onNavigate}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {standaloneTracks.length > 0 && (
        <div className="space-y-2">
          <p className="text-[9px] font-bold uppercase tracking-[0.28em] text-emerald-300/80">
            Track DNA · {standaloneTracks.length}
            {albumGroups.length > 0 ? ' · not on an album drop' : ''}
          </p>
          <div
            className={cn(
              'grid gap-3',
              layout === 'shelf' ? 'sm:grid-cols-2' : 'grid-cols-1'
            )}
          >
            {standaloneTracks.map((drop) => (
              <LiveDnaDropLinkCard key={drop.shareId} drop={drop} onNavigate={onNavigate} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
