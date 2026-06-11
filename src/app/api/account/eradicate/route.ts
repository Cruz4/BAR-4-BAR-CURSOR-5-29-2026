import { NextResponse } from 'next/server';
import { getAuth, hasAdminFirestoreCredentials } from '@/lib/firebase/server';
import { eradicateUserIdentity } from '@/lib/server/eradicate-user';

export const runtime = 'nodejs';

/** Self-service: wipe account, vault, and Firebase Auth identity. */
export async function POST(req: Request) {
  if (!hasAdminFirestoreCredentials()) {
    return NextResponse.json({ error: 'Account deletion unavailable' }, { status: 503 });
  }

  const header = req.headers.get('authorization');
  if (!header?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Sign in required' }, { status: 401 });
  }

  let uid: string;
  let email: string;
  try {
    const auth = await getAuth();
    const decoded = await auth.verifyIdToken(header.slice('Bearer '.length));
    uid = decoded.uid;
    email = decoded.email || uid;
  } catch {
    return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
  }

  try {
    const result = await eradicateUserIdentity(uid, email, { mode: 'self' });
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Deletion failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
