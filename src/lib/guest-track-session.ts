/**
 * Persist the anonymous try-sheet track for signup handoff.
 * Also mirrors non-empty bar lines into demo-session for FirstSongHero.
 *
 * Fresh sessions open blank on line 01 — tap New starter for an Architect
 * unfinished line (bar 2 left open to finish under it), or type your own.
 */

import type { Album, Track } from '@/lib/types';
import { GUEST_TRY_ALBUM_ID, GUEST_TRY_TRACK_ID } from '@/lib/guest-try';
import { clearDemoLines, persistDemoLines } from '@/lib/demo-session';
import { pickGuestStarterLine } from '@/lib/guest-architect-starters';

export const GUEST_TRACK_KEY = 'b4b-guest-track';
const GUEST_TRACK_HANDOFF_LOCK = 'b4b-guest-track-handoff-lock';

/** True when every bar is blank (or there are no bars). */
export function trackHasWrittenLyrics(track: Track | null | undefined): boolean {
  if (!track?.sections?.length) return false;
  return track.sections.some((s) =>
    (s.bars || []).some((b) => typeof b.text === 'string' && b.text.trim().length > 0)
  );
}

function blankBar(idx: number) {
  return { idx, text: '', accepted: true, syllables: 0, rhymeKey: '?' };
}

function starterBar(idx: number, text: string) {
  return {
    idx,
    text,
    accepted: true,
    syllables: 0,
    rhymeKey: '?',
  };
}

/** New try sheet / blank song: empty line 01 ready for type or New starter. */
export function createBlankGuestTrack(): Track {
  const now = new Date().toISOString();
  return {
    id: GUEST_TRY_TRACK_ID,
    albumId: GUEST_TRY_ALBUM_ID,
    ownerId: 'guest',
    title: 'Finish This Bar',
    vibe: { genre: 'Lofi-Hop', tempoBPM: 90, feeling: ['new idea'], enabled: false },
    intentRefs: [],
    checkedIntents: [],
    intentsEnabled: true,
    endWith: null,
    sections: [
      {
        id: `section-guest-${Date.now()}`,
        type: 'verse',
        bars: [blankBar(1)],
      },
    ],
    status: 'in_progress',
    createdAt: now,
    direction: { enabled: false, inheritFromAlbum: false },
  };
}

/** Architect starter on bar 1, empty bar 2 to finish under it. */
export function createSeededGuestTrack(starterLine?: string): Track {
  const now = new Date().toISOString();
  const starter = (starterLine || pickGuestStarterLine()).trim().slice(0, 280);
  return {
    id: GUEST_TRY_TRACK_ID,
    albumId: GUEST_TRY_ALBUM_ID,
    ownerId: 'guest',
    title: 'Finish This Bar',
    vibe: { genre: 'Lofi-Hop', tempoBPM: 90, feeling: ['new idea'], enabled: false },
    intentRefs: [],
    checkedIntents: [],
    intentsEnabled: true,
    endWith: null,
    sections: [
      {
        id: `section-guest-${Date.now()}`,
        type: 'verse',
        bars: [starterBar(1, starter), blankBar(2)],
      },
    ],
    status: 'in_progress',
    createdAt: now,
    direction: { enabled: false, inheritFromAlbum: false },
  };
}

/**
 * Put a fresh Architect starter on bar 1 and clear bar 2.
 * Works for guest try and signed-in empty sheets.
 */
export function seedArchitectStarterOnTrack(track: Track): Track {
  const section = track.sections?.[0];
  if (!section) {
    const seeded = createSeededGuestTrack();
    return {
      ...track,
      sections: seeded.sections,
      title: track.title || seeded.title,
    };
  }
  const prevStarter = (section.bars?.[0]?.text || '').trim();
  const starter = pickGuestStarterLine(prevStarter);
  const rest = (section.bars || []).slice(2);
  const bars = [
    starterBar(1, starter),
    blankBar(2),
    ...rest.map((b, i) => ({ ...b, idx: i + 3 })),
  ];
  return {
    ...track,
    sections: [{ ...section, bars }],
  };
}

