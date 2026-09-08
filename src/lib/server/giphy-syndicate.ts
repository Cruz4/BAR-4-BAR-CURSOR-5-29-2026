import 'server-only';

export type GiphySyndicationResult = {
  giphyId: string;
  giphyUrl: string;
  embedUrl?: string;
};

export type ImprintGiphySyndication = {
  status: 'pending' | 'live' | 'failed';
  giphyId?: string;
  giphyUrl?: string;
  embedUrl?: string;
  submittedAt?: string;
  submittedBy?: string;
  error?: string;
  auto?: boolean;
};

function giphyApiKey(): string | null {
  const key = process.env.GIPHY_API_KEY?.trim();
  return key || null;
}

export function imprintSyndicationEnabled(): boolean {
  return Boolean(giphyApiKey());
}

export function imprintAutoSyndicationEnabled(): boolean {
  return imprintSyndicationEnabled() && process.env.IMPRINT_AUTO_SYNDICATE === '1';
}

function buildImprintTags(text: string, ownerName?: string): string {
  const words = text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 3)
    .slice(0, 6);
  const base = ['akasheet', 'lyrics', 'songwriting', 'hiphop', 'rap', 'quote'];
  if (ownerName) base.push(ownerName.toLowerCase().replace(/\s+/g, ''));
  return [...new Set([...base, ...words])].slice(0, 12).join(',');
}

export async function uploadImprintToGiphy(input: {
  file: Blob;
  filename: string;
  contentType: string;
  text: string;
  ownerName?: string;
  sourceUrl?: string;
}): Promise<GiphySyndicationResult> {
  const apiKey = giphyApiKey();
  if (!apiKey) {
    throw new Error('GIPHY_API_KEY is not configured.');
  }

  const buffer = Buffer.from(await input.file.arrayBuffer());
  const form = new FormData();
  form.append('api_key', apiKey);
  form.append('file', new Blob([buffer], { type: input.contentType }), input.filename);
  form.append('tags', buildImprintTags(input.text, input.ownerName));
  if (input.sourceUrl) form.append('source_post_url', input.sourceUrl);
  const username = process.env.GIPHY_USERNAME?.trim();
  if (username) form.append('username', username);

  const res = await fetch('https://upload.giphy.com/v1/gifs', {
    method: 'POST',
    body: form,
  });

  const json = (await res.json().catch(() => ({}))) as {
    data?: { id?: string; url?: string; embed_url?: string };
    meta?: { status?: number; msg?: string };
  };

  if (!res.ok) {
    const msg = json.meta?.msg || `Giphy upload failed (${res.status}).`;
    throw new Error(msg);
  }

  const id = json.data?.id;
  const url = json.data?.url;
  if (!id || !url) {
    throw new Error('Giphy upload returned an unexpected response.');
  }

  return {
    giphyId: id,
    giphyUrl: url,
    embedUrl: typeof json.data?.embed_url === 'string' ? json.data.embed_url : undefined,
  };
}
