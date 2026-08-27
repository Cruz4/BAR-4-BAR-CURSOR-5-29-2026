import type { DiscoveryMatch } from '@/lib/discovery-graph';
import {
  PUBLIC_IDENTITY_KINDS,
  type CollaborationStatus,
  type PublicIdentityKind,
} from '@/lib/profile/sound-identity';

export type DiscoverySearchKind = 'person' | 'drop' | 'post';

export type DiscoverySearchFilters = {
  resultKinds: DiscoverySearchKind[];
  identityKinds: PublicIdentityKind[];
  genre: string;
  mood: string;
  influence: string;
  region: string;
  collaboration?: CollaborationStatus;
};

export const EMPTY_DISCOVERY_SEARCH_FILTERS: DiscoverySearchFilters = {
  resultKinds: [],
  identityKinds: [],
  genre: '',
  mood: '',
  influence: '',
  region: '',
};

const SEARCH_KINDS = new Set<DiscoverySearchKind>(['person', 'drop', 'post']);
const IDENTITY_KINDS = new Set<PublicIdentityKind>(PUBLIC_IDENTITY_KINDS.map((item) => item.id));

function listParam(value: string | null): string[] {
  return (value || '').split(',').map((item) => item.trim()).filter(Boolean);
}

export function normalizeDiscoverySearchFilters(
  raw?: Partial<DiscoverySearchFilters> | null
): DiscoverySearchFilters {
  const clean = (value: unknown, max = 80) =>
    typeof value === 'string' ? value.trim().replace(/\s+/g, ' ').slice(0, max) : '';
  const resultKinds = Array.isArray(raw?.resultKinds)
    ? raw.resultKinds.filter((kind): kind is DiscoverySearchKind => SEARCH_KINDS.has(kind as DiscoverySearchKind))
    : [];
  const identityKinds = Array.isArray(raw?.identityKinds)
    ? raw.identityKinds.filter((kind): kind is PublicIdentityKind => IDENTITY_KINDS.has(kind as PublicIdentityKind))
    : [];
  const collaboration =
    raw?.collaboration === 'open' || raw?.collaboration === 'selective' || raw?.collaboration === 'not_now'
      ? raw.collaboration
      : undefined;
  return {
    resultKinds: [...new Set(resultKinds)],
    identityKinds: [...new Set(identityKinds)],
    genre: clean(raw?.genre, 50),
    mood: clean(raw?.mood, 50),
    influence: clean(raw?.influence, 80),
    region: clean(raw?.region, 80),
    ...(collaboration ? { collaboration } : {}),
  };
}

export function discoverySearchFiltersFromParams(params: URLSearchParams): DiscoverySearchFilters {
  return normalizeDiscoverySearchFilters({
    resultKinds: listParam(params.get('types')).filter((kind): kind is DiscoverySearchKind => SEARCH_KINDS.has(kind as DiscoverySearchKind)),
    identityKinds: listParam(params.get('identity')).filter((kind): kind is PublicIdentityKind => IDENTITY_KINDS.has(kind as PublicIdentityKind)),
    genre: params.get('genre') || '',
    mood: params.get('mood') || '',
    influence: params.get('influence') || '',
    region: params.get('region') || '',
    collaboration: (params.get('collaboration') || undefined) as CollaborationStatus | undefined,
  });
}

export function writeDiscoverySearchFilters(params: URLSearchParams, filters: DiscoverySearchFilters): void {
  const normalized = normalizeDiscoverySearchFilters(filters);
  const values: Array<[string, string]> = [
    ['types', normalized.resultKinds.join(',')],
    ['identity', normalized.identityKinds.join(',')],
    ['genre', normalized.genre],
    ['mood', normalized.mood],
    ['influence', normalized.influence],
    ['region', normalized.region],
    ['collaboration', normalized.collaboration || ''],
  ];
  for (const [key, value] of values) {
    if (value) params.set(key, value);
    else params.delete(key);
  }
}

export function discoverySearchHref(
  filters: Partial<DiscoverySearchFilters>,
  query = ''
): string {
  const params = new URLSearchParams();
  const cleanQuery = query.trim().replace(/\s+/g, ' ').slice(0, 80);
  if (cleanQuery) params.set('q', cleanQuery);
  writeDiscoverySearchFilters(params, normalizeDiscoverySearchFilters(filters));
  const serialized = params.toString();
  return `/discover${serialized ? `?${serialized}` : ''}`;
}

export function hasDiscoverySearchFilters(filters: DiscoverySearchFilters): boolean {
  const normalized = normalizeDiscoverySearchFilters(filters);
  return Boolean(
    normalized.resultKinds.length ||
    normalized.identityKinds.length ||
    normalized.genre ||
    normalized.mood ||
    normalized.influence ||
    normalized.region ||
    normalized.collaboration
  );
}

export type DiscoverySearchHit = {
  kind: DiscoverySearchKind;
  id: string;
  title: string;
  subtitle: string;
  href: string;
  ownerId?: string;
  ownerName?: string;
  ownerSlug?: string;
  studioBadge?: 'pro' | 'free';
  tags: string[];
  match?: DiscoveryMatch;
  updatedAt?: string;
};
export type DiscoverySearchResponse = {
  hits: DiscoverySearchHit[];
  total: number;
  hasMore: boolean;
};
