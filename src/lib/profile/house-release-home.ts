export const HOUSE_RELEASE_HOME_MAX = 48;

function cleanShareId(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim().toUpperCase();
  if (!trimmed || trimmed.length > 40 || trimmed.includes('/')) return undefined;
  return trimmed;
}

/** House release share ids the artist chose to hide from their public home. */
export function normalizeHiddenHouseReleaseShareIds(raw: unknown): string[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const seen = new Set<string>();
  const ids: string[] = [];
  for (const entry of raw) {
    const id = cleanShareId(entry);
    if (!id || seen.has(id)) continue;
    seen.add(id);
    ids.push(id);
    if (ids.length >= HOUSE_RELEASE_HOME_MAX) break;
  }
  return ids.length ? ids : undefined;
}
