import 'server-only';

import type { QueryDocumentSnapshot } from 'firebase-admin/firestore';
import { getDb } from '@/lib/firebase/server';
import { buildDiscoveryMatch } from '@/lib/discovery-graph';
import {
  normalizeDiscoverySearchFilters,
  type DiscoverySearchFilters,
  type DiscoverySearchHit,
  type DiscoverySearchKind,
} from '@/lib/discovery-search';
import { normalizeArtistHomeConfig } from '@/lib/profile/modules';
import {
  publicIdentityLabel,
  type ArtistHomeSoundIdentity,
} from '@/lib/profile/sound-identity';
import { needsVanitySlugUpgrade } from '@/lib/profile/profile-slug';
import { canonicalDnaShareIds, shareDocumentVisibility } from '@/lib/release-management';
import {
  combinePublicMusicMetadata,
  publicMusicMetadataFromTrack,
  publicMusicMetadataSearchText,
  type PublicMusicMetadata,
} from '@/lib/music-discovery-metadata';
import { canonicalLiveDnaShareIds } from '@/lib/server/dna-visibility';

type PublicProfileSearchRow = {
  userId: string;
  slug: string;
  displayName: string;
  studioBadge: 'pro' | 'free';
  identity?: ArtistHomeSoundIdentity;
  updatedAt: string;
  haystack: string;
  publicText: string;
};

type PublicDropSearchRow = {
  resultId: string;
  shareId: string;
  shareType: 'album' | 'track';
  trackId?: string;
  ownerId?: string;
  ownerName: string;
  ownerSlug?: string;
  title: string;
  pressed: boolean;
  houseRelease?: boolean;
  identity?: ArtistHomeSoundIdentity;
  metadata: PublicMusicMetadata;
  updatedAt: string;
  haystack: string;
  publicText: string;
};

type PublicPostSearchRow = {
  postId: string;
  ownerId: string;
  ownerName: string;
  ownerSlug: string;
  text: string;
  updatedAt: string;
  haystack: string;
  identity?: ArtistHomeSoundIdentity;
  publicText: string;
};

type SearchCatalog = {
  profiles: PublicProfileSearchRow[];
  drops: PublicDropSearchRow[];
  posts: PublicPostSearchRow[];
};

const CATALOG_LIMIT = 600;
const CATALOG_TTL_MS = 45_000;
let cachedCatalog: { expiresAt: number; value: SearchCatalog } | null = null;
let loadingCatalog: Promise<SearchCatalog> | null = null;

export function invalidateDiscoverySearchCatalog(): void {
  cachedCatalog = null;
  loadingCatalog = null;
}

function clean(value: unknown, max = 500): string {
  return typeof value === 'string' ? value.trim().replace(/\s+/g, ' ').slice(0, max) : '';
}

function identityStrings(identity?: ArtistHomeSoundIdentity): string[] {
  if (!identity) return [];
  return [
    ...(identity.kinds || []).map(publicIdentityLabel),
    ...(identity.genres || []),
    ...(identity.moods || []),
    ...(identity.influences || []),
    identity.region || '',
    identity.currentFocus || '',
    identity.collaboration === 'open'
      ? 'open to collaborate collaboration'
      : identity.collaboration === 'selective'
        ? 'selective collaboration'
        : '',
  ].filter(Boolean);
}

function normalizeFacet(value: string): string {
  return value.toLocaleLowerCase().replace(/[-_/]+/g, ' ').replace(/\s+/g, ' ').trim();
}

function includesFacet(values: Array<string | undefined>, query: string): boolean {
  const needle = normalizeFacet(query);
  if (!needle) return true;
  return values.some((value) => {
    const hay = normalizeFacet(String(value || ''));
    if (!hay) return false;
    if (hay === needle || hay.includes(needle)) return true;
    return needle.length >= 4 && hay.length >= 4 && needle.includes(hay);
  });
}

function vibeSearchFacets(value: Record<string, unknown>): string[] {
  const vibe = value.vibe && typeof value.vibe === 'object' && !Array.isArray(value.vibe)
    ? value.vibe as Record<string, unknown>
    : {};
  const feelings = Array.isArray(vibe.feeling)
    ? vibe.feeling.map((item) => clean(item, 40)).filter(Boolean)
    : [];
  return [clean(vibe.genre, 50), ...feelings].filter(Boolean);
}

