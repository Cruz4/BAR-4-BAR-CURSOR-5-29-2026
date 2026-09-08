import { auth } from '@/lib/firebase/client/firebase';
import type { ProfilePost } from '@/lib/profile/social-client';
import {
  captureImprintLoop,
  captureImprintNodeToCanvas,
  imprintExportFilename,
} from '@/lib/profile/imprint-capture';

export type SyndicateImprintResult = {
  status: 'live' | 'failed';
  giphyId?: string;
  giphyUrl?: string;
  embedUrl?: string;
  error?: string;
};

async function authHeader(): Promise<Record<string, string>> {
  const user = auth.currentUser;
  if (!user) throw new Error('Sign in required.');
  const token = await user.getIdToken();
  return { Authorization: `Bearer ${token}` };
}

function syndicateEndpoint(auto: boolean): string {
  return auto ? '/api/imprint-syndicate/auto' : '/api/admin/imprint-syndicate';
}

export async function syndicateImprintPost(input: {
  post: Pick<ProfilePost, 'id' | 'text' | 'ownerName' | 'ownerSlug'>;
  captureRoot: HTMLElement;
  auto?: boolean;
  preferLoop?: boolean;
}): Promise<SyndicateImprintResult> {
  const preferLoop = input.preferLoop ?? true;
  let blob: Blob;
  let filename: string;
  let contentType: string;

  if (preferLoop) {
    try {
      blob = await captureImprintLoop(input.captureRoot, { durationSec: 4.5, fps: 12 });
      filename = imprintExportFilename(input.post.text, 'webm');
      contentType = blob.type || 'video/webm';
    } catch {
      const canvas = await captureImprintNodeToCanvas(input.captureRoot);
      filename = imprintExportFilename(input.post.text, 'png');
      contentType = 'image/png';
      blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Could not encode PNG.'))), 'image/png');
      });
    }
  } else {
    const canvas = await captureImprintNodeToCanvas(input.captureRoot);
    filename = imprintExportFilename(input.post.text, 'png');
    contentType = 'image/png';
    blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Could not encode PNG.'))), 'image/png');
    });
  }

  const form = new FormData();
  form.append('postId', input.post.id);
  form.append('file', blob, filename);
  form.append('contentType', contentType);
  form.append('ownerName', input.post.ownerName || 'Artist');
  if (input.post.ownerSlug) form.append('ownerSlug', input.post.ownerSlug);
  form.append('text', input.post.text);

  const res = await fetch(syndicateEndpoint(Boolean(input.auto)), {
    method: 'POST',
    headers: await authHeader(),
    body: form,
  });

  const json = (await res.json().catch(() => ({}))) as SyndicateImprintResult & { error?: string };
  if (!res.ok) {
    throw new Error(json.error || 'Could not syndicate imprint to Giphy.');
  }
  return json;
}

export function autoImprintSyndicationEnabled(): boolean {
  return process.env.NEXT_PUBLIC_IMPRINT_AUTO_SYNDICATE === '1';
}

/** Platform-owned background syndication — no user-facing UI. */
export async function queueAutoImprintSyndication(input: {
  post: ProfilePost;
  captureRoot: HTMLElement | null;
}): Promise<void> {
  if (!autoImprintSyndicationEnabled() || !input.post.quotePress || !input.captureRoot) return;
  try {
    await syndicateImprintPost({
      post: input.post,
      captureRoot: input.captureRoot,
      auto: true,
      preferLoop: true,
    });
  } catch (err) {
    console.warn('[imprint-syndicate:auto]', err);
  }
}
