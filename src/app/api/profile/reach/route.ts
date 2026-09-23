import { NextResponse } from 'next/server';
import { getAuth, getDb } from '@/lib/firebase/server';
import { resolvePublicProfileSlugDoc } from '@/lib/server/profile-slug';
import { getProfileReachAnalytics, parseReachAnalyticsDays } from '@/lib/server/reach-analytics';

export const runtime = 'nodejs';

async function requireUid(req: Request): Promise<string | null> {
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

export async function GET(req: Request) {
  try {
    const uid = await requireUid(req);
    if (!uid) {
      return NextResponse.json({ error: 'Sign in required.' }, { status: 401 });
    }

    const slug = new URL(req.url).searchParams.get('slug')?.trim() || '';
    if (!slug || slug.length > 80) {
      return NextResponse.json({ error: 'Missing profile.' }, { status: 400 });
    }

    const days = parseReachAnalyticsDays(new URL(req.url).searchParams.get('days'));

    const db = await getDb();
    const resolved = await resolvePublicProfileSlugDoc(db, slug);
    if (!resolved?.userId || resolved.userId !== uid) {
      return NextResponse.json({ error: 'Not allowed.' }, { status: 403 });
    }

    const analytics = await getProfileReachAnalytics(db, resolved.slug, days);
    if (!analytics) {
      return NextResponse.json({ error: 'Not found.' }, { status: 404 });
    }

    return NextResponse.json(analytics);
  } catch (err) {
    console.error('[profile/reach]', err);
    return NextResponse.json({ error: 'Could not load reach.' }, { status: 500 });
  }
}
