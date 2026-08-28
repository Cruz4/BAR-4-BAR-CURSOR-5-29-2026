import { NextResponse } from 'next/server';
import { getAuth } from '@/lib/firebase/server';
import { createReleaseRoom, ReleaseRoomError } from '@/lib/server/release-room';

export const runtime = 'nodejs';

async function uidFromRequest(req: Request): Promise<string | null> {
  const header = req.headers.get('authorization');
  if (!header?.startsWith('Bearer ')) return null;
  try {
    const decoded = await (await getAuth()).verifyIdToken(header.slice('Bearer '.length));
    return decoded.uid;
  } catch {
    return null;
  }
}

/** POST /api/release-rooms — create listening room from live shareId (owner). */
export async function POST(req: Request) {
  try {
    const uid = await uidFromRequest(req);
    if (!uid) {
      return NextResponse.json({ error: 'Sign in required' }, { status: 401 });
    }

    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    const shareId = typeof body.shareId === 'string' ? body.shareId.trim() : '';
    const scheduledAt = typeof body.scheduledAt === 'string' ? body.scheduledAt.trim() : '';
    if (!shareId || shareId.includes('/') || !scheduledAt) {
      return NextResponse.json({ error: 'shareId and scheduledAt are required' }, { status: 400 });
    }

    const room = await createReleaseRoom({
      ownerId: uid,
      shareId,
      scheduledAt,
      title: typeof body.title === 'string' ? body.title : undefined,
    });

    return NextResponse.json({ room });
  } catch (error) {
    if (error instanceof ReleaseRoomError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('[release-rooms POST]', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Could not create room' },
      { status: 500 }
    );
  }
}
