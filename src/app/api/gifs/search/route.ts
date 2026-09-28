import { NextResponse } from 'next/server';
import { getAuth } from '@/lib/firebase/server';
import { checkRateLimit } from '@/lib/server/rate-limit';

export const runtime = 'nodejs';

type GiphyImage = {
  url?: string;
  width?: string;
  height?: string;
};

type GiphyGif = {
  id?: string;
  title?: string;
  images?: {
    fixed_height_small?: GiphyImage;
    fixed_height?: GiphyImage;
    downsized?: GiphyImage;
    original?: GiphyImage;
  };
};

function giphyHttps(raw: string | undefined): string | null {
  const url = raw?.trim();
  if (!url) return null;
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'https:') return null;
    const host = parsed.hostname.toLowerCase();
    if (
      host !== 'giphy.com' &&
      !host.endsWith('.giphy.com') &&
      !host.endsWith('.giphyusercontent.com')
    ) {
      return null;
    }
    return url;
  } catch {
    return null;
  }
}

async function requireUid(req: Request): Promise<string | null> {
  const header = req.headers.get('authorization');
  if (!header?.startsWith('Bearer ')) return null;
  try {
    const auth = await getAuth();
    const decoded = await auth.verifyIdToken(header.slice('Bearer '.length).trim());
    return decoded.uid;
  } catch {
    return null;
  }
}

/** Signed-in GIF search. The Giphy key stays on the server. */
export async function GET(req: Request) {
  const uid = await requireUid(req);
  if (!uid) {
    return NextResponse.json({ error: 'Sign in to search GIFs.' }, { status: 401 });
  }

  const limited = await checkRateLimit(`gif-search:${uid}`, 30, 60_000);
  if (!limited.allowed) {
    return NextResponse.json({ error: 'Slow down a moment, then search again.' }, { status: 429 });
  }

  const apiKey = process.env.GIPHY_API_KEY?.trim();
  if (!apiKey) {
    return NextResponse.json({ error: 'GIF search is not available right now.', gifs: [] }, { status: 503 });
  }

  const query = new URL(req.url).searchParams.get('q')?.trim().slice(0, 80) || '';
  const endpoint = query
    ? 'https://api.giphy.com/v1/gifs/search'
    : 'https://api.giphy.com/v1/gifs/trending';
  const params = new URLSearchParams({
    api_key: apiKey,
    limit: '24',
    rating: 'pg-13',
    lang: 'en',
  });
  if (query) params.set('q', query);

  try {
    const res = await fetch(`${endpoint}?${params}`, { cache: 'no-store' });
    const json = (await res.json().catch(() => ({}))) as { data?: GiphyGif[]; meta?: { msg?: string } };
    if (!res.ok) {
      return NextResponse.json(
        { error: json.meta?.msg || 'GIF search failed.', gifs: [] },
        { status: 502 }
      );
    }
    const gifs = (json.data || [])
      .map((gif) => {
        const preview =
          giphyHttps(gif.images?.fixed_height_small?.url) ||
          giphyHttps(gif.images?.fixed_height?.url);
        const url =
          giphyHttps(gif.images?.downsized?.url) ||
          giphyHttps(gif.images?.fixed_height?.url) ||
          preview;
        if (!gif.id || !preview || !url) return null;
        return {
          id: gif.id,
          title: (gif.title || 'GIF').slice(0, 80),
          previewUrl: preview,
          url,
        };
      })
      .filter((gif): gif is { id: string; title: string; previewUrl: string; url: string } => Boolean(gif));
    return NextResponse.json({ gifs });
  } catch (error) {
    console.error('[gifs/search]', error);
    return NextResponse.json({ error: 'GIF search failed.', gifs: [] }, { status: 502 });
  }
}
