import { NextResponse } from 'next/server';
import { getAuth } from '@/lib/firebase/server';
import { checkRateLimit } from '@/lib/server/rate-limit';

export const runtime = 'nodejs';

const MAX_BYTES = 8 * 1024 * 1024;

function allowedGifUrl(raw: string | null): string | null {
  const url = raw?.trim();
  if (!url || url.length > 2000) return null;
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'https:') return null;
    const host = parsed.hostname.toLowerCase();
    const allowed =
      host === 'giphy.com' ||
      host.endsWith('.giphy.com') ||
      host.endsWith('.giphyusercontent.com');
    return allowed ? url : null;
  } catch {
    return null;
  }
}

/** Server fetch so a fold can store a GIF without the browser hitting Giphy CORS. */
export async function GET(req: Request) {
  const header = req.headers.get('authorization');
  if (!header?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Sign in to attach that GIF.' }, { status: 401 });
  }
  let uid = '';
  try {
    const auth = await getAuth();
    uid = (await auth.verifyIdToken(header.slice('Bearer '.length).trim())).uid;
  } catch {
    return NextResponse.json({ error: 'Sign in to attach that GIF.' }, { status: 401 });
  }

  const limited = await checkRateLimit(`gif-file:${uid}`, 20, 60_000);
  if (!limited.allowed) {
    return NextResponse.json({ error: 'Slow down a moment, then try that GIF again.' }, { status: 429 });
  }

  const target = allowedGifUrl(new URL(req.url).searchParams.get('url'));
  if (!target) {
    return NextResponse.json({ error: 'That GIF link is not allowed.' }, { status: 400 });
  }

  try {
    const res = await fetch(target, { cache: 'no-store' });
    if (!res.ok) {
      return NextResponse.json({ error: 'Could not load that GIF.' }, { status: 502 });
    }
    const type = res.headers.get('content-type') || 'image/gif';
    if (!type.startsWith('image/')) {
      return NextResponse.json({ error: 'That file is not an image.' }, { status: 415 });
    }
    const bytes = await res.arrayBuffer();
    if (bytes.byteLength > MAX_BYTES) {
      return NextResponse.json({ error: 'That GIF is too large.' }, { status: 413 });
    }
    return new NextResponse(bytes, {
      headers: {
        'Content-Type': type,
        'Cache-Control': 'private, max-age=300',
      },
    });
  } catch (error) {
    console.error('[gifs/file]', error);
    return NextResponse.json({ error: 'Could not load that GIF.' }, { status: 502 });
  }
}
