/**
 * Artist Home module registry + config shape.
 *
 * The public profile is a stack of modules the maker can toggle, reorder,
 * and size (S/M/L) from Edit Public Page. The canonical config lives at
 * users/{uid}/gamification/artistHome (Admin-written via /api/profile/config)
 * and is mirrored onto publicProfiles/{slug}.artistHome for public reads.
 */

import {
  DEFAULT_PRESSING,
  normalizePressingConfig,
  type PressingConfig,
} from '@/lib/profile/pressing';
import { normalizeSocials, type ArtistHomeSocials } from '@/lib/profile/social-links';
import { normalizeBarBoard, type BarBoard } from '@/lib/profile/bar-board';
import type { VoiceNote } from '@/lib/profile/voice-notes';
import {
  contactForPublicProfile,
  normalizeContact,
  type ArtistHomeContact,
} from '@/lib/profile/contact';
import {
  normalizeImprintShelfPostIds,
} from '@/lib/profile/imprint-shelf';
import {
  normalizeSoundIdentity,
  type ArtistHomeSoundIdentity,
} from '@/lib/profile/sound-identity';

export type ProfileModuleId =
  | 'nowPlaying'
  | 'barOfWeek'
  | 'rhymeFingerprint'
  | 'barBoard'
  | 'openLock'
  | 'dropShelf'
  | 'proofWall'
  | 'imprintShelf'
  | 'wall'
  | 'friends'
  | 'guestbook';

export type ModuleSize = 'S' | 'M' | 'L';

export type ProfileModuleSetting = {
  id: ProfileModuleId;
  enabled: boolean;
  size: ModuleSize;
};

/** @deprecated Replaced by The Board. Kept so old publicProfiles still normalize. */
export type AlbumRoomCard = {
  title: string;
  albumId?: string;
  theme?: string;
  roomImageUrl?: string;
  coverArtUrl?: string;
  shareId?: string;
  sampleBar?: string;
};

/** Compact rhyme fingerprint — abstract pattern only, never raw lyrics. */
export type RhymeFingerprint = {
  /** Rhyme-group index per line (same number = rhyming end words). */
  rhyme: number[];
  /** Syllable count per line. */
  syllables: number[];
  /** Display label, e.g. "Album · Track". */
  sourceLabel?: string;
  /** Stable picker key: `${albumId}::${trackId}`. */
  sourceKey?: string;
};

export type FeaturedTrackSelection = {
  shareId: string;
  trackId?: string;
  title: string;
  artistName: string;
  ownerId: string;
  durationSec?: number;
  excerptStartSec: number;
  source: 'owned' | 'purchased';
  /** Server-validated place among the first 10 paid supporters. */
  firstPressRank?: number;
  /** Show a server-validated First Press #1–10 mark on the public profile player. */
  showFirstPressBadge?: boolean;
  /** Canonical private Storage path. Stripped from the public profile mirror. */
  previewPath?: string;
};

export type ArtistHomeFeatured = {
  tagline?: string;
  bio?: string;
  /** Public, user-chosen identity and taste. Never inferred from private lyrics. */
  soundIdentity?: ArtistHomeSoundIdentity;
  /** Now Playing — whitelisted provider URL, embedded playable on the page. */
  embedUrl?: string;
  embedTitle?: string;
  /** A First Drop the profile owner owns or purchased. */
  featuredTrack?: FeaturedTrackSelection;
  barOfWeek?: string;
  /** Optional DNA Drop the featured bar lives in. */
  barOfWeekShareId?: string;
  /** Up to 2 revealed Creative DNA lines. */
  dnaLines?: string[];
  fingerprint?: RhymeFingerprint;
  /** Pinned bars visitors can read / reply under. */
  barBoard?: BarBoard;
  /** Active unfinished-bar cast id on Artist Home (when finish-the-bar flag is on). */
  openLockId?: string;
  /** @deprecated Migrated into barBoard. */
  theCatch?: unknown;
  /** @deprecated Prefer barBoard. */
  albumRooms?: AlbumRoomCard[];
  /** @deprecated Live DNA Drops auto-list from shares; kept for older configs. */
  dropShelfShareIds?: string[];
  /** Optional outbound socials — only filled ones appear under the portrait. */
  socials?: ArtistHomeSocials;
  /** Curated imprint post ids (must already exist as wall/scene posts). */
  imprintShelfPostIds?: string[];
  /** Optional 3-second hello — first badge in the social row under the portrait. */
  voiceMemo?: VoiceNote;
  /** Optional contact line under the streak boxes — public or request-to-see. */
  contact?: ArtistHomeContact;
};

export type ArtistHomeConfig = {
  version: 2;
  theme: PressingConfig;
  modules: ProfileModuleSetting[];
  featured: ArtistHomeFeatured;
};

