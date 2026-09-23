/** Client-side mirror of server displayReachFromParts. */
export function displayReachFromParts(unique: number, legacyPageLoads: number): number {
  const u = Number.isFinite(unique) && unique >= 0 ? Math.floor(unique) : 0;
  const l = Number.isFinite(legacyPageLoads) && legacyPageLoads >= 0 ? Math.floor(legacyPageLoads) : 0;
  return Math.max(u, l);
}

export function displayReachCount(unique: number | undefined, legacyViews?: number): number {
  const u =
    typeof unique === 'number' && Number.isFinite(unique) ? Math.max(0, Math.floor(unique)) : 0;
  const l =
    typeof legacyViews === 'number' && Number.isFinite(legacyViews)
      ? Math.max(0, Math.floor(legacyViews))
      : 0;
  return displayReachFromParts(u, l);
}

/** @deprecated use displayReachCount */
export const displayLandingCount = displayReachCount;
