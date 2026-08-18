/**
 * Guest Pressing landing draft — sessionStorage handoff for claim-after-signup.
 */

import type { PressingFaders } from '@/lib/profile/pressing';
import { DEFAULT_FADERS, DEFAULT_PRESSING } from '@/lib/profile/pressing';
import type { ModuleSize, ProfileModuleId } from '@/lib/profile/modules';
import { MODULE_META, defaultModules } from '@/lib/profile/modules';

export const GUEST_PRESSING_KEY = 'b4b-guest-pressing-draft';
const GUEST_PRESSING_CLAIM_LOCK = 'b4b-guest-pressing-claim-lock';

export type GuestWallDraftPost = {
  id: string;
  text: string;
  /** Optional media link (YouTube, Spotify, etc.). */
  embedUrl?: string;
  /** Example posts shown on the demo wall — not written to Firestore on claim. */
  isSample?: boolean;
  createdAt: string;
};

export type GuestModuleSizes = Partial<Record<ProfileModuleId, ModuleSize>>;

export type GuestPressingDraft = {
  displayName: string;
  tagline?: string;
  seedText: string;
  /** Featured Bar of the Week (separate from The Pressing seed). */
  barOfWeek?: string;
  faders: PressingFaders;
  alive: boolean;
  autoDrift: boolean;
  /** S/M/L overrides for Artist Home sections. */
  moduleSizes: GuestModuleSizes;
  wallPosts: GuestWallDraftPost[];
  savedAt: string;
};

/** Sections guests can resize on the landing preview. */
export const GUEST_SIZEABLE_MODULES: ProfileModuleId[] = [
  'barOfWeek',
  'wall',
  'friends',
  'guestbook',
  'proofWall',
  'dnaStrip',
  'nowPlaying',
  'rhymeFingerprint',
  'barBoard',
  'dropShelf',
];

const SAMPLE_WALL: Omit<GuestWallDraftPost, 'id' | 'createdAt'>[] = [
  {
    text: 'Studio rule: finish the bar before you chase the beat.',
    isSample: true,
  },
  {
    text: 'Dropped a rough verse last night — pocket is there, polish comes later.',
    isSample: true,
  },
];

function sampleWallPosts(): GuestWallDraftPost[] {
  const base = Date.now();
  return SAMPLE_WALL.map((p, i) => ({
    id: `guest-sample-${i}`,
    text: p.text,
    isSample: true,
    createdAt: new Date(base - (i + 1) * 60_000).toISOString(),
  }));
}

function defaultModuleSizes(): GuestModuleSizes {
  const out: GuestModuleSizes = {};
  for (const m of defaultModules()) {
    if (GUEST_SIZEABLE_MODULES.includes(m.id)) {
      out[m.id] = m.size;
    }
  }
  return out;
}

export function defaultGuestPressingDraft(): GuestPressingDraft {
  return {
    displayName: 'Your Name',
    tagline: 'Your booth. Your bars.',
    seedText: DEFAULT_PRESSING.seedText,
    barOfWeek: 'ink dries different when the pen tells the truth',
    faders: { ...DEFAULT_FADERS },
    alive: true,
    autoDrift: false,
    moduleSizes: defaultModuleSizes(),
    wallPosts: sampleWallPosts(),
    savedAt: new Date().toISOString(),
  };
}

function normalizeWallPosts(raw: unknown): GuestWallDraftPost[] {
  if (!Array.isArray(raw)) return sampleWallPosts();
  const out: GuestWallDraftPost[] = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const row = item as Partial<GuestWallDraftPost>;
    const text = typeof row.text === 'string' ? row.text.trim().slice(0, 1000) : '';
    const embedUrl =
      typeof row.embedUrl === 'string' ? row.embedUrl.trim().slice(0, 500) : undefined;
    if (!text && !embedUrl) continue;
    out.push({
      id:
        typeof row.id === 'string' && row.id.trim()
          ? row.id.trim().slice(0, 64)
          : `guest-${Date.now()}-${out.length}`,
      text,
      ...(embedUrl ? { embedUrl } : {}),
      isSample: row.isSample === true,
      createdAt:
        typeof row.createdAt === 'string' ? row.createdAt : new Date().toISOString(),
    });
    if (out.length >= 20) break;
  }
  return out.length ? out : sampleWallPosts();
}

function normalizeModuleSizes(raw: unknown): GuestModuleSizes {
  const base = defaultModuleSizes();
  if (!raw || typeof raw !== 'object') return base;
  const out: GuestModuleSizes = { ...base };
  for (const id of GUEST_SIZEABLE_MODULES) {
    const v = (raw as GuestModuleSizes)[id];
    if (v === 'S' || v === 'M' || v === 'L') out[id] = v;
  }
  return out;
}