function matchesFilters(
  kind: DiscoverySearchKind,
  identity: ArtistHomeSoundIdentity | undefined,
  publicText: string,
  music: PublicMusicMetadata | undefined,
  rawFilters?: DiscoverySearchFilters
): boolean {
  const filters = normalizeDiscoverySearchFilters(rawFilters);
  if (filters.resultKinds.length && !filters.resultKinds.includes(kind)) return false;
  if (
    filters.identityKinds.length &&
    !filters.identityKinds.some((selected) => identity?.kinds?.includes(selected))
  ) return false;
  const genres = kind === 'person'
    ? identity?.genres || []
    : kind === 'drop'
      ? [...(music?.genreStyles || []), music?.albumTitle, publicText]
      : [publicText];
  const moods = kind === 'person'
    ? identity?.moods || []
    : kind === 'drop'
      ? [...(music?.moods || []), publicText]
      : [publicText];
  if (!includesFacet(genres, filters.genre)) return false;
  if (!includesFacet(moods, filters.mood)) return false;
  if (!includesFacet(identity?.influences || [], filters.influence)) return false;
  if (!includesFacet([identity?.region], filters.region)) return false;
  if (filters.collaboration && identity?.collaboration !== filters.collaboration) return false;
  return true;
}

function profileRows(docs: QueryDocumentSnapshot[]): PublicProfileSearchRow[] {
  const byUser = new Map<string, PublicProfileSearchRow>();
  for (const snap of docs) {
    const data = snap.data() as Record<string, unknown>;
    const userId = clean(data.userId, 128);
    if (!userId || needsVanitySlugUpgrade(snap.id, userId)) continue;
    const displayName = clean(data.displayName, 120) || snap.id;
    const config = normalizeArtistHomeConfig(data.artistHome);
    const identity = config.featured.soundIdentity;
    const publicText = [config.featured.tagline || '', config.featured.bio || '', identity?.currentFocus || '']
      .filter(Boolean)
      .join(' ');
    const row: PublicProfileSearchRow = {
      userId,
      slug: snap.id,
      displayName,
      studioBadge: data.studioBadge === 'pro' ? 'pro' : 'free',
      ...(identity ? { identity } : {}),
      updatedAt: clean(data.updatedAt, 40),
      haystack: [
        displayName,
        snap.id,
        'artist music person creator profile',
        'genre style mood vibe influence scene region location',
        ...identityStrings(identity),
        publicText,
      ].join(' ').toLocaleLowerCase(),
      publicText,
    };
    const existing = byUser.get(userId);
    if (!existing || row.updatedAt > existing.updatedAt) byUser.set(userId, row);
  }
  return [...byUser.values()];
}

function hasPressedAudio(type: string, data: Record<string, unknown>, payload: Record<string, unknown>): boolean {
  if (data.hasDropAudio === true) return true;
  if (type === 'track') {
    const audio = payload.dropAudio;
    return Boolean(audio && typeof audio === 'object' && clean((audio as Record<string, unknown>).storagePath));
  }
  return Array.isArray(payload.tracks) && payload.tracks.some((track) => {
    if (!track || typeof track !== 'object') return false;
    const audio = (track as Record<string, unknown>).dropAudio;
    return Boolean(audio && typeof audio === 'object' && clean((audio as Record<string, unknown>).storagePath));
  });
}

