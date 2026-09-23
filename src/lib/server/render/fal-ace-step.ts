import 'server-only';

import type { CompiledRenderRecipe } from '@/lib/song-generation/types';
import {
  toAceDurationSec,
  toAceLyrics,
  toAceTags,
} from '@/lib/song-generation/ace-step-payload';
import type { AceRenderResult } from '@/lib/server/render/ace-client';
import { resolveFalApiKey } from '@/lib/server/render/fal-config';

export { isFalAceConfigured } from '@/lib/server/render/fal-config';
export {
  isAceRenderConfiguredAsync as isFalAceConfiguredAsync,
  isAceRenderConfiguredSync,
} from '@/lib/server/render/ace-render-config';

type FalQueueSubmit = {
  request_id: string;
  status_url?: string;
  response_url?: string;
};

type FalStatus = {
  status?: string;
};

type FalResult = {
  audio?: { url?: string; content_type?: string } | string;
  seed?: number;
};

async function falFetch(url: string, init?: RequestInit): Promise<Response> {
  const key = await resolveFalApiKey();
  if (!key) throw new Error('FAL_KEY is not set — ACE-Step cannot generate a song.');
  const headers: Record<string, string> = {
    Authorization: `Key ${key}`,
    ...(init?.headers as Record<string, string> | undefined),
  };
  if (init?.body && !headers['Content-Type'] && !headers['content-type']) {
    headers['Content-Type'] = 'application/json';
  }
  return fetch(url, { ...init, headers });
}

async function pollFalResult(submit: FalQueueSubmit): Promise<FalResult> {
  const requestId = submit.request_id;
  const statusUrl =
    submit.status_url || `https://queue.fal.run/fal-ai/ace-step/requests/${requestId}/status`;
  const resultUrl =
    submit.response_url || `https://queue.fal.run/fal-ai/ace-step/requests/${requestId}`;
  const deadline = Date.now() + 12 * 60_000;

  while (Date.now() < deadline) {
    const statusRes = await falFetch(statusUrl);
    if (!statusRes.ok) {
      const detail = await statusRes.text().catch(() => '');
      throw new Error(`ACE queue status ${statusRes.status}: ${detail.slice(0, 180)}`);
    }
    const status = (await statusRes.json()) as FalStatus;
    const phase = String(status.status || '').toUpperCase();
    if (phase === 'COMPLETED') {
      const resultRes = await falFetch(resultUrl);
      if (!resultRes.ok) {
        throw new Error(`ACE result ${resultRes.status}`);
      }
      return (await resultRes.json()) as FalResult;
    }
    if (phase === 'FAILED') {
      throw new Error('ACE-Step failed to generate this sheet.');
    }
    await new Promise((r) => setTimeout(r, 2500));
  }
  throw new Error('ACE-Step timed out. Try generate again.');
}

async function downloadAudio(url: string): Promise<{ audio: Buffer; mime: string }> {
  const res = await fetch(url);
  if (!res.ok) throw new Error('Could not download ACE audio.');
  const audio = Buffer.from(await res.arrayBuffer());
  if (audio.length < 2000) throw new Error('ACE returned empty audio.');
  const mime = res.headers.get('content-type') || 'audio/wav';
  return {
    audio,
    mime: mime.includes('mpeg') ? 'audio/mpeg' : mime.includes('mp4') ? 'audio/mp4' : 'audio/wav',
  };
}

/** Hosted ACE-Step: full song from sheet lyrics. No local Python. No synth fallback. */
export async function renderAceStepOnFal(recipe: CompiledRenderRecipe): Promise<AceRenderResult> {
  const lyrics = toAceLyrics(recipe.lyricsText, recipe.workKind);
  const duration = toAceDurationSec(recipe);
  const body = {
    tags: toAceTags(recipe),
    lyrics,
    duration,
    number_of_steps: 27,
    scheduler: 'euler',
    guidance_type: 'apg',
    lyric_guidance_scale: 2.5,
    tag_guidance_scale: 5,
    guidance_scale: 15,
    ...(typeof recipe.seed === 'number' ? { seed: recipe.seed } : {}),
  };

  console.info('[ace-step] submitting fal-ai/ace-step', {
    duration,
    lyricChars: lyrics.length,
    tags: body.tags.slice(0, 80),
  });

  const submit = await falFetch('https://queue.fal.run/fal-ai/ace-step', {
    method: 'POST',
    body: JSON.stringify(body),
  });
  if (!submit.ok) {
    const detail = await submit.text().catch(() => '');
    throw new Error(`ACE-Step submit ${submit.status}: ${detail.slice(0, 220)}`);
  }
  const queued = (await submit.json()) as FalQueueSubmit;
  if (!queued.request_id) throw new Error('ACE-Step did not return a request id.');

  const result = await pollFalResult(queued);
  const audioUrl = typeof result.audio === 'string' ? result.audio : result.audio?.url;
  if (!audioUrl) throw new Error('ACE-Step finished without an audio file.');

  const { audio, mime } = await downloadAudio(audioUrl);
  console.info('[ace-step] audio ready', { bytes: audio.length, mime, duration });
  return {
    audio,
    mime,
    durationSec: duration,
    modelFamily: 'ace-step',
    modelRevision: 'fal-ai/ace-step',
  };
}
