import { NextResponse } from 'next/server';
import { getAuth } from '@/lib/firebase/server';
import {
  endReleaseRoom,
  startReleaseRoom,
  updateReleaseRoomPlayhead,
  ReleaseRoomError,
} from '@/lib/server/release-room';

export const runtime = 'nodejs';

type RouteCtx = { params: Promise<{ roomId: string }> };

async function requireUid(req: Request): Promise<string | null> {
  const header = req.headers.get('authorization');
  if (!header?.startsWith('Bearer ')) return null;
  try {
    const decoded = await (await getAuth()).verifyIdToken(header.slice('Bearer '.length));
    return decoded.uid;
  } catch {
    return null;
  }
}

/**
 * POST /api/release-rooms/[roomId]/control
 * Host actions: { action: 'start' | 'end' | 'playhead', atMs?, playing?, trackId? }
 */
export async function POST(req: Request, ctx: RouteCtx) {
  try {
    const uid = await requireUid(req);
    if (!uid) {
      return NextResponse.json({ error: 'Sign in required' }, { status: 401 });
    }
    const { roomId } = await ctx.params;
    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    const action =
      body.action === 'start' || body.action === 'end' || body.action === 'playhead'
        ? body.action
        : null;
    if (!action) {
      return NextResponse.json({ error: 'Invalid control action' }, { status: 400 });
    }

    if (action === 'start') {
      const room = await startReleaseRoom(roomId, uid);
      return NextResponse.json({ room });
    }
    if (action === 'end') {
      const room = await endReleaseRoom(roomId, uid);
      return NextResponse.json({ room });
    }

    const atMs = typeof body.atMs === 'number' ? body.atMs : Number(body.atMs);
    if (!Number.isFinite(atMs)) {
      return NextResponse.json({ error: 'atMs required for playhead sync' }, { status: 400 });
    }
    const playhead = await updateReleaseRoomPlayhead(roomId, uid, {
      atMs,
      playing: body.playing === true,
      trackId: typeof body.trackId === 'string' ? body.trackId : undefined,
    });
    return NextResponse.json({ playhead });
  } catch (error) {
    if (error instanceof ReleaseRoomError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('[release-rooms control]', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Control failed' },
      { status: 500 }
    );
  }
}