async function buildCatalog(): Promise<SearchCatalog> {
  const db = await getDb();
  const [profileSnap, shareSnap, postSnap, houseSnap] = await Promise.all([
    db.collection('publicProfiles').orderBy('updatedAt', 'desc').limit(CATALOG_LIMIT).get(),
    db.collection('shares').orderBy('updatedAt', 'desc').limit(CATALOG_LIMIT).get(),
    db.collection('posts').limit(CATALOG_LIMIT).get(),
    db.collection('shares').where('houseRelease', '==', true).get().catch((error) => {
      console.error('[discovery-search] house catalog', error);
      return { docs: [] as QueryDocumentSnapshot[] };
    }),
  ]);
  const shareDocs = new Map<string, QueryDocumentSnapshot>();
  for (const snap of shareSnap.docs) shareDocs.set(snap.id, snap);
  for (const snap of houseSnap.docs) shareDocs.set(snap.id, snap);
  const profiles = profileRows(profileSnap.docs);
  const profileByUser = new Map(profiles.map((profile) => [profile.userId, profile]));
  const catalogShareDocs = [...shareDocs.values()];
  const canonicalDnaIds = canonicalDnaShareIds(
    catalogShareDocs.map((snap) => ({ id: snap.id, data: snap.data() as Record<string, unknown> }))
  );

  const drops: PublicDropSearchRow[] = [];
  for (const snap of catalogShareDocs) {
    const data = snap.data() as Record<string, unknown>;
    const visibility = shareDocumentVisibility(data);
    const dnaLive = visibility.dnaLive && canonicalDnaIds.has(snap.id);
    if (!visibility.releaseLive && !dnaLive) continue;
    const payload = data.data && typeof data.data === 'object'
      ? data.data as Record<string, unknown>
      : {};
    const ownerId = clean(data.ownerId, 128) || undefined;
    const owner = ownerId ? profileByUser.get(ownerId) : undefined;
    const ownerName = clean(data.ownerName, 120) || owner?.displayName || 'Music maker';
    const title = clean(payload.title, 120) || (data.type === 'album' ? 'Untitled album' : 'Untitled track');
    const nestedTracks = Array.isArray(payload.tracks)
      ? payload.tracks.slice(0, 80).filter((row): row is Record<string, unknown> => Boolean(row && typeof row === 'object'))
      : [];
    const nestedTrackMetadata = nestedTracks.map(publicMusicMetadataFromTrack);
    const houseRelease = data.houseRelease === true;
    const shareType = data.type === 'album' ? 'album' as const : 'track' as const;
    const albumDiscovery = publicMusicMetadataFromTrack(payload);
    const metadata = shareType === 'album'
      ? { ...combinePublicMusicMetadata([...nestedTrackMetadata, albumDiscovery], title), albumShareId: snap.id }
      : albumDiscovery;
    const albumTheme = shareType === 'album' ? clean(payload.theme, 120) : '';
    const nestedFacets = nestedTracks.flatMap(vibeSearchFacets).join(' ');
    const publicText = [
      publicMusicMetadataSearchText(metadata),
      albumTheme,
      nestedFacets,
      ...vibeSearchFacets(payload),
    ].filter(Boolean).join(' ');
    const baseRow: PublicDropSearchRow = {
      resultId: snap.id,
      shareId: snap.id,
      shareType,
      ...(ownerId ? { ownerId } : {}),
      ownerName,
      ...(owner?.slug ? { ownerSlug: owner.slug } : {}),
      title,
      pressed: visibility.releaseLive && hasPressedAudio(String(data.type || 'track'), data, payload),
      ...(houseRelease ? { houseRelease: true } : {}),
      ...(owner?.identity ? { identity: owner.identity } : {}),
      metadata,
      updatedAt: clean(data.updatedAt || data.createdAt, 40),
      haystack: [
        title,
        ownerName,
        shareType === 'album' ? 'album DNA drop' : 'track song DNA drop',
        houseRelease ? 'house album house release' : '',
        publicText,
      ].join(' ').toLocaleLowerCase(),
      publicText,
    };
    drops.push(baseRow);
    if (shareType === 'album') {
      for (const [trackIndex, track] of nestedTracks.entries()) {
        const trackTitle = clean(track.title, 120);
        if (!trackTitle) continue;
        const trackId = clean(track.id, 120);
        const trackMetadata = combinePublicMusicMetadata([
          publicMusicMetadataFromTrack(track),
          albumDiscovery,
        ], title);
        const trackPublicText = [publicMusicMetadataSearchText(trackMetadata), ...vibeSearchFacets(track)].filter(Boolean).join(' ');
        const trackAudio = track.dropAudio;
        const pressed = visibility.releaseLive && Boolean(
          trackAudio &&
          typeof trackAudio === 'object' &&
          clean((trackAudio as Record<string, unknown>).storagePath)
        );
        drops.push({
          ...baseRow,
          resultId: `${snap.id}-track-${trackId || trackIndex}`,
          shareType: 'track',
          ...(trackId ? { trackId } : {}),
          title: trackTitle,
          pressed,
          metadata: {
            ...trackMetadata,
            albumTitle: title,
            albumShareId: snap.id,
          },
          haystack: [
            trackTitle,
            title,
            ownerName,
            'album track song DNA drop',
            houseRelease ? 'house album house release' : '',
            trackPublicText,
          ].join(' ').toLocaleLowerCase(),
          publicText: trackPublicText,
        });
      }
    }
  }

  const dnaPostShareIds = postSnap.docs
    .map((snap) => snap.data() as Record<string, unknown>)
    .filter((data) => data.sourceKind === 'dna' && typeof data.reverbPostId === 'string')
    .map((data) => String(data.reverbPostId));
  const liveDnaPostShareIds = await canonicalLiveDnaShareIds(db, dnaPostShareIds);
  const posts: PublicPostSearchRow[] = [];
  for (const snap of postSnap.docs) {
    const data = snap.data() as Record<string, unknown>;
    if (
      data.sourceKind === 'dna' &&
      typeof data.reverbPostId === 'string' &&
      !liveDnaPostShareIds.has(data.reverbPostId)
    ) continue;
    const ownerId = clean(data.ownerId, 128);
    const owner = profileByUser.get(ownerId);
    if (!owner) continue;
    const text = clean(data.text, 1000) || clean(data.reverbText, 1000);
    const voice = data.voice && typeof data.voice === 'object'
      ? clean((data.voice as Record<string, unknown>).transcript, 1000)
      : '';
    const lyricLines = data.lyricClip && typeof data.lyricClip === 'object'
      ? (data.lyricClip as Record<string, unknown>).lines
      : undefined;
    const lyricText = Array.isArray(lyricLines)
      ? lyricLines.filter((line): line is string => typeof line === 'string').join(' ').slice(0, 1800)
      : '';
    const displayText = text || voice || lyricText;
    const searchableText = [text, voice, lyricText].filter(Boolean).join(' ');
    if (!displayText) continue;
    posts.push({
      postId: snap.id,
      ownerId,
      ownerName: owner.displayName,
      ownerSlug: owner.slug,
      text: displayText,
      updatedAt: clean(data.createdAt, 40),
      haystack: [searchableText, owner.displayName]
        .join(' ')
        .toLocaleLowerCase(),
      ...(owner.identity ? { identity: owner.identity } : {}),
      publicText: searchableText,
    });
  }
  return { profiles, drops, posts };
}

