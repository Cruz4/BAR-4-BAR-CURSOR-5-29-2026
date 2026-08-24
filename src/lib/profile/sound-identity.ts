export const PUBLIC_IDENTITY_KINDS = [
  { id: 'artist', label: 'Artist' },
  { id: 'songwriter', label: 'Songwriter' },
  { id: 'producer', label: 'Producer' },
  { id: 'engineer', label: 'Engineer' },
  { id: 'dj', label: 'DJ' },
  { id: 'music_fan', label: 'Music Fan' },
] as const;

export type PublicIdentityKind = (typeof PUBLIC_IDENTITY_KINDS)[number]['id'];
export type CollaborationStatus = 'open' | 'selective' | 'not_now';

export type ArtistHomeSoundIdentity = {
  kinds?: PublicIdentityKind[];
  genres?: string[];
  moods?: string[];
  influences?: string[];
  region?: string;
  collaboration?: CollaborationStatus;
  currentFocus?: string;
};

const KIND_IDS = new Set<string>(PUBLIC_IDENTITY_KINDS.map((entry) => entry.id));

function clean(value: unknown, max: number): string | undefined {
  if (typeof value !== 'string') return undefined;
  const next = value.trim().replace(/\s+/g, ' ');
  return next ? next.slice(0, max) : undefined;
}

function cleanList(value: unknown, maxItems: number, maxItemLength: number): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const seen = new Set<string>();
  const result: string[] = [];
  for (const raw of value) {
    const item = clean(raw, maxItemLength);
    const key = item?.toLocaleLowerCase();
    if (!item || !key || seen.has(key)) continue;
    seen.add(key);
    result.push(item);
    if (result.length >= maxItems) break;
  }
  return result.length ? result : undefined;
}

export function normalizeSoundIdentity(raw: unknown): ArtistHomeSoundIdentity | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const value = raw as Record<string, unknown>;
  const kinds = Array.isArray(value.kinds)
    ? value.kinds
        .filter((kind): kind is PublicIdentityKind => typeof kind === 'string' && KIND_IDS.has(kind))
        .filter((kind, index, all) => all.indexOf(kind) === index)
        .slice(0, 3)
    : [];
  const genres = cleanList(value.genres, 3, 30);
  const moods = cleanList(value.moods, 5, 30);
  const influences = cleanList(value.influences, 5, 50);
  const region = clean(value.region, 80);
  const currentFocus = clean(value.currentFocus, 120);
  const collaboration: CollaborationStatus | undefined =
    value.collaboration === 'open' ||
    value.collaboration === 'selective' ||
    value.collaboration === 'not_now'
      ? value.collaboration
      : undefined;

  if (!kinds.length && !genres && !moods && !influences && !region && !currentFocus && !collaboration) {
    return undefined;
  }
  return {
    ...(kinds.length ? { kinds } : {}),
    ...(genres ? { genres } : {}),
    ...(moods ? { moods } : {}),
    ...(influences ? { influences } : {}),
    ...(region ? { region } : {}),
    ...(collaboration ? { collaboration } : {}),
    ...(currentFocus ? { currentFocus } : {}),
  };
}

export function publicIdentityLabel(kind: PublicIdentityKind): string {
  return PUBLIC_IDENTITY_KINDS.find((entry) => entry.id === kind)?.label || 'Music Fan';
}

export function collaborationLabel(value?: CollaborationStatus): string | undefined {
  if (value === 'open') return 'Open to collaborate';
  if (value === 'selective') return 'Selective collaborations';
  if (value === 'not_now') return 'Not collaborating right now';
  return undefined;
}

