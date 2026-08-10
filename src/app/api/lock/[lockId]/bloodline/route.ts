import { NextResponse } from 'next/server';
import { getLock, listEchoes } from '@/lib/server/lock';
import { LOCK_HOUSE_ID } from '@/lib/lock-feature';
import { isLockFeatureEnabled } from '@/lib/server/lock-feature';

export const runtime = 'nodejs';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ lockId: string }> }
) {
  if (!(await isLockFeatureEnabled())) {
    return NextResponse.json({ error: 'LOCK is off' }, { status: 404 });
  }
  try {
    const { lockId: raw } = await params;
    const lockId = ((raw || '').trim() === 'house' ? LOCK_HOUSE_ID : (raw || '').trim()) || LOCK_HOUSE_ID;
    const lock = await getLock(lockId);
    if (!lock) {
      return NextResponse.json({ error: 'LOCK not found' }, { status: 404 });
    }
    const echoes = await listEchoes(lock.id, { limit: 100, order: 'new' });
    return NextResponse.json({ lock, echoes });
  } catch (err) {
    console.error('[lock bloodline]', err);
    return NextResponse.json({ error: 'Failed to load bloodline' }, { status: 500 });
  }
}
