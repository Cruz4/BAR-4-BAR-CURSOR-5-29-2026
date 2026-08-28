import { NextResponse } from 'next/server';
import { getAuth } from '@/lib/firebase/server';
import { getReleaseRoomReport, ReleaseRoomError } from '@/lib/server/release-room';

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

/** GET /api/release-rooms/[roomId]/report — host only */
export async function GET(req: Request, ctx: RouteCtx) {
  try {
    const uid = await requireUid(req);
    if (!uid) {
      return NextResponse.json({ error: 'Sign in required' }, { status: 401 });
    }
    const { roomId } = await ctx.params;
    const report = await getReleaseRoomReport(roomId, uid);
    return NextResponse.json({ report });
  } catch (error) {
    if (error instanceof ReleaseRoomError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('[release-rooms report]', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Report failed' },
      { status: 500 }
    );
  }
}