export const MODULE_META: Record<
  ProfileModuleId,
  { label: string; description: string; defaultSize: ModuleSize; defaultEnabled: boolean }
> = {
  nowPlaying: {
    label: 'Now Playing',
    description: 'Featured song, playable right on the page (embed link).',
    defaultSize: 'L',
    defaultEnabled: true,
  },
  barOfWeek: {
    label: 'Bar of the Week',
    description: 'One bar, big type — your calling card.',
    defaultSize: 'L',
    defaultEnabled: true,
  },
  rhymeFingerprint: {
    label: 'Rhyme Fingerprint',
    description: 'Abstract visual of your rhyme + cadence pattern. No lyrics shown.',
    defaultSize: 'S',
    defaultEnabled: true,
  },
  barBoard: {
    label: 'The Board',
    description: 'Pin 1–5 bars visitors can read, share, and reply under.',
    defaultSize: 'L',
    defaultEnabled: true,
  },
  openLock: {
    label: 'Finish this bar',
    description: 'Public unfinished bar — visitors drop the next line (kill-flagged).',
    defaultSize: 'L',
    defaultEnabled: false,
  },
  dropShelf: {
    label: 'Live Lyric DNA Drops',
    description: 'Public lyric DNA previews. Songs for sale stay in the separate Listen / Buy release area.',
    defaultSize: 'L',
    defaultEnabled: true,
  },
  proofWall: {
    label: 'Proof Wall',
    description: 'Badges, rank, and streaks — earned, not posted.',
    defaultSize: 'M',
    defaultEnabled: true,
  },
  imprintShelf: {
    label: 'Imprint Shelf',
    description: 'Imprints you saved and chose to show on your home.',
    defaultSize: 'L',
    defaultEnabled: false,
  },
  wall: {
    label: 'The Wall',
    description: 'Your posts — thoughts, releases, embeds.',
    defaultSize: 'L',
    defaultEnabled: true,
  },
  friends: {
    label: 'Friends',
    description: 'Your circle on AKAsheet.',
    defaultSize: 'S',
    defaultEnabled: true,
  },
  guestbook: {
    label: 'Guestbook',
    description: 'Visitors leave one line each.',
    defaultSize: 'S',
    defaultEnabled: true,
  },
};

export const MODULE_ORDER_DEFAULT: ProfileModuleId[] = [
  'nowPlaying',
  'dropShelf',
  'barOfWeek',
  'wall',
  'imprintShelf',
  'openLock',
  'barBoard',
  'rhymeFingerprint',
  'proofWall',
  'friends',
  'guestbook',
];

export function defaultModules(): ProfileModuleSetting[] {
  return MODULE_ORDER_DEFAULT.map((id) => ({
    id,
    enabled: MODULE_META[id].defaultEnabled,
    size: MODULE_META[id].defaultSize,
  }));
}

export function defaultArtistHomeConfig(): ArtistHomeConfig {
  return {
    version: 2,
    theme: {
      ...DEFAULT_PRESSING,
      faders: { ...DEFAULT_PRESSING.faders },
      alive: true,
      autoDrift: false,
    },
    modules: defaultModules(),
    featured: {},
  };
}

const MAX_TAGLINE = 120;
const MAX_BIO = 600;
const MAX_BAR = 280;
const MAX_DNA_LINES = 2;
const MAX_ALBUM_ROOMS = 4;
const MAX_DROPS = 8;
const MAX_FINGERPRINT_LINES = 16;

function normalizeFeaturedTrack(raw: unknown): FeaturedTrackSelection | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const obj = raw as Partial<FeaturedTrackSelection>;
  const shareId = cleanString(obj.shareId, 80);
  const title = cleanString(obj.title, 160);
  const artistName = cleanString(obj.artistName, 120);
  const ownerId = cleanString(obj.ownerId, 128);
  if (!shareId || !title || !artistName || !ownerId) return undefined;
  const trackId = cleanString(obj.trackId, 128);
  const durationRaw = Number(obj.durationSec);
  const durationSec = Number.isFinite(durationRaw) && durationRaw > 0
    ? Math.min(24 * 60 * 60, durationRaw)
    : undefined;
  const maxStart = Math.max(0, (durationSec || 30) - 30);
  const excerptStartSec = Math.max(0, Math.min(maxStart, Number(obj.excerptStartSec) || 0));
  const previewPath = cleanString(obj.previewPath, 500);
  return {
    shareId,
    ...(trackId ? { trackId } : {}),
    title,
    artistName,
    ownerId,
    ...(durationSec ? { durationSec } : {}),
    excerptStartSec,
    source: obj.source === 'owned' ? 'owned' : 'purchased',
    ...(obj.showFirstPressBadge === true && Number(obj.firstPressRank) >= 1 && Number(obj.firstPressRank) <= 10
      ? { firstPressRank: Math.floor(Number(obj.firstPressRank)) }
      : {}),
    ...(obj.showFirstPressBadge === true ? { showFirstPressBadge: true } : {}),
    ...(previewPath ? { previewPath } : {}),
  };
}

