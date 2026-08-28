import { NextResponse } from 'next/server';
import { getAuth } from '@/lib/firebase/server';
import { rsvpReleaseRoom, ReleaseRoomError } from '@/lib/server/release-room';

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

/** POST /api/release-rooms/[roomId]/rsvp */
export async function POST(req: Request, ctx: RouteCtx) {
  try {
    const uid = await requireUid(req);
    if (!uid) {
      return NextResponse.json({ error: 'Sign in required to RSVP' }, { status: 401 });
    }
    const { roomId } = await ctx.params;
    const room = await rsvpReleaseRoom(roomId, uid);
    return NextResponse.json({ room });
  } catch (error) {
    if (error instanceof ReleaseRoomError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('[release-rooms rsvp]', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'RSVP failed' },
      { status: 500 }
    );
  }
}
