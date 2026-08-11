import { NextResponse } from 'next/server';
import { listOpenLocksByOwner } from '@/lib/server/lock';
import { isLockFeatureEnabled } from '@/lib/server/lock-feature';

export const runtime = 'nodejs';

/** Public: open Finish this bar casts for an artist's profile module. */
export async function GET(req: Request) {
  if (!(await isLockFeatureEnabled())) {
    return NextResponse.json({ error: 'LOCK is off' }, { status: 404 });
  }

  const userId = new URL(req.url).searchParams.get('userId')?.trim() || '';
  if (!userId || userId === 'system') {
    return NextResponse.json({ locks: [] });
  }

  try {
    const locks = await listOpenLocksByOwner(userId, 24);
    return NextResponse.json({ locks });
  } catch (err) {
    console.error('[lock by-owner]', err);
    return NextResponse.json({ error: 'Could not load casts' }, { status: 500 });
  }
}
