import { NextResponse } from 'next/server';
import { getAuth } from '@/lib/firebase/server';
import { getReleaseRoom, ReleaseRoomError } from '@/lib/server/release-room';

export const runtime = 'nodejs';

type RouteCtx = { params: Promise<{ roomId: string }> };

async function optionalUid(req: Request): Promise<string | null> {
  const header = req.headers.get('authorization');
  if (!header?.startsWith('Bearer ')) return null;
  try {
    const decoded = await (await getAuth()).verifyIdToken(header.slice('Bearer '.length));
    return decoded.uid;
  } catch {
    return null;
  }
}

/** GET /api/release-rooms/[roomId] */
export async function GET(req: Request, ctx: RouteCtx) {
  try {
    const { roomId } = await ctx.params;
    const uid = await optionalUid(req);
    const room = await getReleaseRoom(roomId, uid);
    if (!room) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 });
    }
    return NextResponse.json({ room });
  } catch (error) {
    if (error instanceof ReleaseRoomError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('[release-rooms GET]', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Could not load room' },
      { status: 500 }
    );
  }
}
