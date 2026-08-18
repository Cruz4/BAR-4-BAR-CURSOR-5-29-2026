import { NextResponse } from 'next/server';
import { getAuth, getDb } from '@/lib/firebase/server';
import { isFirstDropsEnabled } from '@/lib/server/first-drops-feature';
import { recordDropSpin } from '@/lib/server/drop-pulse';
import type { DropPulseKind } from '@/lib/drop-pulse';

export const runtime = 'nodejs';

async function optionalUid(req: Request): Promise<string | null> {
  const header = req.headers.get('authorization');
  if (!header?.startsWith('Bearer ')) return null;
  try {
    const auth = await getAuth();
    const decoded = await auth.verifyIdToken(header.slice('Bearer '.length));
    return decoded.uid;
  } catch {
    return null;
  }
}

/** Count a First Drop preview or full spin. Deduped server-side. */
export async function POST(req: Request) {
  if (!(await isFirstDropsEnabled())) {
    return NextResponse.json({ error: 'First Drops is off' }, { status: 404 });
  }
  try {
    const body = await req.json().catch(() => ({}));
    const shareId = typeof body.shareId === 'string' ? body.shareId.trim() : '';
    const kind: DropPulseKind = body.kind === 'play' ? 'play' : 'preview';
    if (!shareId) return NextResponse.json({ error: 'Missing drop.' }, { status: 400 });

    const viewerId = await optionalUid(req);
    const db = await getDb();
    const result = await recordDropSpin(db, { shareId, kind, viewerId });
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    console.error('[drops/pulse]', err);
    return NextResponse.json({ error: 'Could not record spin.' }, { status: 500 });
  }
}
