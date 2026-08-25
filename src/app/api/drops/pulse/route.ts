import { NextResponse } from 'next/server';
import { getAuth, getDb } from '@/lib/firebase/server';
import { isFirstDropsEnabled } from '@/lib/server/first-drops-feature';
import { recordDropSpin } from '@/lib/server/drop-pulse';
import type { DropPulseKind } from '@/lib/drop-pulse';
import { isDropListenMilestone } from '@/lib/drop-listen-analytics';
import { resolveDropListenerIdentity } from '@/lib/server/drop-listener-identity';
import { verifyDropListenProof } from '@/lib/server/drop-listen-proof';
import { recordQualifiedListenProgress } from '@/lib/server/drop-listen-analytics';
import { checkRateLimit } from '@/lib/server/rate-limit';

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
    const listener = resolveDropListenerIdentity(req, viewerId);
    const db = await getDb();
    const { allowed } = await checkRateLimit(`drop-listen:${listener.key}`, 120, 60_000);
    if (!allowed) return NextResponse.json({ error: 'Too many listening events.' }, { status: 429 });

    let result: { counted: boolean; qualified?: boolean };
    if (typeof body.listenProof === 'string' && isDropListenMilestone(body.milestone)) {
      const proof = verifyDropListenProof(body.listenProof);
      if (proof.s !== shareId) {
        return NextResponse.json({ error: 'Listening proof does not match this drop.' }, { status: 400 });
      }
      result = await recordQualifiedListenProgress(db, {
        proof,
        listenerKey: listener.key,
        viewerId,
        milestone: body.milestone,
        source: body.source,
      });
    } else {
      result = await recordDropSpin(db, {
        shareId,
        kind,
        viewerId,
        dedupeKey: listener.key,
      });
    }
    const response = NextResponse.json({ ok: true, ...result });
    if (listener.setCookie) response.headers.append('Set-Cookie', listener.setCookie);
    return response;
  } catch (err) {
    console.error('[drops/pulse]', err);
    const message = err instanceof Error ? err.message : 'Could not record spin.';
    const invalidProof = /proof/i.test(message);
    return NextResponse.json(
      { error: invalidProof ? message : 'Could not record spin.' },
      { status: invalidProof ? 400 : 500 }
    );
  }
}
