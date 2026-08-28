import 'server-only';

import { randomBytes } from 'crypto';
import { FieldValue } from 'firebase-admin/firestore';
import type { Firestore } from 'firebase-admin/firestore';
import { getDb } from '@/lib/firebase/server';
import { loadShare, isReleaseShareLive } from '@/lib/server/drop-entitlements';
import {
  assertMutationsAllowed,
  getProductSurfaces,
  ProductSurfacesMutationBlockedError,
} from '@/lib/server/product-surfaces';
import {
  isReleaseRoomReactKey,
  type ReleaseRoom,
  type ReleaseRoomPlayhead,
  type ReleaseRoomPublic,
  type ReleaseRoomReport,
  type ReleaseRoomStatus,
} from '@/lib/release-room';

const ROOMS = 'releaseRooms';

export class ReleaseRoomError extends Error {
  readonly status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = 'ReleaseRoomError';
    this.status = status;
  }
}

async function assertReleaseRoomEnabled(): Promise<void> {
  const surfaces = await getProductSurfaces();
  if (surfaces.releaseRoom !== 'v1') {
    throw new ReleaseRoomError('Release Room is not enabled.', 403);
  }
}

async function assertWrites(): Promise<void> {
  await assertReleaseRoomEnabled();
  try {
    await assertMutationsAllowed();
  } catch (error) {
    if (error instanceof ProductSurfacesMutationBlockedError) {
      throw new ReleaseRoomError(error.message, 503);
    }
    throw error;
  }
}

function mapRoom(id: string, data: Record<string, unknown>): ReleaseRoom | null {
  const shareId = typeof data.shareId === 'string' ? data.shareId : '';
  const ownerId = typeof data.ownerId === 'string' ? data.ownerId : '';
  const title = typeof data.title === 'string' ? data.title : '';
  const scheduledAt = typeof data.scheduledAt === 'string' ? data.scheduledAt : '';
  const status: ReleaseRoomStatus | null =
    data.status === 'scheduled' || data.status === 'live' || data.status === 'ended'
      ? data.status
      : null;
  if (!shareId || !ownerId || !title || !scheduledAt || !status) return null;

  const playheadRaw = data.playhead && typeof data.playhead === 'object'
    ? (data.playhead as Record<string, unknown>)
    : null;
  let playhead: ReleaseRoomPlayhead | null = null;
  if (playheadRaw) {
    const atMs = typeof playheadRaw.atMs === 'number' ? playheadRaw.atMs : 0;
    const playing = playheadRaw.playing === true;
    const updatedAt = typeof playheadRaw.updatedAt === 'string' ? playheadRaw.updatedAt : '';
    if (updatedAt) {
      playhead = {
        atMs: Math.max(0, Math.floor(atMs)),
        playing,
        trackId: typeof playheadRaw.trackId === 'string' ? playheadRaw.trackId : undefined,
        updatedAt,
        updatedBy: typeof playheadRaw.updatedBy === 'string' ? playheadRaw.updatedBy : undefined,
      };
    }
  }

  const reactCounts =
    data.reactCounts && typeof data.reactCounts === 'object'
      ? Object.fromEntries(
          Object.entries(data.reactCounts as Record<string, unknown>).filter(
            ([, v]) => typeof v === 'number' && Number.isFinite(v)
          ) as Array<[string, number]>
        )
      : {};

  return {
    id,
    shareId,
    ownerId,
    title: title.slice(0, 120),
    artistName: typeof data.artistName === 'string' ? data.artistName.slice(0, 80) : undefined,
    coverUrl: typeof data.coverUrl === 'string' ? data.coverUrl : null,
    scheduledAt,
    startedAt: typeof data.startedAt === 'string' ? data.startedAt : null,
    endedAt: typeof data.endedAt === 'string' ? data.endedAt : null,
    status,
    playhead,
    rsvpCount: typeof data.rsvpCount === 'number' ? data.rsvpCount : 0,
    attendCount: typeof data.attendCount === 'number' ? data.attendCount : 0,
    reactCounts,
    createdAt: typeof data.createdAt === 'string' ? data.createdAt : scheduledAt,
  };
}

function toPublic(room: ReleaseRoom, opts?: { isHost?: boolean; hasRsvp?: boolean; includeOwner?: boolean }): ReleaseRoomPublic {
  const { ownerId, ...rest } = room;
  return {
    ...rest,
    ...(opts?.includeOwner || opts?.isHost ? { ownerId } : {}),
    isHost: opts?.isHost === true,
    hasRsvp: opts?.hasRsvp === true,
  };
}

