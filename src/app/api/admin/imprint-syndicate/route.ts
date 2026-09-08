import { NextResponse } from 'next/server';
import { getDb } from '@/lib/firebase/server';
import { AdminAuthError, verifyAdminRequest } from '@/lib/server/admin-auth';
import {
  imprintSyndicationEnabled,
  uploadImprintToGiphy,
  type ImprintGiphySyndication,
} from '@/lib/server/giphy-syndicate';

export const runtime = 'nodejs';

const MAX_BYTES = 14 * 1024 * 1024;

function publicPostUrl(slug: string | undefined, postId: string): string {
  const base = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') || 'https://akasheet.com';
  return slug ? `${base}/${slug}?post=${postId}` : `${base}/scene?post=${postId}`;
}

async function handleSyndicate(
  req: Request,
  admin: { uid: string; email: string },
  auto: boolean
) {
  if (!imprintSyndicationEnabled()) {
    return NextResponse.json(
      { error: 'Giphy syndication is not configured (set GIPHY_API_KEY).' },
      { status: 503 }
    );
  }

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
    submittedBy: admin.uid,
    auto,
  };
  await postRef.set({ giphySyndication: pending }, { merge: true });

  const filename =
    typeof (file as File).name === 'string' && (file as File).name
      ? (file as File).name
      : contentType.startsWith('video/')
        ? 'imprint.webm'
        : 'imprint.png';

  try {
    const uploaded = await uploadImprintToGiphy({
      file,
      filename,
      contentType: contentType || file.type || 'image/png',
      text: text || String(post.text || ''),
      ownerName,
      sourceUrl: publicPostUrl(ownerSlug || (typeof post.ownerSlug === 'string' ? post.ownerSlug : undefined), postId),
    });

    const live: ImprintGiphySyndication = {
      status: 'live',
      giphyId: uploaded.giphyId,
      giphyUrl: uploaded.giphyUrl,
      embedUrl: uploaded.embedUrl,
      submittedAt: pending.submittedAt,
      submittedBy: admin.uid,
      auto,
    };
    await postRef.set({ giphySyndication: live }, { merge: true });

    return NextResponse.json({
      status: 'live',
      giphyId: uploaded.giphyId,
      giphyUrl: uploaded.giphyUrl,
      embedUrl: uploaded.embedUrl,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Giphy upload failed.';
    const failed: ImprintGiphySyndication = {
      status: 'failed',
      submittedAt: pending.submittedAt,
      submittedBy: admin.uid,
      auto,
      error: message.slice(0, 240),
    };
    await postRef.set({ giphySyndication: failed }, { merge: true });
    return NextResponse.json({ status: 'failed', error: message }, { status: 502 });
  }
}

export async function POST(req: Request) {
  try {
    const admin = await verifyAdminRequest(req);
    return await handleSyndicate(req, admin, false);
  } catch (err) {
    if (err instanceof AdminAuthError) {
      return NextResponse.json({ error: err.message }, { status: 403 });
    }
    console.error('[admin/imprint-syndicate]', err);
    return NextResponse.json({ error: 'Syndication failed.' }, { status: 500 });
  }
}
