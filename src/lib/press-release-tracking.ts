/**
 * Personal Press/Release tracking on album sheets.
 * Same stages for every account — not tied to public identity labels.
 */

import type { Album, Track } from '@/lib/types';

export const PRESS_STAGES = [
  { id: 'beat', label: 'Beat', detail: 'Finding or locking the beat' },
  { id: 'writing', label: 'Writing', detail: 'Lyrics and arrangement' },
  { id: 'recorded', label: 'Recorded', detail: 'Vocals or performance captured' },
  { id: 'mixed', label: 'Mixed', detail: 'Mix in progress or done' },
  { id: 'mastered', label: 'Mastered', detail: 'Master ready' },
  { id: 'artwork', label: 'Artwork', detail: 'Cover / visual' },
  { id: 'released', label: 'Released', detail: 'Ready or already out' },
] as const;

export type PressStageId = (typeof PRESS_STAGES)[number]['id'];

export const PRESS_TRACKING_PREF_KEY = 'b4b.pressTrackingEnabled';

export function parsePressStage(raw: unknown): PressStageId {
  return PRESS_STAGES.some((stage) => stage.id === raw) ? (raw as PressStageId) : 'beat';
}

export function pressStageIndex(stage: PressStageId | undefined): number {
  const id = parsePressStage(stage);
  return Math.max(0, PRESS_STAGES.findIndex((item) => item.id === id));
}

export function pressStagePercent(stage: PressStageId | undefined): number {
  return Math.round(((pressStageIndex(stage) + 1) / PRESS_STAGES.length) * 100);
}

export function pressStageMeta(stage: PressStageId | undefined) {
  return PRESS_STAGES[pressStageIndex(stage)]!;
}

export function readPressTrackingPref(): boolean {
  if (typeof window === 'undefined') return true;
  try {
    const raw = window.localStorage.getItem(PRESS_TRACKING_PREF_KEY);
    if (raw === '0' || raw === 'false') return false;
    if (raw === '1' || raw === 'true') return true;
  } catch {
    /* ignore */
  }
  return true;
}

export function writePressTrackingPref(enabled: boolean) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(PRESS_TRACKING_PREF_KEY, enabled ? '1' : '0');
    window.dispatchEvent(new Event('b4b-press-tracking-changed'));
  } catch {
    /* ignore */
  }
}

export function albumPressTrackingEnabled(album?: Pick<Album, 'pressTrackingEnabled'> | null): boolean {
  if (album && typeof album.pressTrackingEnabled === 'boolean') return album.pressTrackingEnabled;
  return readPressTrackingPref();
}

export function albumTrackSearchHaystack(track: Track): string {
  const stage = pressStageMeta(track.pressStage);
  return [
    track.title,
    track.vibe?.genre,
    track.vibe?.feeling?.join(' '),
    stage.label,
    stage.detail,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}

export type AlbumTrackSortKey = 'manual' | 'name' | 'created' | 'updated' | 'progress';
export type AlbumTrackSortDir = 'asc' | 'desc';

export function sortAlbumTracks(
  tracks: Track[],
  key: AlbumTrackSortKey,
  dir: AlbumTrackSortDir
): Track[] {
  if (key === 'manual') return tracks;
  const sign = dir === 'asc' ? 1 : -1;
  return [...tracks].sort((a, b) => {
    let cmp = 0;
    if (key === 'name') {
      cmp = (a.title || '').localeCompare(b.title || '', undefined, { sensitivity: 'base' });
    } else if (key === 'created') {
      cmp = (a.createdAt || '').localeCompare(b.createdAt || '');
    } else if (key === 'updated') {
      cmp = (a.updatedAt || a.createdAt || '').localeCompare(b.updatedAt || b.createdAt || '');
    } else {
      cmp = pressStagePercent(a.pressStage) - pressStagePercent(b.pressStage);
    }
    if (cmp === 0) cmp = (a.id || '').localeCompare(b.id || '');
    return cmp * sign;
  });
}

export function buildBlankSheetTrack(
  albumId: string,
  ownerId: string,
  title: string
): Omit<Track, 'id'> {
  return {
    albumId,
    ownerId,
    title: title.trim() || 'Untitled Track',
    vibe: { genre: 'Lofi-Hop', tempoBPM: 90, feeling: ['new idea'], enabled: false },
    intentRefs: [],
    sections: [
      {
        id: `section-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        type: 'verse',
        bars: [{ idx: 1, text: '', accepted: true, syllables: 0, rhymeKey: '?' }],
      },
    ],
    status: 'in_progress',
    createdAt: new Date().toISOString(),
    pressStage: 'beat',
    direction: {
      enabled: true,
      inheritFromAlbum: albumId !== 'unassigned',
    },
  };
}