async function unusedRoomId(db: Firestore): Promise<string> {
  for (let attempt = 0; attempt < 6; attempt += 1) {
    const id = randomBytes(6).toString('base64url');
    if (!(await db.collection(ROOMS).doc(id).get()).exists) return id;
  }
  throw new ReleaseRoomError('Could not reserve a room id. Try again.', 500);
}

function titleFromShare(share: NonNullable<Awaited<ReturnType<typeof loadShare>>>): {
  title: string;
  artistName?: string;
  coverUrl?: string | null;
} {
  const payload = share.data ?? {};
  const title =
    typeof payload.title === 'string' && payload.title.trim()
      ? payload.title.trim().slice(0, 120)
      : 'Listening Room';
  const coverUrl =
    typeof payload.coverArtUrl === 'string'
      ? payload.coverArtUrl
      : typeof payload.coverUrl === 'string'
        ? payload.coverUrl
        : null;
  return {
    title,
    artistName: share.ownerName?.slice(0, 80),
    coverUrl,
  };
}

export async function createReleaseRoom(input: {
  ownerId: string;
  shareId: string;
  scheduledAt: string;
  title?: string;
}): Promise<ReleaseRoom> {
  await assertWrites();

  const scheduledMs = Date.parse(input.scheduledAt);
  if (!Number.isFinite(scheduledMs)) {
    throw new ReleaseRoomError('Invalid schedule time.');
  }
  // Allow starting soon; reject far-past (>1h) schedules
  if (scheduledMs < Date.now() - 60 * 60 * 1000) {
    throw new ReleaseRoomError('Schedule time is too far in the past.');
  }
  if (scheduledMs > Date.now() + 90 * 24 * 60 * 60 * 1000) {
    throw new ReleaseRoomError('Schedule time must be within 90 days.');
  }

  const db = await getDb();
  const share = await loadShare(db, input.shareId);
  if (!share) throw new ReleaseRoomError('Release not found.', 404);
  if (share.ownerId !== input.ownerId) {
    throw new ReleaseRoomError('Only the release owner can schedule a listening room.', 403);
  }
  if (!isReleaseShareLive(share)) {
    throw new ReleaseRoomError('Release must be live to schedule a listening room.');
  }

  const meta = titleFromShare(share);
  const id = await unusedRoomId(db);
  const now = new Date().toISOString();
  const room: ReleaseRoom = {
    id,
    shareId: share.id,
    ownerId: input.ownerId,
    title: (input.title?.trim() || meta.title).slice(0, 120),
    artistName: meta.artistName,
    coverUrl: meta.coverUrl,
    scheduledAt: new Date(scheduledMs).toISOString(),
    startedAt: null,
    endedAt: null,
    status: 'scheduled',
    playhead: null,
    rsvpCount: 0,
    attendCount: 0,
    reactCounts: {},
    createdAt: now,
  };

  await db.collection(ROOMS).doc(id).set(room);
  return room;
}

export async function getReleaseRoom(
  roomId: string,
  viewerUid?: string | null
): Promise<ReleaseRoomPublic | null> {
  await assertReleaseRoomEnabled();
  if (!roomId?.trim() || roomId.includes('/')) return null;

  const db = await getDb();
  const snap = await db.collection(ROOMS).doc(roomId).get();
  if (!snap.exists) return null;
  const room = mapRoom(snap.id, snap.data() as Record<string, unknown>);
  if (!room) return null;

  let hasRsvp = false;
  if (viewerUid) {
    const session = await db
      .collection(ROOMS)
      .doc(roomId)
      .collection('sessions')
      .doc(viewerUid)
      .get();
    hasRsvp = Boolean(session.exists && session.data()?.rsvpAt);
  }

  return toPublic(room, {
    isHost: viewerUid === room.ownerId,
    hasRsvp,
    includeOwner: viewerUid === room.ownerId,
  });
}

