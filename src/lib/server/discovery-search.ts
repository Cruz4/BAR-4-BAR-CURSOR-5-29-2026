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
import { isShareDocumentPublic } from '@/lib/release-management';

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
  ownerId?: string;
  ownerName: string;
  ownerSlug?: string;
  title: string;
  pressed: boolean;
  identity?: ArtistHomeSoundIdentity;
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

function clean(value: unknown, max = 500): string {
  return typeof value === 'string' ? value.trim().replace(/\s+/g, ' ').slice(0, max) : '';
}

function stringsFromPublicValue(value: unknown, out: string[], depth = 0): void {
  if (out.length >= 160 || depth > 5 || value == null) return;
  if (typeof value === 'string') {
    const next = clean(value, 700);
    if (next) out.push(next);
    return;
  }
  if (Array.isArray(value)) {
    for (const item of value.slice(0, 80)) stringsFromPublicValue(item, out, depth + 1);
    return;
  }
  if (typeof value === 'object') {
    for (const [key, item] of Object.entries(value as Record<string, unknown>).slice(0, 120)) {
      if (/storagePath|previewPath|url|id$/i.test(key)) continue;
      stringsFromPublicValue(item, out, depth + 1);
    }
  }
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

function includesFacet(values: Array<string | undefined>, query: string): boolean {
  const needle = query.trim().toLocaleLowerCase();
  if (!needle) return true;
  return values.some((value) => String(value || '').toLocaleLowerCase().includes(needle));
}

function matchesFilters(
  kind: DiscoverySearchKind,
  identity: ArtistHomeSoundIdentity | undefined,
  publicText: string,
  rawFilters?: DiscoverySearchFilters
): boolean {
  const filters = normalizeDiscoverySearchFilters(rawFilters);
  if (filters.resultKinds.length && !filters.resultKinds.includes(kind)) return false;
  if (
    filters.identityKinds.length &&
    !filters.identityKinds.some((selected) => identity?.kinds?.includes(selected))
  ) return false;
  if (!includesFacet([...(identity?.genres || []), publicText], filters.genre)) return false;
  if (!includesFacet(identity?.moods || [], filters.mood)) return false;
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
  const [profileSnap, shareSnap, postSnap] = await Promise.all([
    db.collection('publicProfiles').orderBy('updatedAt', 'desc').limit(CATALOG_LIMIT).get(),
    db.collection('shares').orderBy('updatedAt', 'desc').limit(CATALOG_LIMIT).get(),
    db.collection('posts').limit(CATALOG_LIMIT).get(),
  ]);
  const profiles = profileRows(profileSnap.docs);
  const profileByUser = new Map(profiles.map((profile) => [profile.userId, profile]));

  const drops: PublicDropSearchRow[] = [];
  for (const snap of shareSnap.docs) {
    const data = snap.data() as Record<string, unknown>;
    if (!isShareDocumentPublic(data)) continue;
    const payload = data.data && typeof data.data === 'object'
      ? data.data as Record<string, unknown>
      : {};
    const ownerId = clean(data.ownerId, 128) || undefined;
    const owner = ownerId ? profileByUser.get(ownerId) : undefined;
    const ownerName = clean(data.ownerName, 120) || owner?.displayName || 'Music maker';
    const title = clean(payload.title, 120) || (data.type === 'album' ? 'Untitled album' : 'Untitled track');
    const publicStrings: string[] = [];
    stringsFromPublicValue(payload, publicStrings);
    const baseRow: PublicDropSearchRow = {
      resultId: snap.id,
      shareId: snap.id,
      ...(ownerId ? { ownerId } : {}),
      ownerName,
      ...(owner?.slug ? { ownerSlug: owner.slug } : {}),
      title,
      pressed: hasPressedAudio(String(data.type || 'track'), data, payload),
      ...(owner?.identity ? { identity: owner.identity } : {}),
      updatedAt: clean(data.updatedAt || data.createdAt, 40),
      haystack: [title, ownerName, data.type === 'album' ? 'album DNA drop' : 'track song DNA drop', ...identityStrings(owner?.identity), ...publicStrings]
        .join(' ')
        .toLocaleLowerCase(),
      publicText: publicStrings.join(' '),
    };
    drops.push(baseRow);
    if (data.type === 'album' && Array.isArray(payload.tracks)) {
      for (const [trackIndex, rawTrack] of payload.tracks.slice(0, 80).entries()) {
        if (!rawTrack || typeof rawTrack !== 'object') continue;
        const track = rawTrack as Record<string, unknown>;
        const trackTitle = clean(track.title, 120);
        if (!trackTitle) continue;
        const trackStrings: string[] = [];
        stringsFromPublicValue(track, trackStrings);
        const trackAudio = track.dropAudio;
        const pressed = Boolean(
          trackAudio &&
          typeof trackAudio === 'object' &&
          clean((trackAudio as Record<string, unknown>).storagePath)
        );
        drops.push({
          ...baseRow,
          resultId: `${snap.id}-track-${clean(track.id, 120) || trackIndex}`,
          title: trackTitle,
          pressed,
          haystack: [
            trackTitle,
            title,
            ownerName,
            'album track song DNA drop',
            ...identityStrings(owner?.identity),
            ...trackStrings,
          ].join(' ').toLocaleLowerCase(),
          publicText: trackStrings.join(' '),
        });
      }
    }
  }

  const posts: PublicPostSearchRow[] = [];
  for (const snap of postSnap.docs) {
    const data = snap.data() as Record<string, unknown>;
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
    const searchableText = text || voice || lyricText;
    if (!searchableText) continue;
    posts.push({
      postId: snap.id,
      ownerId,
      ownerName: owner.displayName,
      ownerSlug: owner.slug,
      text: searchableText,
      updatedAt: clean(data.createdAt, 40),
      haystack: [searchableText, owner.displayName, ...identityStrings(owner.identity)]
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
    if (!matchesFilters('person', profile.identity, profile.publicText, filters)) continue;
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
    if (input.excludeUserId && drop.ownerId === input.excludeUserId) continue;
    if (!matchesFilters('drop', drop.identity, drop.publicText, filters)) continue;
    const textScore = query.length >= 2 ? queryScore(query, drop.title, drop.haystack) : 1;
    if (!textScore) continue;
    const match = buildDiscoveryMatch(input.viewerIdentity, drop.identity, 'taste');
    scored.push({
      score: textScore + match.score * 0.5,
      hit: {
        kind: 'drop',
        id: drop.resultId,
        title: drop.title,
        subtitle: `${drop.pressed ? 'Music release' : 'DNA Drop'} · ${drop.ownerName}`,
        href: drop.pressed ? `/song/${drop.shareId}` : `/share/${drop.shareId}`,
        ...(drop.ownerId ? { ownerId: drop.ownerId } : {}),
        ownerName: drop.ownerName,
        ...(drop.ownerSlug ? { ownerSlug: drop.ownerSlug } : {}),
        tags: [drop.pressed ? 'Release' : 'DNA Drop', ...(drop.identity?.genres || [])].slice(0, 4),
        ...(match.score ? { match } : {}),
        updatedAt: drop.updatedAt,
      },
    });
  }

  for (const post of data.posts) {
    if (input.excludeUserId && post.ownerId === input.excludeUserId) continue;
    if (!matchesFilters('post', post.identity, post.publicText, filters)) continue;
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
