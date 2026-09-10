/** House release credited to an artist profile (may differ from vault owner). */

export function resolveHouseArtistId(share: {
  houseRelease?: boolean;
  houseArtistId?: unknown;
  ownerId?: unknown;
}): string | undefined {
  if (share.houseRelease !== true) return undefined;
  const linked = typeof share.houseArtistId === 'string' ? share.houseArtistId.trim() : '';
  if (linked) return linked;
  const ownerId = typeof share.ownerId === 'string' ? share.ownerId.trim() : '';
  return ownerId || undefined;
}

export function isHouseReleaseVisibleOnHome(
  shareId: string,
  hiddenShareIds?: string[] | null
): boolean {
  if (!hiddenShareIds?.length) return true;
  return !hiddenShareIds.includes(shareId);
}