export function persistGuestPressingDraft(draft: Omit<GuestPressingDraft, 'savedAt'>): void {
  if (typeof window === 'undefined') return;
  try {
    const payload: GuestPressingDraft = {
      ...draft,
      displayName: draft.displayName.trim().slice(0, 80) || 'Your Name',
      tagline: (draft.tagline || '').trim().slice(0, 120) || undefined,
      seedText: draft.seedText.trim().slice(0, 280) || DEFAULT_PRESSING.seedText,
      barOfWeek: (draft.barOfWeek || '').trim().slice(0, 280) || undefined,
      faders: {
        heat: clampFader(draft.faders.heat),
        grain: clampFader(draft.faders.grain),
        pace: clampFader(draft.faders.pace),
        ink: clampFader(draft.faders.ink),
      },
      alive: draft.alive !== false,
      autoDrift: draft.autoDrift === true,
      moduleSizes: normalizeModuleSizes(draft.moduleSizes),
      wallPosts: normalizeWallPosts(draft.wallPosts),
      savedAt: new Date().toISOString(),
    };
    sessionStorage.setItem(GUEST_PRESSING_KEY, JSON.stringify(payload));
  } catch {
    /* ignore */
  }
}

export function readGuestPressingDraft(): GuestPressingDraft | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(GUEST_PRESSING_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<GuestPressingDraft>;
    if (!parsed || typeof parsed !== 'object') return null;
    const base = defaultGuestPressingDraft();
    return {
      ...base,
      displayName: typeof parsed.displayName === 'string' ? parsed.displayName : base.displayName,
      tagline: typeof parsed.tagline === 'string' ? parsed.tagline : base.tagline,
      seedText: typeof parsed.seedText === 'string' ? parsed.seedText : base.seedText,
      barOfWeek:
        typeof parsed.barOfWeek === 'string' ? parsed.barOfWeek : base.barOfWeek,
      faders: {
        heat: clampFader(parsed.faders?.heat ?? base.faders.heat),
        grain: clampFader(parsed.faders?.grain ?? base.faders.grain),
        pace: clampFader(parsed.faders?.pace ?? base.faders.pace),
        ink: clampFader(parsed.faders?.ink ?? base.faders.ink),
      },
      alive: parsed.alive !== false,
      autoDrift: parsed.autoDrift === true,
      moduleSizes: normalizeModuleSizes(parsed.moduleSizes),
      wallPosts: normalizeWallPosts(parsed.wallPosts),
      savedAt: typeof parsed.savedAt === 'string' ? parsed.savedAt : base.savedAt,
    };
  } catch {
    return null;
  }
}

/** One-shot claim after signup. */
export function claimGuestPressingDraft(): GuestPressingDraft | null {
  if (typeof window === 'undefined') return null;
  try {
    if (sessionStorage.getItem(GUEST_PRESSING_CLAIM_LOCK) === '1') return null;
    const draft = readGuestPressingDraft();
    if (!draft) return null;
    sessionStorage.setItem(GUEST_PRESSING_CLAIM_LOCK, '1');
    sessionStorage.removeItem(GUEST_PRESSING_KEY);
    return draft;
  } catch {
    return null;
  }
}

/** Drop sandbox draft without applying it (returning sign-in). */
export function discardGuestPressingDraft(): void {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.removeItem(GUEST_PRESSING_KEY);
    sessionStorage.removeItem(GUEST_PRESSING_CLAIM_LOCK);
  } catch {
    /* ignore */
  }
}

export function completeGuestPressingClaim(): void {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.removeItem(GUEST_PRESSING_CLAIM_LOCK);
  } catch {
    /* ignore */
  }
}

/** User-authored wall posts to write after claim (samples skipped). */
export function claimableWallPosts(
  draft: GuestPressingDraft
): Array<{ text: string; embedUrl?: string }> {
  return draft.wallPosts
    .filter((p) => !p.isSample && (p.text.trim() || p.embedUrl?.trim()))
    .map((p) => ({
      text: p.text.trim().slice(0, 1000),
      ...(p.embedUrl?.trim() ? { embedUrl: p.embedUrl.trim().slice(0, 500) } : {}),
    }))
    .slice(0, 10);
}

export function moduleSizeLabel(id: ProfileModuleId): string {
  return MODULE_META[id]?.label || id;
}

function clampFader(n: unknown): number {
  const v = typeof n === 'number' ? n : Number(n);
  if (!Number.isFinite(v)) return 50;
  return Math.max(0, Math.min(100, Math.round(v)));
}
