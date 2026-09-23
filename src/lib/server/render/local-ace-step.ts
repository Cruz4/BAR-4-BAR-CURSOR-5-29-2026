import 'server-only';

import type { CompiledRenderRecipe } from '@/lib/song-generation/types';
import {
  toAceDurationSec,
  toAceLyrics,
  toAceTags,
} from '@/lib/song-generation/ace-step-payload';
import type { AceRenderResult } from '@/lib/server/render/ace-client';
import {
  getLocalAceApiKey,
  getLocalAceBaseUrl,
} from '@/lib/server/render/ace-render-config';

type AceApiEnvelope<T> = {
  data?: T;
  code?: number;
  error?: string | null;
};

type ReleaseTaskData = {
  task_id?: string;
};

type QueryRow = {
  task_id?: string;
  status?: number;
  result?: string;
};

type ParsedResultItem = {
  file?: string;
  status?: number;
};

function localAceHeaders(): Record<string, string> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const key = getLocalAceApiKey();
  if (key) headers.Authorization = `Bearer ${key}`;
  return headers;
}

const LOCAL_ACE_OFFLINE =
  'Local ACE-Step is not running. Open a second terminal, run npm run render:local-ace, wait until models load, then Generate again.';

function isAceConnectionError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  const cause = err instanceof Error && err.cause instanceof Error ? err.cause.message : '';
  const blob = `${msg} ${cause}`.toLowerCase();
  return (
    blob.includes('fetch failed') ||
    blob.includes('econnrefused') ||
    blob.includes('enotfound') ||
    blob.includes('socket hang up')
  );
}

async function localAceFetch(path: string, init?: RequestInit): Promise<Response> {
  const url = `${getLocalAceBaseUrl()}${path.startsWith('/') ? path : `/${path}`}`;
  try {
    return await fetch(url, {
      ...init,
      headers: { ...localAceHeaders(), ...(init?.headers as Record<string, string> | undefined) },
    });
  } catch (err) {
    if (isAceConnectionError(err)) throw new Error(LOCAL_ACE_OFFLINE);
    throw err;
  }
}

function resolveAudioUrl(fileRef: string): string {
  if (fileRef.startsWith('http://') || fileRef.startsWith('https://')) return fileRef;
  const base = getLocalAceBaseUrl();
  return fileRef.startsWith('/') ? `${base}${fileRef}` : `${base}/${fileRef}`;
}

async function pollLocalAceTask(taskId: string): Promise<string> {
  const deadline = Date.now() + 25 * 60_000;
  while (Date.now() < deadline) {
    const res = await localAceFetch('/query_result', {
      method: 'POST',
      body: JSON.stringify({ task_id_list: [taskId] }),
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      throw new Error(`Local ACE query ${res.status}: ${detail.slice(0, 180)}`);
    }
    const envelope = (await res.json()) as AceApiEnvelope<QueryRow[]>;
    const row = envelope.data?.[0];
    const status = row?.status;
    if (status === 2) {
      throw new Error('Local ACE-Step failed to generate this sheet.');
    }
    if (status === 1 && row?.result) {
      let items: ParsedResultItem[] = [];
      try {
        items = JSON.parse(row.result) as ParsedResultItem[];
      } catch {
        throw new Error('Local ACE returned invalid result JSON.');
      }
      const file = items.find((i) => i.status === 1 && i.file)?.file;
      if (file) return file;
    }
    await new Promise((r) => setTimeout(r, 3000));
  }
  throw new Error('Local ACE-Step timed out. Keep the API server running and try again.');
}

/** Free local ACE-Step 1.5 API (`uv run acestep-api` on port 8001). */
export async function renderAceStepOnLocal(recipe: CompiledRenderRecipe): Promise<AceRenderResult> {
  const lyrics = toAceLyrics(recipe.lyricsText, recipe.workKind);
  const duration = toAceDurationSec(recipe);
  const body: Record<string, unknown> = {
    prompt: toAceTags(recipe),
    lyrics,
    audio_duration: duration,
    task_type: 'text2music',
    thinking: true,
    inference_steps: 8,
    audio_format: 'mp3',
    vocal_language: 'en',
    batch_size: 1,
  };
  if (typeof recipe.seed === 'number') {
    body.use_random_seed = false;
    body.seed = recipe.seed;
  }
  if (recipe.bpm) body.bpm = Math.round(recipe.bpm);

  console.info('[ace-step/local] release_task', {
    duration,
    lyricChars: lyrics.length,
    base: getLocalAceBaseUrl(),
  });

  const submit = await localAceFetch('/release_task', {
    method: 'POST',
    body: JSON.stringify(body),
  });
  if (!submit.ok) {
    const detail = await submit.text().catch(() => '');
    if (submit.status === 0 || detail.includes('ECONNREFUSED')) {
      throw new Error(
        'Local ACE-Step API is not running. In a second terminal run: npm run render:local-ace'
      );
    }
    throw new Error(`Local ACE submit ${submit.status}: ${detail.slice(0, 220)}`);
  }

  const queued = (await submit.json()) as AceApiEnvelope<ReleaseTaskData>;
  const taskId = queued.data?.task_id;
  if (!taskId) {
    throw new Error(queued.error || 'Local ACE did not return a task id.');
  }

  const fileRef = await pollLocalAceTask(taskId);
  const audioUrl = resolveAudioUrl(fileRef);
  const audioRes = await fetch(audioUrl, { headers: localAceHeaders() });
  if (!audioRes.ok) throw new Error(`Could not download local ACE audio (${audioRes.status}).`);
  const audio = Buffer.from(await audioRes.arrayBuffer());
  if (audio.length < 2000) throw new Error('Local ACE returned empty audio.');

  const mime = audioRes.headers.get('content-type')?.includes('mpeg')
    ? 'audio/mpeg'
    : 'audio/mpeg';

  console.info('[ace-step/local] audio ready', { bytes: audio.length, duration });
  return {
    audio,
    mime,
    durationSec: duration,
    modelFamily: 'ace-step',
    modelRevision: 'local-acestep-api-1.5',
  };
}
