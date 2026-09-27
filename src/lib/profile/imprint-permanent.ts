/**
 * Permanent Imprint mode — thread style locks and auto quote-press on shares.
 */

import {
  isImprintComposerPermanent,
  normalizeProductSurfacesConfig,
  PRODUCT_SURFACES_DEFAULTS,
  type ImprintComposerMode,
} from '@/lib/product-surface-modes';
import {
  quotePressFadersFromText,
  type QuotePressConfig,
  type QuotePressFaders,
} from '@/lib/profile/quote-press';
import type { PostComment } from '@/lib/profile/social-client';

const PRODUCT_SURFACES_CACHE_KEY = 'b4b.productSurfaces';
const THREAD_LOCK_STORAGE_PREFIX = 'b4b.imprintThreadLock.v1';

export function readCachedImprintComposerMode(): ImprintComposerMode {
  if (typeof window === 'undefined') return PRODUCT_SURFACES_DEFAULTS.imprintComposer;
  try {
    const raw = window.sessionStorage.getItem(PRODUCT_SURFACES_CACHE_KEY);
    if (!raw) return PRODUCT_SURFACES_DEFAULTS.imprintComposer;
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    return normalizeProductSurfacesConfig(parsed).imprintComposer;
  } catch {
    return PRODUCT_SURFACES_DEFAULTS.imprintComposer;
  }
}

export function quotePressConfigForPermanentText(
  text: string,
  lockedFaders?: QuotePressFaders | null
): QuotePressConfig | undefined {
  const mode = readCachedImprintComposerMode();
  if (!isImprintComposerPermanent(mode)) return undefined;
  const trimmed = text.trim();
  if (!trimmed) return undefined;
  const faders = lockedFaders ?? quotePressFadersFromText(trimmed);
  return { faders };
}

/** Earliest Imprint on this thread by the viewer (top-level or nested reply). */
export function viewerFirstImprintFadersOnThread(
  comments: PostComment[],
  viewerUserId: string
): QuotePressFaders | null {
  if (!viewerUserId) return null;
  let earliest: PostComment | null = null;
  for (const comment of comments) {
    if (comment.authorId !== viewerUserId || !comment.quotePress?.faders) continue;
    if (!earliest || comment.createdAt.localeCompare(earliest.createdAt) < 0) {
      earliest = comment;
    }
  }
  return earliest?.quotePress?.faders ?? null;
}

function threadLockStorageKey(scope: string, viewerUserId: string): string {
  return `${THREAD_LOCK_STORAGE_PREFIX}:${scope}:${viewerUserId}`;
}

export function readImprintThreadLock(
  scope: string,
  viewerUserId: string
): QuotePressFaders | null {
  if (typeof window === 'undefined' || !scope || !viewerUserId) return null;
  try {
    const raw = window.sessionStorage.getItem(threadLockStorageKey(scope, viewerUserId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as QuotePressFaders;
    if (
      typeof parsed.heat !== 'number' ||
      typeof parsed.grain !== 'number' ||
      typeof parsed.pace !== 'number' ||
      typeof parsed.ink !== 'number'
    ) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function writeImprintThreadLock(
  scope: string,
  viewerUserId: string,
  faders: QuotePressFaders
): void {
  if (typeof window === 'undefined' || !scope || !viewerUserId) return;
  try {
    window.sessionStorage.setItem(
      threadLockStorageKey(scope, viewerUserId),
      JSON.stringify(faders)
    );
  } catch {
    /* private mode */
  }
}

/** Locked Imprint faders for this viewer on a post/drop thread (comments + session cache). */
export function resolveViewerThreadImprintLock(
  comments: PostComment[],
  viewerUserId: string,
  scope: string | undefined
): QuotePressFaders | null {
  const fromThread = viewerFirstImprintFadersOnThread(comments, viewerUserId);
  if (fromThread) return fromThread;
  if (!scope) return null;
  return readImprintThreadLock(scope, viewerUserId);
}