export async function rsvpReleaseRoom(roomId: string, userId: string): Promise<ReleaseRoomPublic> {
  await assertWrites();
  if (!userId) throw new ReleaseRoomError('Sign in required to RSVP.', 401);

  const db = await getDb();
  const roomRef = db.collection(ROOMS).doc(roomId);
  const sessionRef = roomRef.collection('sessions').doc(userId);
  const now = new Date().toISOString();

  await db.runTransaction(async (tx) => {
    const roomSnap = await tx.get(roomRef);
    if (!roomSnap.exists) throw new ReleaseRoomError('Room not found.', 404);
    const room = mapRoom(roomSnap.id, roomSnap.data() as Record<string, unknown>);
    if (!room) throw new ReleaseRoomError('Room not found.', 404);
    if (room.status === 'ended') throw new ReleaseRoomError('This room has ended.');

    const sessionSnap = await tx.get(sessionRef);
    if (sessionSnap.exists && sessionSnap.data()?.rsvpAt) {
      return; // idempotent
    }

    tx.set(
      sessionRef,
      {
        roomId,
        userId,
        rsvpAt: now,
        lastSeenAt: now,
      },
      { merge: true }
    );
    if (!sessionSnap.exists || !sessionSnap.data()?.rsvpAt) {
      tx.update(roomRef, { rsvpCount: FieldValue.increment(1) });
    }
  });

  const publicRoom = await getReleaseRoom(roomId, userId);
  if (!publicRoom) throw new ReleaseRoomError('Room not found.', 404);
  return publicRoom;
}

/** Idempotent start — host only. Marks attendance for host. */
export async function startReleaseRoom(roomId: string, hostId: string): Promise<ReleaseRoomPublic> {
  await assertWrites();
  const db = await getDb();
  const roomRef = db.collection(ROOMS).doc(roomId);
  const now = new Date().toISOString();

  await db.runTransaction(async (tx) => {
    const snap = await tx.get(roomRef);
    if (!snap.exists) throw new ReleaseRoomError('Room not found.', 404);
    const room = mapRoom(snap.id, snap.data() as Record<string, unknown>);
    if (!room) throw new ReleaseRoomError('Room not found.', 404);
    if (room.ownerId !== hostId) throw new ReleaseRoomError('Only the host can start the room.', 403);
    if (room.status === 'ended') throw new ReleaseRoomError('This room has ended.');
    if (room.status === 'live' && room.startedAt) return; // idempotent

    tx.update(roomRef, {
      status: 'live',
      startedAt: room.startedAt || now,
      playhead: {
        atMs: 0,
        playing: true,
        updatedAt: now,
        updatedBy: hostId,
      },
    });
  });

  await markAttendance(roomId, hostId);
  const publicRoom = await getReleaseRoom(roomId, hostId);
  if (!publicRoom) throw new ReleaseRoomError('Room not found.', 404);
  return publicRoom;
}

/** Idempotent end — host only. */
export async function endReleaseRoom(roomId: string, hostId: string): Promise<ReleaseRoomPublic> {
  await assertWrites();
  const db = await getDb();
  const roomRef = db.collection(ROOMS).doc(roomId);
  const now = new Date().toISOString();

  await db.runTransaction(async (tx) => {
    const snap = await tx.get(roomRef);
    if (!snap.exists) throw new ReleaseRoomError('Room not found.', 404);
    const room = mapRoom(snap.id, snap.data() as Record<string, unknown>);
    if (!room) throw new ReleaseRoomError('Room not found.', 404);
    if (room.ownerId !== hostId) throw new ReleaseRoomError('Only the host can end the room.', 403);
    if (room.status === 'ended') return; // idempotent

    tx.update(roomRef, {
      status: 'ended',
      endedAt: room.endedAt || now,
      playhead: room.playhead
        ? { ...room.playhead, playing: false, updatedAt: now, updatedBy: hostId }
        : FieldValue.delete(),
    });
  });

  const publicRoom = await getReleaseRoom(roomId, hostId);
  if (!publicRoom) throw new ReleaseRoomError('Room not found.', 404);
  return publicRoom;
}