function cleanString(value: unknown, max: number): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  return trimmed.slice(0, max);
}

function isModuleId(id: unknown): id is ProfileModuleId {
  return typeof id === 'string' && id in MODULE_META;
}

/** Old saves used albumRooms / theCatch — map to The Board. */
function coerceModuleId(id: unknown): ProfileModuleId | null {
  if (id === 'albumRooms' || id === 'theCatch') return 'barBoard';
  if (id === 'dnaStrip') return null;
  if (isModuleId(id)) return id;
  return null;
}

function normalizeModules(raw: unknown): ProfileModuleSetting[] {
  const base = defaultModules();
  if (!Array.isArray(raw)) return base;
  const seen = new Set<ProfileModuleId>();
  const ordered: ProfileModuleSetting[] = [];
  for (const entry of raw) {
    const id = coerceModuleId((entry as { id?: unknown })?.id);
    if (!id || seen.has(id)) continue;
    seen.add(id);
    const size = (entry as { size?: unknown }).size;
    ordered.push({
      id,
      enabled: Boolean((entry as { enabled?: unknown }).enabled),
      size: size === 'S' || size === 'M' || size === 'L' ? size : MODULE_META[id].defaultSize,
    });
  }
  // Any module missing from the saved order is appended with defaults.
  for (const def of base) {
    if (!seen.has(def.id)) ordered.push(def);
  }
  return ordered;
}

function normalizeFingerprint(raw: unknown): RhymeFingerprint | undefined {
  const obj = raw as Partial<RhymeFingerprint> | null | undefined;
  if (!obj || !Array.isArray(obj.rhyme) || !Array.isArray(obj.syllables)) return undefined;
  const rhyme = obj.rhyme
    .slice(0, MAX_FINGERPRINT_LINES)
    .map((n) => Math.max(0, Math.min(15, Math.round(Number(n)) || 0)));
  const syllables = obj.syllables
    .slice(0, MAX_FINGERPRINT_LINES)
    .map((n) => Math.max(0, Math.min(32, Math.round(Number(n)) || 0)));
  if (!rhyme.length || rhyme.length !== syllables.length) return undefined;
  const fingerprint: RhymeFingerprint = { rhyme, syllables };
  const sourceLabel = cleanString(obj.sourceLabel, 120);
  if (sourceLabel) fingerprint.sourceLabel = sourceLabel;
  const sourceKey = cleanString(obj.sourceKey, 160);
  if (sourceKey) fingerprint.sourceKey = sourceKey;
  return fingerprint;
}

function normalizeVoiceMemo(raw: unknown): VoiceNote | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const data = raw as Record<string, unknown>;
  const url = typeof data.url === 'string' ? data.url.trim().slice(0, 2000) : '';
  const storagePath = typeof data.storagePath === 'string' ? data.storagePath.trim().slice(0, 400) : '';
  const contentType = typeof data.contentType === 'string' ? data.contentType.trim().slice(0, 80) : '';
  const durationSec = typeof data.durationSec === 'number' ? data.durationSec : Number(data.durationSec);
  const byteSize = typeof data.byteSize === 'number' ? data.byteSize : Number(data.byteSize);
  if (!url || !storagePath) return undefined;
  if (!Number.isFinite(durationSec) || durationSec <= 0 || durationSec > 5) return undefined;
  if (!storagePath.startsWith('voice/') || !storagePath.includes('/profile/')) return undefined;
  return {
    url,
    storagePath,
    contentType: contentType || 'audio/webm',
    durationSec,
    byteSize: Number.isFinite(byteSize) && byteSize > 0 ? byteSize : 0,
  };
}

