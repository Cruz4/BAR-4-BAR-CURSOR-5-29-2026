/**
 * Release Room V1 — scheduled listening sessions for a live release (no audio duplication).
 */

export type ReleaseRoomStatus = 'scheduled' | 'live' | 'ended';

export type ReleaseRoomPlayhead = {
  atMs: number;
  playing: boolean;
  trackId?: string;
  updatedAt: string;
  updatedBy?: string;
};

export type ReleaseRoom = {
  id: string;
  shareId: string;
  ownerId: string;
  title: string;
  artistName?: string;
  coverUrl?: string | null;
  /** ISO start time for the countdown */
  scheduledAt: string;
  startedAt?: string | null;
  endedAt?: string | null;
  status: ReleaseRoomStatus;
  playhead?: ReleaseRoomPlayhead | null;
  rsvpCount: number;
  attendCount: number;
  reactCounts: Record<string, number>;
  createdAt: string;
};

export type ReleaseRoomSession = {
  roomId: string;
  userId: string;
  rsvpAt?: string | null;
  attendedAt?: string | null;
  lastSeenAt?: string | null;
};

export type ReleaseRoomReport = {
  roomId: string;
  shareId: string;
  title: string;
  status: ReleaseRoomStatus;
  scheduledAt: string;
  startedAt?: string | null;
  endedAt?: string | null;
  durationMs?: number | null;
  rsvpCount: number;
  attendCount: number;
  reactCounts: Record<string, number>;
  playhead?: ReleaseRoomPlayhead | null;
};

export type ReleaseRoomPublic = Omit<ReleaseRoom, 'ownerId'> & {
  /** True when the requesting user is the host */
  isHost?: boolean;
  /** True when the requesting user has RSVP'd */
  hasRsvp?: boolean;
  ownerId?: string;
};

export const RELEASE_ROOM_REACT_KEYS = ['fire', 'heart', 'headnod'] as const;
export type ReleaseRoomReactKey = (typeof RELEASE_ROOM_REACT_KEYS)[number];

export function isReleaseRoomReactKey(value: unknown): value is ReleaseRoomReactKey {
  return typeof value === 'string' && (RELEASE_ROOM_REACT_KEYS as readonly string[]).includes(value);
}

export function releaseRoomPath(roomId: string): string {
  return `/room/${encodeURIComponent(roomId)}`;
}