export async function markAttendance(roomId: string, userId: string): Promise<void> {
  if (!userId) return;
  const db = await getDb();
  const roomRef = db.collection(ROOMS).doc(roomId);
  const sessionRef = roomRef.collection('sessions').doc(userId);
  const now = new Date().toISOString();

  await db.runTransaction(async (tx) => {
    const roomSnap = await tx.get(roomRef);
    if (!roomSnap.exists) return;
    const room = mapRoom(roomSnap.id, roomSnap.data() as Record<string, unknown>);
    if (!room || room.status === 'ended') return;

    const sessionSnap = await tx.get(sessionRef);
    const already = Boolean(sessionSnap.exists && sessionSnap.data()?.attendedAt);

    tx.set(
      sessionRef,
      {
        roomId,
        userId,
        attendedAt: already ? sessionSnap.data()?.attendedAt : now,
        lastSeenAt: now,
        ...(sessionSnap.exists && sessionSnap.data()?.rsvpAt
          ? {}
          : { rsvpAt: sessionSnap.data()?.rsvpAt ?? now }),
      },
      { merge: true }
    );

    if (!already) {
      tx.update(roomRef, { attendCount: FieldValue.increment(1) });
    }
  });
}

export async function updateReleaseRoomPlayhead(
  roomId: string,
  hostId: string,
  input: { atMs: number; playing: boolean; trackId?: string }
): Promise<ReleaseRoomPlayhead> {
  await assertWrites();
  const db = await getDb();
  const roomRef = db.collection(ROOMS).doc(roomId);
  const now = new Date().toISOString();
  const playhead: ReleaseRoomPlayhead = {
    atMs: Math.max(0, Math.floor(input.atMs)),
    playing: input.playing === true,
    trackId: typeof input.trackId === 'string' && input.trackId.length <= 200 ? input.trackId : undefined,
    updatedAt: now,
    updatedBy: hostId,
  };

  await db.runTransaction(async (tx) => {
    const snap = await tx.get(roomRef);
    if (!snap.exists) throw new ReleaseRoomError('Room not found.', 404);
    const room = mapRoom(snap.id, snap.data() as Record<string, unknown>);
    if (!room) throw new ReleaseRoomError('Room not found.', 404);
    if (room.ownerId !== hostId) throw new ReleaseRoomError('Only the host can sync playhead.', 403);
    if (room.status !== 'live') throw new ReleaseRoomError('Room is not live.');

    tx.update(roomRef, { playhead });
  });

  return playhead;
}

export async function reactInReleaseRoom(
  roomId: string,
  userId: string,
  react: string
): Promise<{ reactCounts: Record<string, number> }> {
  await assertWrites();
  if (!userId) throw new ReleaseRoomError('Sign in required.', 401);
  if (!isReleaseRoomReactKey(react)) {
    throw new ReleaseRoomError('Invalid reaction.');
  }

  const db = await getDb();
  const roomRef = db.collection(ROOMS).doc(roomId);

  await db.runTransaction(async (tx) => {
    const snap = await tx.get(roomRef);
    if (!snap.exists) throw new ReleaseRoomError('Room not found.', 404);
    const room = mapRoom(snap.id, snap.data() as Record<string, unknown>);
    if (!room) throw new ReleaseRoomError('Room not found.', 404);
    if (room.status !== 'live') throw new ReleaseRoomError('Reactions are only open while live.');

    tx.update(roomRef, {
      [`reactCounts.${react}`]: FieldValue.increment(1),
    });
  });

  await markAttendance(roomId, userId);
  const publicRoom = await getReleaseRoom(roomId, userId);
  return { reactCounts: publicRoom?.reactCounts ?? {} };
}

export async function getReleaseRoomReport(
  roomId: string,
  hostId: string
): Promise<ReleaseRoomReport> {
  await assertReleaseRoomEnabled();
  const db = await getDb();
  const snap = await db.collection(ROOMS).doc(roomId).get();
  if (!snap.exists) throw new ReleaseRoomError('Room not found.', 404);
  const room = mapRoom(snap.id, snap.data() as Record<string, unknown>);
  if (!room) throw new ReleaseRoomError('Room not found.', 404);
  if (room.ownerId !== hostId) throw new ReleaseRoomError('Host only.', 403);

  let durationMs: number | null = null;
  if (room.startedAt) {
    const end = room.endedAt ? Date.parse(room.endedAt) : Date.now();
    const start = Date.parse(room.startedAt);
    if (Number.isFinite(start) && Number.isFinite(end)) {
      durationMs = Math.max(0, end - start);
    }
  }

  return {
    roomId: room.id,
    shareId: room.shareId,
    title: room.title,
    status: room.status,
    scheduledAt: room.scheduledAt,
    startedAt: room.startedAt,
    endedAt: room.endedAt,
    durationMs,
    rsvpCount: room.rsvpCount,
    attendCount: room.attendCount,
    reactCounts: room.reactCounts,
    playhead: room.playhead,
  };
}
