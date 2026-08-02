import { NextResponse } from 'next/server';
import { getAuth, getDb } from '@/lib/firebase/server';
import { sendBrandedVerificationEmail } from '@/lib/server/mail/verification-email';

export const runtime = 'nodejs';

/**
 * POST /api/auth/send-verification
 * Bearer ID token required. Sends a Resend-branded verify link (not Firebase mail).
 */
export async function POST(req: Request) {
  const header = req.headers.get('authorization') || req.headers.get('Authorization');
  if (!header?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let force = false;
  try {
    const body = (await req.json().catch(() => ({}))) as { force?: boolean };
    force = body.force === true;
  } catch {
    /* empty body ok */
  }

  try {
    const auth = await getAuth();
    const decoded = await auth.verifyIdToken(header.slice('Bearer '.length));
    const uid = decoded.uid;

    const userRecord = await auth.getUser(uid);
    if (userRecord.emailVerified) {
      return NextResponse.json({ ok: true, alreadyVerified: true });
    }

    const email = userRecord.email?.trim();
    if (!email) {
      return NextResponse.json({ error: 'No email on this account.' }, { status: 400 });
    }

    const db = await getDb();
    const result = await sendBrandedVerificationEmail({
      auth,
      db,
      userId: uid,
      email,
      displayName: userRecord.displayName || null,
      force,
    });

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[api/auth/send-verification]', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to send verification email' },
      { status: 500 }
    );
  }
}
