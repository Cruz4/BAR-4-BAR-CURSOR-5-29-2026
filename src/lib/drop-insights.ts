export type DropInsightTotals = {
  qualifiedListeners: number;
  repeatListeners: number;
  completions: number;
  milestone25: number;
  purchases: number;
  repeatBuyers: number;
  grossCents: number;
};
export type DropInsightDay = {
  day: string;
  recordedStarts: number;
  qualifiedListeners: number;
  repeatListeners: number;
  completions: number;
  purchases: number;
};

/** Album hubs vs playable songs — never mix these in one ranked list. */
export type DropInsightReleaseKind = 'song' | 'album';

export type DropInsightTrack = {
  shareId: string;
  title: string;
  kind: DropInsightReleaseKind;
  /** Present when this song belongs to a live album release. */
  albumTitle?: string;
  albumShareId?: string;
  trackIndex?: number;
  /** Album hub only: nested track count from the album payload. */
  trackCount?: number;
  lifetimePreviewStarts: number;
  lifetimeFullStarts: number;
  lifetimePurchases: number;
  qualifiedListeners: number;
  repeatListeners: number;
  completions: number;
  purchases: number;
};

export type DropInsightLifetime = {
  trackedDrops: number;
  previewStarts: number;
  fullStarts: number;
  purchases: number;
  grossCents: number;
};

export type DropInsightsResponse = {
  days: number;
  totals: DropInsightTotals;
  rates: {
    qualifiedPercent: number;
    completionPercent: number;
    listenerToBuyerPercent: number;
  };
  sources: Record<string, number>;
  timeline: DropInsightDay[];
  /** Ranked songs only (standalone + album tracks). Album hubs live in `albums`. */
  tracks: DropInsightTrack[];
  /** Album-page listens / album purchases — not summed into song rows. */
  albums: DropInsightTrack[];
  lifetime: DropInsightLifetime;
  integrity: {
    qualifiedAtPercent: 80;
    ownerActionsExcluded: true;
    paymentAmountAffectsOrganicRank: false;
    historicalStartsAreQualified: false;
    /** Album page metrics stay on the album; song pages stay on the song. */
    albumAndSongCountsAreSeparate: true;
  };
};

export type DropInsightAttentionInput = Pick<
  DropInsightTrack,
  | 'lifetimePurchases'
  | 'repeatListeners'
  | 'qualifiedListeners'
  | 'lifetimePreviewStarts'
  | 'lifetimeFullStarts'
>;

/** Same attention weight used by Top Songs / album ranking. */
export function dropInsightAttentionScore(row: DropInsightAttentionInput): number {
  return (
    row.lifetimePurchases * 8 +
    row.repeatListeners * 3 +
    row.qualifiedListeners +
    row.lifetimePreviewStarts +
    row.lifetimeFullStarts * 2
  );
}

export function compareDropInsightAttention(
  a: DropInsightAttentionInput,
  b: DropInsightAttentionInput
): number {
  return dropInsightAttentionScore(b) - dropInsightAttentionScore(a);
}

/**
 * Split mixed insight rows so album hubs never compete with songs in Top Songs.
 * Nested album tracks stay in `tracks` with albumTitle / albumShareId set.
 */
export function partitionDropInsightReleases(
  rows: DropInsightTrack[],
  limits: { songs?: number; albums?: number } = {}
): { tracks: DropInsightTrack[]; albums: DropInsightTrack[] } {
  const songLimit = limits.songs ?? 12;
  const albumLimit = limits.albums ?? 8;
  const songs = rows
    .filter((row) => row.kind !== 'album')
    .map((row) => ({ ...row, kind: 'song' as const }))
    .sort(compareDropInsightAttention)
    .slice(0, songLimit);
  const albums = rows
    .filter((row) => row.kind === 'album')
    .map((row) => ({ ...row, kind: 'album' as const }))
    .sort(compareDropInsightAttention)
    .slice(0, albumLimit);
  return { tracks: songs, albums };
}

/** Short subtitle for Top Songs / insights lists. */
export function dropInsightReleaseSubtitle(row: DropInsightTrack): string {
  if (row.kind === 'album') {
    const count = typeof row.trackCount === 'number' && row.trackCount > 0
      ? ` · ${row.trackCount} track${row.trackCount === 1 ? '' : 's'}`
      : '';
    return `Album${count}`;
  }
  if (row.albumTitle?.trim()) return `From ${row.albumTitle.trim()}`;
  return 'Single';
}

export type DropInsightAlbumNestInput = {
  shareId: string;
  type: 'album' | 'track' | string;
  title: string;
  nestedTracks?: Array<{ shareId: string; title?: string; trackIndex: number }>;
};

/**
 * Link nested album track shareIds back to their album hub.
 * Album hubs keep kind=album; nested songs gain albumTitle / albumShareId.
 */
export function linkDropInsightAlbumNesting(
  shares: DropInsightAlbumNestInput[]
): Map<string, Pick<DropInsightTrack, 'kind' | 'title' | 'albumTitle' | 'albumShareId' | 'trackIndex' | 'trackCount'>> {
  const meta = new Map<
    string,
    Pick<DropInsightTrack, 'kind' | 'title' | 'albumTitle' | 'albumShareId' | 'trackIndex' | 'trackCount'>
  >();

  for (const share of shares) {
    const kind: DropInsightReleaseKind = share.type === 'album' ? 'album' : 'song';
    const nested = share.type === 'album' ? share.nestedTracks || [] : [];
    meta.set(share.shareId, {
      kind,
      title: share.title,
      ...(kind === 'album' && nested.length ? { trackCount: nested.length } : {}),
    });
  }

  for (const share of shares) {
    if (share.type !== 'album') continue;
    const nested = share.nestedTracks || [];
    for (const track of nested) {
      const shareId = track.shareId.trim();
      if (!shareId) continue;
      const existing = meta.get(shareId);
      meta.set(shareId, {
        kind: 'song',
        title:
          (typeof track.title === 'string' && track.title.trim()
            ? track.title.trim().slice(0, 120)
            : existing?.title) || 'Untitled track',
        albumTitle: share.title,
        albumShareId: share.shareId,
        trackIndex: track.trackIndex,
      });
    }
  }

  return meta;
}
