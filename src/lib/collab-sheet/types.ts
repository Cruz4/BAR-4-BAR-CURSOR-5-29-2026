/** Collab Sheet — live multi-user lyric editing on the same track. */

import type { Album, Track, TrackSection } from '@/lib/types';

export const COLLAB_MESSAGE_MAX_CHARS = 800;
export const COLLAB_PRESENCE_STALE_MS = 90_000;
export const COLLAB_EDIT_NOTIFY_BAR_DELTA = 4;

export type CollabMember = {
  name: string;
  slug?: string;
};

export type CollabSheetDoc = {
  id: string;
  ownerId: string;
  trackId: string;
  albumId: string;
  title: string;
  albumTitle?: string;
  memberIds: string[];
  members: Record<string, CollabMember>;
  revoked: Record<string, boolean>;
  active: boolean;
  liveSections: TrackSection[];
  revision: number;
  lastEditBy: string;
  lastEditAt: string;
  lastEditSummary?: string;
  /** Bars written at last batch notification — per recipient tracking on server. */
  notifyBarBaseline: number;
  createdAt: string;
  updatedAt: string;
};

export type CollabMessage = {
  id: string;
  senderId: string;
  senderName: string;
  text: string;
  createdAt: string;
  targetUserId?: string;
  clientId?: string;
};

export type CollabPresence = {
  viewing: boolean;
  at: string;
  name?: string;
};

export function collabSheetIdFor(ownerId: string, trackId: string): string {
  return `${ownerId}_${trackId}`;
}

/** Local workstation view for someone invited onto another artist's Collab Sheet. */
export function trackFromCollabSheet(sheet: CollabSheetDoc): Track {
  return {
    id: sheet.trackId,
    albumId: sheet.albumId,
    ownerId: sheet.ownerId,
    title: sheet.title,
    vibe: { genre: 'General', tempoBPM: 90, feeling: ['neutral'] },
    intentRefs: [],
    sections: sheet.liveSections?.length ? sheet.liveSections : [],
    status: 'in_progress',
    createdAt: sheet.createdAt,
    updatedAt: sheet.updatedAt,
    collabSheetId: sheet.id,
  };
}

export function albumFromCollabSheet(sheet: CollabSheetDoc, track: Track): Album {
  return {
    id: sheet.albumId,
    ownerId: sheet.ownerId,
    title: sheet.albumTitle || 'Collab Sheet',
    theme: '',
    createdAt: sheet.createdAt,
    updatedAt: sheet.updatedAt,
    tracks: [track],
  };
}

export function countWrittenBars(sections: TrackSection[] | undefined): number {
  if (!sections?.length) return 0;
  let n = 0;
  for (const sec of sections) {
    for (const bar of sec.bars || []) {
      if (bar.text?.trim()) n += 1;
    }
  }
  return n;
}

export function activePresenceCount(
  presence: Record<string, CollabPresence>,
  memberIds: string[],
  revoked: Record<string, boolean>,
  now = Date.now()
): number {
  const staleBefore = now - COLLAB_PRESENCE_STALE_MS;
  return memberIds.filter((uid) => {
    if (revoked[uid]) return false;
    const p = presence[uid];
    if (!p?.at) return false;
    const t = Date.parse(p.at);
    return Number.isFinite(t) && t >= staleBefore;
  }).length;
}
