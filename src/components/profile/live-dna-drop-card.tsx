'use client';

/**
 * Shared live Lyrics DNA Drop list cards — album DNA with nested track DNA,
 * plus standalone track drops.
 */

import Link from 'next/link';
import { CassetteTape, Disc3, ChevronRight, Gift, Music } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDropPulseLine } from '@/lib/drop-pulse';
import { useAuth } from '@/hooks/use-auth';
import { resolveLiveDnaDropItemHref } from '@/lib/dna-drop-access';

export type LiveDnaDropItem = {
  shareId: string;
  title: string;
  type: 'album' | 'track';
  /** Present when this track sits under a live album DNA drop. */
  albumTitle?: string;
  /** Parent album DNA share id when nested under that album. */
  albumShareId?: string;
  /** Vault track id when this strand opens on the album snapshot. */
  trackId?: string;
  /** 0-based album tracklist position (set order). */
  trackIndex?: number;
  trackCount?: number;
  hasDropAudio?: boolean;
  releaseLive?: boolean;
  dnaLive?: boolean;
  houseRelease?: boolean;
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
  const { user } = useAuth();
  const isAlbum = drop.type === 'album';
  const firstDrop = drop.releaseLive === true || (drop.releaseLive === undefined && Boolean(drop.hasDropAudio));
  const pulse = formatDropPulseLine(drop);
  const href = firstDrop && !isAlbum
    ? `/song/${drop.shareId}`
    : firstDrop
      ? `/share/${drop.shareId}`
      : resolveLiveDnaDropItemHref(drop, Boolean(user));

  return (
    <Link
      href={href}
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
            {firstDrop ? (isAlbum ? 'Album release' : 'Music release') : isAlbum ? 'Album DNA' : 'Track DNA'}
            {!drop.houseRelease && drop.dropPriceSummary ? ` · ${drop.dropPriceSummary}` : null}
            {pulse ? ` · ${pulse}` : null}
            {isAlbum && typeof drop.trackCount === 'number'
              ? ` · ${drop.trackCount} track${drop.trackCount === 1 ? '' : 's'}`
              : null}
          </p>
        )}
        {!nested && drop.houseRelease ? (
          <span className="mb-1 inline-flex items-center gap-1 rounded-full border border-cyan-300/40 bg-cyan-300/10 px-2 py-0.5 text-[8px] font-bold uppercase tracking-[0.18em] text-cyan-200">
            <Gift className="h-2.5 w-2.5" /> House release · free
          </span>
        ) : null}
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
                ? drop.houseRelease
                  ? 'Full release included in every member Library'
                  : 'Play 30s · buy once to stream here'
                : isAlbum
                  ? 'Open album · or pick a track below'
                  : 'Lyrics snapshot'}
            </p>
          ))}
        {nested && (
          <p className="text-[9px] font-bold uppercase tracking-widest text-emerald-300/70">
            {drop.hasDropAudio
              ? drop.houseRelease
                ? 'House · Free'
                : `Listen${drop.dropPriceSummary ? ` · ${drop.dropPriceSummary}` : ''}`
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
  const dnaDrops = lyricDnaItems(drops);
  const albums = dnaDrops.filter((d) => d.type === 'album');
  const tracks = dnaDrops.filter((d) => d.type === 'track');
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
  /** Hide the First Drops strip when a dedicated storefront is already on the page. */
  hideFirstDropStrip?: boolean;
};

export function firstDropTracks(drops: LiveDnaDropItem[]): LiveDnaDropItem[] {
  return musicReleaseItems(drops).filter((d) => d.type === 'track');
}

export function musicReleaseItems(drops: LiveDnaDropItem[]): LiveDnaDropItem[] {
  return drops.filter((d) => d.releaseLive === true || (d.releaseLive === undefined && Boolean(d.hasDropAudio)));
}

export function lyricDnaItems(drops: LiveDnaDropItem[]): LiveDnaDropItem[] {
  return drops.filter((d) => d.dnaLive === true);
}

/** Empty picker means every live DNA drop; otherwise only the chosen share ids. */
export function selectDropShelfDna(drops: LiveDnaDropItem[], shareIds?: string[]): LiveDnaDropItem[] {
  const dna = lyricDnaItems(drops);
  const ids = (shareIds || []).map((id) => id.trim()).filter(Boolean);
  if (!ids.length) return dna;
  const selected = new Set(ids);
  return dna.filter((drop) => selected.has(drop.shareId) || (drop.albumShareId ? selected.has(drop.albumShareId) : false));
}

export function LiveDnaDropsGroupedList({
  drops,
  onNavigate,
  layout = 'shelf',
  hideFirstDropStrip = false,
}: LiveDnaDropsGroupedListProps) {
  const { albumGroups, standaloneTracks } = groupLiveDnaDrops(drops);
  const firstDrops = musicReleaseItems(drops);
  const visibleStandalone = hideFirstDropStrip
    ? standaloneTracks
    : standaloneTracks;
  const showFirst = firstDrops.length > 0 && !hideFirstDropStrip;
  if (!albumGroups.length && !visibleStandalone.length && !showFirst) return null;

  return (
    <div className="space-y-5">
      {firstDrops.length > 0 && !hideFirstDropStrip && (
        <div className="space-y-2">
          <p className="text-[9px] font-bold uppercase tracking-[0.28em] text-fuchsia-300/90">
            On sale · {firstDrops.length} — listen / buy
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

      {visibleStandalone.length > 0 && (
        <div className="space-y-2">
          <p className="text-[9px] font-bold uppercase tracking-[0.28em] text-emerald-300/80">
            Track DNA · {visibleStandalone.length}
            {albumGroups.length > 0 ? ' · not on an album drop' : ''}
          </p>
          <div
            className={cn(
              'grid gap-3',
              layout === 'shelf' ? 'sm:grid-cols-2' : 'grid-cols-1'
            )}
          >
            {visibleStandalone.map((drop) => (
              <LiveDnaDropLinkCard key={drop.shareId} drop={drop} onNavigate={onNavigate} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/** Always-on Artist Home storefront — not a module the artist can bury. */
export function FirstDropsStorefront({
  drops,
  isOwner = false,
  onNavigate,
}: {
  drops: LiveDnaDropItem[];
  isOwner?: boolean;
  onNavigate?: () => void;
}) {
  const sale = musicReleaseItems(drops);
  if (!sale.length) return null;
  const houseReleases = sale.filter((drop) => drop.houseRelease);
  const artistReleases = sale.filter((drop) => !drop.houseRelease);

  return (
    <section
      id="first-drops"
      className="mt-10 scroll-mt-24 rounded-2xl border border-fuchsia-400/45 bg-gradient-to-br from-fuchsia-500/18 via-black/40 to-black/20 p-4 sm:p-5"
    >
      <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-fuchsia-200">
            {artistReleases.length ? 'Listen · buy once' : 'House releases · free'}
          </p>
          <h2 className="mt-1 font-headline text-2xl font-bold uppercase tracking-tight text-[var(--ph-text,#fff)] sm:text-3xl">
            {sale.length === 1 ? sale[0].title : `${sale.length} releases`}
          </h2>
          <p className="mt-1 max-w-xl text-sm text-[var(--ph-muted,rgba(255,255,255,0.6))]">
            {artistReleases.length
              ? 'Preview 30 seconds. Unlock to stream in AKAsheet.'
              : 'Included automatically in every signed-in member Library.'}
          </p>
        </div>
        {isOwner ? (
          <p className="text-[10px] font-bold uppercase tracking-widest text-fuchsia-300/80">
            Pinned at the top of your home
          </p>
        ) : null}
      </div>
      {houseReleases.length ? (
        <p className="mb-2 flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-[0.24em] text-cyan-200">
          <Gift className="h-3 w-3" /> House free · {houseReleases.length}
        </p>
      ) : null}
      <div className="grid gap-3 sm:grid-cols-2">
        {[...houseReleases, ...artistReleases].map((drop) => (
          <Link
            key={drop.shareId}
            href={drop.type === 'album' ? `/share/${drop.shareId}` : `/song/${drop.shareId}`}
            onClick={onNavigate}
            className={cn(
              'group flex items-center gap-3 rounded-xl border bg-black/35 p-3.5 transition-colors',
              drop.houseRelease
                ? 'border-cyan-300/45 hover:border-cyan-200/75 hover:bg-cyan-400/10'
                : 'border-fuchsia-400/40 hover:border-fuchsia-300/70 hover:bg-fuchsia-500/10'
            )}
          >
            <span className={cn(
              'flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border',
              drop.houseRelease
                ? 'border-cyan-300/45 bg-cyan-400/15 text-cyan-100'
                : 'border-fuchsia-400/40 bg-fuchsia-500/20 text-fuchsia-200'
            )}>
              {drop.houseRelease ? <Gift className="h-6 w-6" /> : drop.type === 'album' ? <Disc3 className="h-6 w-6" /> : <Music className="h-6 w-6" />}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate font-bold text-[var(--ph-text,#fff)]">{drop.title}</p>
              <p className={cn('text-[11px]', drop.houseRelease ? 'text-cyan-100/85' : 'text-fuchsia-200/85')}>
                {drop.houseRelease ? 'House release · free in Library' : drop.dropPriceSummary || 'Stream here'}
                {drop.albumTitle ? ` · ${drop.albumTitle}` : ''}
              </p>
            </div>
            <span className="shrink-0 rounded-full bg-fuchsia-400 px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-black group-hover:bg-fuchsia-300">
              Listen
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