/**
 * Replace bar 1 with a new Architect starter and clear bar 2.
 * Preserves other bars if the guest already wrote further.
 */
export function reshuffleGuestStarter(track: Track): Track {
  return seedArchitectStarterOnTrack(track);
}

export function createGuestTryAlbum(track?: Track): Album {
  const t = track ?? createBlankGuestTrack();
  return {
    id: GUEST_TRY_ALBUM_ID,
    ownerId: 'guest',
    title: 'Try Sheet',
    theme: 'New starter on line 01 — or type your own. Sign up to save.',
    thingsToSay: [],
    createdAt: t.createdAt,
    tracks: [{ ...t, albumId: GUEST_TRY_ALBUM_ID, id: GUEST_TRY_TRACK_ID }],
  };
}

function extractLines(track: Track): string[] {
  const lines: string[] = [];
  for (const section of track.sections || []) {
    for (const bar of section.bars || []) {
      const text = (bar.text || '').trim();
      if (text) lines.push(text);
    }
  }
  return lines.slice(0, 12);
}

export function persistGuestTrack(track: Track): void {
  if (typeof window === 'undefined') return;
  try {
    const payload: Track = {
      ...track,
      id: GUEST_TRY_TRACK_ID,
      albumId: GUEST_TRY_ALBUM_ID,
      ownerId: 'guest',
    };
    localStorage.setItem(GUEST_TRACK_KEY, JSON.stringify(payload));
    const lines = extractLines(payload);
    if (lines.length > 0) persistDemoLines(lines);
    else clearDemoLines();
  } catch {
    /* ignore */
  }
}

export function readGuestTrack(): Track | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(GUEST_TRACK_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Track;
    if (!parsed || typeof parsed !== 'object' || !Array.isArray(parsed.sections)) return null;
    return {
      ...createBlankGuestTrack(),
      ...parsed,
      id: GUEST_TRY_TRACK_ID,
      albumId: GUEST_TRY_ALBUM_ID,
      ownerId: 'guest',
    };
  } catch {
    return null;
  }
}

export function clearGuestTrack(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(GUEST_TRACK_KEY);
  } catch {
    /* ignore */
  }
}

export function loadOrCreateGuestAlbum(): Album {
  const existing = readGuestTrack();
  if (existing) return createGuestTryAlbum(existing);
  const blank = createBlankGuestTrack();
  persistGuestTrack(blank);
  return createGuestTryAlbum(blank);
}

/** Claim guest bars for post-signup track creation. */
export function claimGuestTrackHandoff(): string[] | null {
  if (typeof window === 'undefined') return null;
  try {
    if (sessionStorage.getItem(GUEST_TRACK_HANDOFF_LOCK) === '1') return null;
    const track = readGuestTrack();
    const lines = track ? extractLines(track) : [];
    if (lines.length === 0) return null;
    sessionStorage.setItem(GUEST_TRACK_HANDOFF_LOCK, '1');
    clearGuestTrack();
    return lines;
  } catch {
    return null;
  }
}

export function completeGuestTrackHandoff(): void {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.removeItem(GUEST_TRACK_HANDOFF_LOCK);
  } catch {
    /* ignore */
  }
}

export function releaseGuestTrackHandoff(lines: string[]): void {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.removeItem(GUEST_TRACK_HANDOFF_LOCK);
    const track = createBlankGuestTrack();
    if (lines.length > 0) {
      track.sections = [
        {
          id: `section-guest-${Date.now()}`,
          type: 'verse',
          bars: lines.map((text, i) => ({
            idx: i + 1,
            text,
            accepted: true,
            syllables: 0,
            rhymeKey: '?',
          })),
        },
      ];
    }
    persistGuestTrack(track);
  } catch {
    /* ignore */
  }
}

export function prepareGuestTrackForSignup(): void {
  const track = readGuestTrack();
  if (!track) return;
  const lines = extractLines(track);
  if (lines.length > 0) persistDemoLines(lines);
}
