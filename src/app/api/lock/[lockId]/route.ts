import { NextResponse } from 'next/server';
import { getLock, listEchoes, ensureHouseLock } from '@/lib/server/lock';
import { isLockEnabled, LOCK_HOUSE_ID } from '@/lib/lock-feature';

export const runtime = 'nodejs';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ lockId: string }> }
) {
  if (!isLockEnabled()) {
    return NextResponse.json({ error: 'LOCK is off' }, { status: 404 });
  }
  try {
    const { lockId: raw } = await params;
    const lockId = (raw || '').trim() || LOCK_HOUSE_ID;
    if (lockId === LOCK_HOUSE_ID || lockId === 'house') {
      await ensureHouseLock();
    }
    const lock = await getLock(lockId === 'house' ? LOCK_HOUSE_ID : lockId);
    if (!lock) {
      return NextResponse.json({ error: 'LOCK not found' }, { status: 404 });
    }
    const [newest, top] = await Promise.all([
      listEchoes(lock.id, { limit: 40, order: 'new' }),
      listEchoes(lock.id, { limit: 8, order: 'score' }),
    ]);
    return NextResponse.json({
      lock,
      echoes: newest,
      topEchoes: top,
    });
  } catch (err) {
    console.error('[lock GET]', err);
    return NextResponse.json({ error: 'Failed to load LOCK' }, { status: 500 });
  }
}
