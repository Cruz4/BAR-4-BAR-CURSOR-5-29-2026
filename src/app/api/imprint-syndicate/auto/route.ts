import { NextResponse } from 'next/server';
import { getAuth, getDb } from '@/lib/firebase/server';
import {
  imprintAutoSyndicationEnabled,
  uploadImprintToGiphy,
  type ImprintGiphySyndication,
} from '@/lib/server/giphy-syndicate';

export const runtime = 'nodejs';

const MAX_BYTES = 14 * 1024 * 1024;

function publicPostUrl(slug: string | undefined, postId: string): string {
  const base = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') || 'https://akasheet.com';
  return slug ? `${base}/${slug}?post=${postId}` : `${base}/scene?post=${postId}`;
}

/** Background platform syndication — env-gated, no admin UI required. */
export async function POST(req: Request) {
  if (!imprintAutoSyndicationEnabled()) {
    return NextResponse.json({ error: 'Auto syndication is disabled.' }, { status: 404 });
  }

  const header = req.headers.get('authorization');
  if (!header?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Sign in required.' }, { status: 401 });
  }

  try {
    const auth = await getAuth();
    const decoded = await auth.verifyIdToken(header.slice('Bearer '.length));

    const form = await req.formData();
    const postId = String(form.get('postId') || '').trim();
    const text = String(form.get('text') || '').trim().slice(0, 1000);
    const ownerName = String(form.get('ownerName') || 'Artist').trim().slice(0, 80);
    const ownerSlug = String(form.get('ownerSlug') || '').trim().slice(0, 64) || undefined;
    const file = form.get('file');
    const contentType = String(form.get('contentType') || '').trim();

    if (!postId || postId.length > 120 || postId.includes('/')) {
      return NextResponse.json({ error: 'Invalid post id.' }, { status: 400 });
    }
    if (!(file instanceof Blob) || file.size < 32) {
      return NextResponse.json({ error: 'Missing imprint file.' }, { status: 400 });
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: 'Imprint file is too large for Giphy.' }, { status: 413 });
    }

    const db = await getDb();
    const postRef = db.doc(`posts/${postId}`);
    const postSnap = await postRef.get();
    if (!postSnap.exists) {
      return NextResponse.json({ error: 'Post not found.' }, { status: 404 });
    }
    const post = postSnap.data() || {};
    if (post.ownerId !== decoded.uid) {
      return NextResponse.json({ error: 'Only the post owner can queue auto syndication.' }, { status: 403 });
    }
    if (!post.quotePress) {
      return NextResponse.json({ error: 'This post is not an Imprint.' }, { status: 409 });
    }

    const existing = post.giphySyndication as ImprintGiphySyndication | undefined;
    if (existing?.status === 'live' && existing.giphyId) {
      return NextResponse.json({
        status: 'live',
        giphyId: existing.giphyId,
        giphyUrl: existing.giphyUrl,
        embedUrl: existing.embedUrl,
      });
    }

    const pending: ImprintGiphySyndication = {
      status: 'pending',
      submittedAt: new Date().toISOString(),
      submittedBy: decoded.uid,
      auto: true,
    };
    await postRef.set({ giphySyndication: pending }, { merge: true });

    const filename =
      typeof (file as File).name === 'string' && (file as File).name
        ? (file as File).name
        : contentType.startsWith('video/')
          ? 'imprint.webm'
          : 'imprint.png';

    const uploaded = await uploadImprintToGiphy({
      file,
      filename,
      contentType: contentType || file.type || 'image/png',
      text: text || String(post.text || ''),
      ownerName,
      sourceUrl: publicPostUrl(
        ownerSlug || (typeof post.ownerSlug === 'string' ? post.ownerSlug : undefined),
        postId
      ),
    });

    const live: ImprintGiphySyndication = {
      status: 'live',
      giphyId: uploaded.giphyId,
      giphyUrl: uploaded.giphyUrl,
      embedUrl: uploaded.embedUrl,
      submittedAt: pending.submittedAt,
      submittedBy: decoded.uid,
      auto: true,
    };
    await postRef.set({ giphySyndication: live }, { merge: true });

    return NextResponse.json({
      status: 'live',
      giphyId: uploaded.giphyId,
      giphyUrl: uploaded.giphyUrl,
      embedUrl: uploaded.embedUrl,
    });
  } catch (err) {
    console.error('[imprint-syndicate/auto]', err);
    const message = err instanceof Error ? err.message : 'Auto syndication failed.';
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
