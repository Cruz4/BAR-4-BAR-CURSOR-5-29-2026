/**
 * Persist the anonymous try-sheet track for signup handoff.
 * Also mirrors non-empty bar lines into demo-session for FirstSongHero.
 *
 * Fresh sessions seed bar 1 with a Lyrical Architect–style unfinished line
 * and leave bar 2 empty for “finish this bar.”
 */

import type { Album, Track } from '@/lib/types';
import { GUEST_TRY_ALBUM_ID, GUEST_TRY_TRACK_ID } from '@/lib/guest-try';
import { clearDemoLines, persistDemoLines } from '@/lib/demo-session';
import { pickGuestStarterLine } from '@/lib/guest-architect-starters';

export const GUEST_TRACK_KEY = 'b4b-guest-track';
const GUEST_TRACK_HANDOFF_LOCK = 'b4b-guest-track-handoff-lock';

export function createBlankGuestTrack(): Track {
  return createSeededGuestTrack();
}

/** New try sheet: Architect starter on bar 1, empty bar 2 to finish under it. */
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
        bars: [
          { idx: 1, text: starter, accepted: true, syllables: 0, rhymeKey: '?' },
          { idx: 2, text: '', accepted: true, syllables: 0, rhymeKey: '?' },
        ],
      },
    ],
    status: 'in_progress',
    createdAt: now,
    direction: { enabled: false, inheritFromAlbum: false },
  };
}

/**
 * Replace bar 1 with a new Architect starter and clear bar 2.
 * Preserves other bars if the guest already wrote further.
 */
export function reshuffleGuestStarter(track: Track): Track {
  const section = track.sections?.[0];
  if (!section) return createSeededGuestTrack();
  const prevStarter = (section.bars?.[0]?.text || '').trim();
  const starter = pickGuestStarterLine(prevStarter);
  const rest = (section.bars || []).slice(2);
  const bars = [
    { idx: 1, text: starter, accepted: true, syllables: 0, rhymeKey: '?' },
    { idx: 2, text: '', accepted: true, syllables: 0, rhymeKey: '?' },
    ...rest.map((b, i) => ({ ...b, idx: i + 3 })),
  ];
  return {
    ...track,
    sections: [{ ...section, bars }],
  };
}

export function createGuestTryAlbum(track?: Track): Album {
  const t = track ?? createSeededGuestTrack();
  return {
    id: GUEST_TRY_ALBUM_ID,
    ownerId: 'guest',
    title: 'Try Sheet',
    theme: 'Finish the starter bar — sign up to save.',
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
      ...createSeededGuestTrack(),
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
  const seeded = createSeededGuestTrack();
  persistGuestTrack(seeded);
  return createGuestTryAlbum(seeded);
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
    const track = createSeededGuestTrack();
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
