/**
 * Imprint Shelf — curated imprint posts on Artist Home.
 * Imprints are created as wall/scene posts first; makers pin post ids here.
 */

export const IMPRINT_SHELF_MAX = 500;

function cleanId(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > 80) return undefined;
  return trimmed;
}

/** Normalize saved post ids — dedupe, preserve order, cap length. */
export function normalizeImprintShelfPostIds(raw: unknown): string[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const seen = new Set<string>();
  const ids: string[] = [];
  for (const entry of raw) {
    const id = cleanId(entry);
    if (!id || seen.has(id)) continue;
    seen.add(id);
    ids.push(id);
    if (ids.length >= IMPRINT_SHELF_MAX) break;
  }
  return ids.length ? ids : undefined;
}
