import { NextResponse } from 'next/server';
import { getAuth } from '@/lib/firebase/server';
import { claimArtistHomeProspect } from '@/lib/server/artist-home-prospects';
import { enforceAppCheck, AppCheckError } from '@/lib/server/app-check-gate';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  try {
    try {
      await enforceAppCheck(req);
    } catch (error) {
      if (error instanceof AppCheckError) {
        return NextResponse.json({ error: error.message }, { status: 403 });
      }
      throw error;
    }

    const header = req.headers.get('authorization');
    if (!header?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Sign in required.' }, { status: 401 });
    }
    const auth = await getAuth();
    const decoded = await auth.verifyIdToken(header.slice('Bearer '.length));
    const body = await req.json();
    const prospectId = typeof body.prospectId === 'string' ? body.prospectId.trim() : '';
    if (!prospectId) {
      return NextResponse.json({ error: 'Missing prospect id.' }, { status: 400 });
    }
    const claimSecret =
      typeof body.claimSecret === 'string' ? body.claimSecret.trim() : undefined;

    const result = await claimArtistHomeProspect({
      userId: decoded.uid,
      userEmail: decoded.email || '',
      prospectId,
      claimSecret,
    });

    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Claim failed';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