function normalizeFeatured(raw: unknown): ArtistHomeFeatured {
  const obj = (raw && typeof raw === 'object' ? raw : {}) as Partial<ArtistHomeFeatured>;
  const featured: ArtistHomeFeatured = {};

  const tagline = cleanString(obj.tagline, MAX_TAGLINE);
  if (tagline) featured.tagline = tagline;
  const bio = cleanString(obj.bio, MAX_BIO);
  if (bio) featured.bio = bio;
  const soundIdentity = normalizeSoundIdentity(obj.soundIdentity);
  if (soundIdentity) featured.soundIdentity = soundIdentity;
  const embedUrl = cleanString(obj.embedUrl, 500);
  if (embedUrl) featured.embedUrl = embedUrl;
  const embedTitle = cleanString(obj.embedTitle, 120);
  if (embedTitle) featured.embedTitle = embedTitle;
  const featuredTrack = normalizeFeaturedTrack(obj.featuredTrack);
  if (featuredTrack) featured.featuredTrack = featuredTrack;
  const barOfWeek = cleanString(obj.barOfWeek, MAX_BAR);
  if (barOfWeek) featured.barOfWeek = barOfWeek;
  const barOfWeekShareId = cleanString(obj.barOfWeekShareId, 40);
  if (barOfWeekShareId) featured.barOfWeekShareId = barOfWeekShareId;

  if (Array.isArray(obj.dnaLines)) {
    const lines = obj.dnaLines
      .map((l) => cleanString(l, 160))
      .filter((l): l is string => Boolean(l))
      .slice(0, MAX_DNA_LINES);
    if (lines.length) featured.dnaLines = lines;
  }

  const fingerprint = normalizeFingerprint(obj.fingerprint);
  if (fingerprint) featured.fingerprint = fingerprint;

  const barBoard = normalizeBarBoard(obj.barBoard, obj.theCatch);
  if (barBoard) featured.barBoard = barBoard;
  const openLockId = cleanString(obj.openLockId, 40);
  if (openLockId) featured.openLockId = openLockId;

  if (Array.isArray(obj.albumRooms)) {
    const rooms = obj.albumRooms
      .map((room): AlbumRoomCard | null => {
        const title = cleanString((room as AlbumRoomCard)?.title, 80);
        if (!title) return null;
        const card: AlbumRoomCard = { title };
        const albumId = cleanString((room as AlbumRoomCard).albumId, 80);
        if (albumId) card.albumId = albumId;
        const theme = cleanString((room as AlbumRoomCard).theme, 120);
        if (theme) card.theme = theme;
        const roomImage = cleanString((room as AlbumRoomCard).roomImageUrl, 400000);
        if (roomImage) card.roomImageUrl = roomImage;
        const cover = cleanString((room as AlbumRoomCard).coverArtUrl, 400000);
        if (cover) card.coverArtUrl = cover;
        const shareId = cleanString((room as AlbumRoomCard).shareId, 40);
        if (shareId) card.shareId = shareId;
        const sampleBar = cleanString((room as AlbumRoomCard).sampleBar, MAX_BAR);
        if (sampleBar) card.sampleBar = sampleBar;
        return card;
      })
      .filter((r): r is AlbumRoomCard => r !== null)
      .slice(0, MAX_ALBUM_ROOMS);
    if (rooms.length) featured.albumRooms = rooms;
  }

  if (Array.isArray(obj.dropShelfShareIds)) {
    const ids = obj.dropShelfShareIds
      .map((id) => cleanString(id, 40))
      .filter((id): id is string => Boolean(id))
      .slice(0, MAX_DROPS);
    if (ids.length) featured.dropShelfShareIds = ids;
  }

  const socials = normalizeSocials(obj.socials);
  if (socials) featured.socials = socials;

  const voiceMemo = normalizeVoiceMemo(obj.voiceMemo);
  if (voiceMemo) featured.voiceMemo = voiceMemo;

  const contact = normalizeContact(obj.contact);
  if (contact) featured.contact = contact;

  const imprintShelfPostIds = normalizeImprintShelfPostIds(obj.imprintShelfPostIds);
  if (imprintShelfPostIds) featured.imprintShelfPostIds = imprintShelfPostIds;

  return featured;
}

/** Validate + clamp an untrusted config (client input or Firestore read). */
export function normalizeArtistHomeConfig(raw: unknown): ArtistHomeConfig {
  const obj = (raw && typeof raw === 'object' ? raw : {}) as Partial<ArtistHomeConfig>;
  return {
    version: 2,
    theme: normalizePressingConfig(obj.theme),
    modules: normalizeModules(obj.modules),
    featured: normalizeFeatured(obj.featured),
  };
}

/** Public mirror — drop request-mode contact values so emails never sit on publicProfiles. */
export function artistHomeForPublic(config: ArtistHomeConfig): ArtistHomeConfig {
  const next = contactForPublicProfile(config.featured.contact);
  const featured = { ...config.featured };
  if (next) featured.contact = next;
  else delete featured.contact;
  if (featured.featuredTrack?.previewPath) {
    const { previewPath: _privatePath, ...publicTrack } = featured.featuredTrack;
    featured.featuredTrack = publicTrack;
  }
  if (featured.albumRooms?.length) {
    featured.albumRooms = featured.albumRooms.map((room) => {
      const cover = room.coverArtUrl;
      if (typeof cover === 'string' && cover.startsWith('data:image/')) {
        const { coverArtUrl: _drop, ...rest } = room;
        return rest;
      }
      return room;
    });
  }
  return { ...config, featured };
}
