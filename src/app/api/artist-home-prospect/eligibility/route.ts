import { NextResponse } from 'next/server';
import { getAuth } from '@/lib/firebase/server';
import { getArtistHomeProspectClaimEligibility } from '@/lib/server/artist-home-prospects';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  try {
    const header = req.headers.get('authorization');
    if (!header?.startsWith('Bearer ')) {
      return NextResponse.json({ ok: false, reason: 'Sign in required.' }, { status: 401 });
    }
    const auth = await getAuth();
    const decoded = await auth.verifyIdToken(header.slice('Bearer '.length));
    const url = new URL(req.url);
    const prospectId = url.searchParams.get('prospectId') || '';
    const claimSecret = url.searchParams.get('claim') || url.searchParams.get('k') || undefined;
    if (!prospectId) {
      return NextResponse.json({ ok: false, reason: 'Missing prospect.' }, { status: 400 });
    }
    const result = await getArtistHomeProspectClaimEligibility(
      decoded.uid,
      decoded.email || '',
      prospectId,
      claimSecret
    );
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ ok: false, reason: 'Could not check eligibility.' }, { status: 500 });
  }
}
