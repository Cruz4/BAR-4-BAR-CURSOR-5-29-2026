import { NextResponse } from 'next/server';
import { getAuth } from '@/lib/firebase/server';
import { reactInReleaseRoom, ReleaseRoomError } from '@/lib/server/release-room';

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

/** POST /api/release-rooms/[roomId]/react — { react: 'fire' | 'heart' | 'headnod' } */
export async function POST(req: Request, ctx: RouteCtx) {
  try {
    const uid = await requireUid(req);
    if (!uid) {
      return NextResponse.json({ error: 'Sign in required' }, { status: 401 });
    }
    const { roomId } = await ctx.params;
    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    const react = typeof body.react === 'string' ? body.react : '';
    const result = await reactInReleaseRoom(roomId, uid, react);
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof ReleaseRoomError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('[release-rooms react]', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'React failed' },
      { status: 500 }
    );
  }
}
