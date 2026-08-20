import { NextResponse } from 'next/server';
import { isFirstDropsEnabled } from '@/lib/server/first-drops-feature';

export const runtime = 'nodejs';

/** Free First Drop claims are retired; every unlock must pass paid checkout. */
export async function POST() {
  if (!(await isFirstDropsEnabled())) {
    return NextResponse.json({ error: 'First Drops is off' }, { status: 404 });
  }
  return NextResponse.json(
    { error: 'Free unlocks are not available. Use paid checkout.' },
    { status: 410 }
  );
}
