import { buildLoginPath } from '@/lib/checkout-intent';

/** Studio Tier query that scrolls to and flashes the Lyrics DNA Drop perk. */
export const DNA_DROP_HIGHLIGHT = 'dna-drop';

export const DNA_DROP_UPGRADE_PATH = `/usage?tab=cloud&highlight=${DNA_DROP_HIGHLIGHT}`;

export const DNA_DROP_UPGRADE_TOAST = {
  title: 'Lyrics DNA Drops are Studio Pro',
  description:
    'Upgrade to open this lyric snapshot, save it to your vault, and reuse Creative DNA strands on your own songs.',
} as const;

export type DnaDropAccessKind = 'view' | 'import';

export function isDnaDropLoginIntent(intent: string | null | undefined): boolean {
  return intent === 'dna-drop' || intent === 'dna-import';
}

export function isDnaDropAccessFeature(feature: string): boolean {
  return /DNA Drop|Shareable lyric links|lyric links/i.test(feature);
}

export const DNA_DROP_SNAPSHOT_TRACK_PARAM = 'track';

export function dnaDropSharePath(shareId: string): string {
  return `/share/${encodeURIComponent(shareId.trim())}`;
}

/** Stay on the album snapshot — lyrics live in that payload. A per-track share often 404s to Discover. */
export function dnaDropSnapshotTrackPath(albumShareId: string, trackId: string): string {
  const id = trackId.trim();
  if (!id) return dnaDropSharePath(albumShareId);
  return `${dnaDropSharePath(albumShareId)}?${DNA_DROP_SNAPSHOT_TRACK_PARAM}=${encodeURIComponent(id)}`;
}

/** Guest sign-in: must be Pro to view / download / import; sign in to check tier or create an account. */
export function buildDnaDropLoginPath(
  shareId: string,
  kind: DnaDropAccessKind = 'view'
): string {
  const intent = kind === 'import' ? 'dna-import' : 'dna-drop';
  return `${buildLoginPath(dnaDropSharePath(shareId))}&intent=${intent}`;
}

function buildDnaDropSnapshotLoginPath(
  albumShareId: string,
  trackId: string,
  kind: DnaDropAccessKind = 'view'
): string {
  const intent = kind === 'import' ? 'dna-import' : 'dna-drop';
  return `${buildLoginPath(dnaDropSnapshotTrackPath(albumShareId, trackId))}&intent=${intent}`;
}

export type LiveDnaDropLinkTarget = {
  shareId: string;
  type: 'album' | 'track';
  albumShareId?: string;
  trackId?: string;
};

/** Prefer album snapshot + ?track= for strands nested under a live album DNA drop. */
export function resolveLiveDnaDropItemHref(
  drop: LiveDnaDropLinkTarget,
  signedIn: boolean,
  isPro = true
): string {
  if (drop.type === 'album') {
    return resolveDnaDropHref(drop.shareId, signedIn, isPro);
  }
  const albumShareId = drop.albumShareId?.trim();
  const trackId = drop.trackId?.trim();
  if (albumShareId && trackId && albumShareId !== drop.shareId.trim()) {
    if (!signedIn) return buildDnaDropSnapshotLoginPath(albumShareId, trackId, 'view');
    if (!isPro) return DNA_DROP_UPGRADE_PATH;
    return dnaDropSnapshotTrackPath(albumShareId, trackId);
  }
  return resolveDnaDropHref(drop.shareId, signedIn, isPro);
}

/**
 * Click destination for a Lyrics DNA Drop (lyric snapshot), not a music release.
 * Guests go to sign-in. Signed-in members open the share page, which sends
 * non-Pro visitors to Studio Tier with the Lyrics DNA Drop perk highlighted.
 */
export function resolveDnaDropHref(shareId: string, signedIn: boolean, isPro = true): string {
  if (!signedIn) return buildDnaDropLoginPath(shareId, 'view');
  if (!isPro) return DNA_DROP_UPGRADE_PATH;
  return dnaDropSharePath(shareId);
}

export function resolveDnaDropImportPath(shareId: string, opts: {
  signedIn: boolean;
  isPro: boolean;
}): string {
  if (!opts.signedIn) return buildDnaDropLoginPath(shareId, 'import');
  if (!opts.isPro) return DNA_DROP_UPGRADE_PATH;
  return dnaDropSharePath(shareId);
}