async function catalog(): Promise<SearchCatalog> {
  if (cachedCatalog && cachedCatalog.expiresAt > Date.now()) return cachedCatalog.value;
  if (!loadingCatalog) {
    loadingCatalog = buildCatalog()
      .then((value) => {
        cachedCatalog = { expiresAt: Date.now() + CATALOG_TTL_MS, value };
        return value;
      })
      .finally(() => {
        loadingCatalog = null;
      });
  }
  return loadingCatalog;
}

function queryScore(query: string, title: string, haystack: string): number {
  const needle = query.toLocaleLowerCase();
  const terms = needle.split(/\s+/).filter(Boolean);
  if (!terms.length || !terms.every((term) => haystack.includes(term))) return 0;
  const lowerTitle = title.toLocaleLowerCase();
  let score = terms.reduce((total, term) => total + (lowerTitle.includes(term) ? 12 : 4), 0);
  if (lowerTitle === needle) score += 100;
  else if (lowerTitle.startsWith(needle)) score += 65;
  else if (lowerTitle.includes(needle)) score += 35;
  else if (haystack.includes(needle)) score += 18;
  return score;
}

export async function searchPublicMusicNetwork(input: {
  query: string;
  viewerIdentity?: ArtistHomeSoundIdentity;
  excludeUserId?: string;
  limit: number;
  filters?: DiscoverySearchFilters;
}): Promise<{ hits: DiscoverySearchHit[]; total: number }> {
  const query = clean(input.query, 80).toLocaleLowerCase();
  const filters = normalizeDiscoverySearchFilters(input.filters);
  const filterActive = Boolean(
    filters.resultKinds.length || filters.identityKinds.length || filters.genre || filters.mood ||
    filters.influence || filters.region || filters.collaboration
  );
  if (query.length < 2 && !filterActive) return { hits: [], total: 0 };
  const data = await catalog();
  const scored: Array<{ score: number; hit: DiscoverySearchHit }> = [];

  for (const profile of data.profiles) {
    if (input.excludeUserId && profile.userId === input.excludeUserId) continue;
    if (!matchesFilters('person', profile.identity, profile.publicText, undefined, filters)) continue;
    const textScore = query.length >= 2 ? queryScore(query, profile.displayName, profile.haystack) : 1;
    if (!textScore) continue;
    const match = buildDiscoveryMatch(input.viewerIdentity, profile.identity, 'taste');
    const kinds = (profile.identity?.kinds || []).map(publicIdentityLabel);
    const tags = [...kinds, ...(profile.identity?.genres || []), profile.identity?.region || ''].filter(Boolean).slice(0, 4);
    scored.push({
      score: textScore + match.score * 0.5,
      hit: {
        kind: 'person',
        id: profile.userId,
        title: profile.displayName,
        subtitle: kinds.join(' · ') || 'Music Fan',
        href: `/${profile.slug}`,
        ownerId: profile.userId,
        ownerName: profile.displayName,
        ownerSlug: profile.slug,
        studioBadge: profile.studioBadge,
        tags,
        ...(match.score ? { match } : {}),
        updatedAt: profile.updatedAt,
      },
    });
  }

  for (const drop of data.drops) {
    if (!matchesFilters('drop', drop.identity, drop.publicText, drop.metadata, filters)) continue;
    const textScore = query.length >= 2 ? queryScore(query, drop.title, drop.haystack) : 1;
    if (!textScore) continue;
    const match = buildDiscoveryMatch(input.viewerIdentity, drop.identity, 'taste');
    const kindLabel = drop.houseRelease
      ? drop.shareType === 'album' ? 'House album' : 'House release'
      : drop.shareType === 'album'
        ? drop.pressed ? 'Album release' : 'Album DNA Drop'
        : drop.pressed ? 'Music release' : 'DNA Drop';
    const href = drop.shareType === 'album'
      ? `/share/${drop.shareId}`
      : drop.pressed
        ? drop.trackId
          ? `/song/${drop.shareId}?trackId=${encodeURIComponent(drop.trackId)}`
          : `/song/${drop.shareId}`
        : `/share/${drop.shareId}`;
    scored.push({
      score: textScore + match.score * 0.5 + (drop.houseRelease ? 12 : 0) + (drop.shareType === 'album' ? 6 : 0),
      hit: {
        kind: 'drop',
        id: drop.resultId,
        title: drop.title,
        subtitle: `${kindLabel} · ${drop.ownerName}`,
        href,
        ...(drop.ownerId ? { ownerId: drop.ownerId } : {}),
        ownerName: drop.ownerName,
        ...(drop.ownerSlug ? { ownerSlug: drop.ownerSlug } : {}),
        tags: [
          drop.houseRelease ? 'House' : drop.pressed ? 'Release' : 'DNA Drop',
          ...drop.metadata.genreStyles,
          ...drop.metadata.moods,
        ].slice(0, 4),
        ...(match.score ? { match } : {}),
        updatedAt: drop.updatedAt,
      },
    });
  }

  for (const post of data.posts) {
    if (input.excludeUserId && post.ownerId === input.excludeUserId) continue;
    if (!matchesFilters('post', post.identity, post.publicText, undefined, filters)) continue;
    const textScore = query.length >= 2 ? queryScore(query, post.text.slice(0, 100), post.haystack) : 1;
    if (!textScore) continue;
    scored.push({
      score: textScore,
      hit: {
        kind: 'post',
        id: post.postId,
        title: post.text.slice(0, 120),
        subtitle: `Scene post · ${post.ownerName}`,
        href: `/p/${post.postId}`,
        ownerId: post.ownerId,
        ownerName: post.ownerName,
        ownerSlug: post.ownerSlug,
        tags: ['Scene post'],
        updatedAt: post.updatedAt,
      },
    });
  }

  scored.sort((a, b) => b.score - a.score || String(b.hit.updatedAt || '').localeCompare(String(a.hit.updatedAt || '')));
  return {
    hits: scored.slice(0, Math.min(Math.max(input.limit, 1), 60)).map((entry) => entry.hit),
    total: scored.length,
  };
}
