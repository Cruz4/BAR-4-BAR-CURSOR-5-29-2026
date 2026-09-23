import 'server-only';

import type { CompiledRenderRecipe } from '@/lib/song-generation/types';
import {
  getRenderAceMode,
  shouldUseLocalAceFirst,
} from '@/lib/server/render/ace-render-config';
import { renderAceStepOnFal } from '@/lib/server/render/fal-ace-step';
import { renderAceStepOnLocal } from '@/lib/server/render/local-ace-step';

export type AceRenderResult = {
  audio: Buffer;
  mime: string;
  durationSec: number;
  modelFamily: string;
  modelRevision: string;
};

/** Custom GPU worker if you host ACE yourself. */
async function tryCustomAceEndpoint(recipe: CompiledRenderRecipe): Promise<AceRenderResult | null> {
  const endpoint = process.env.RENDER_ACE_ENDPOINT?.trim();
  if (!endpoint) return null;

  const token = process.env.RENDER_ACE_TOKEN?.trim();
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(endpoint, {
    method: 'POST',
    headers,
    body: JSON.stringify({ recipe }),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(`ACE worker ${res.status}: ${detail.slice(0, 180)}`);
  }

  const mime = res.headers.get('content-type') || 'audio/wav';
  const audio = Buffer.from(await res.arrayBuffer());
  if (audio.length < 2000) throw new Error('ACE worker returned empty audio');
  const durationHeader = Number(res.headers.get('x-duration-sec'));
  return {
    audio,
    mime: mime.includes('mpeg') ? 'audio/mpeg' : 'audio/wav',
    durationSec: Number.isFinite(durationHeader) && durationHeader > 0 ? durationHeader : recipe.durationSec,
    modelFamily: res.headers.get('x-model-family') || 'ace-step',
    modelRevision: res.headers.get('x-model-revision') || '1.5.0',
  };
}

export async function renderAceSong(recipe: CompiledRenderRecipe): Promise<AceRenderResult> {
  const mode = getRenderAceMode();
  const preferLocal = await shouldUseLocalAceFirst();

  if (preferLocal) {
    try {
      return await renderAceStepOnLocal(recipe);
    } catch (err) {
      console.warn('[ace-step] local render unavailable', err);
      if (mode === 'local' && !(await canUseStudioCloudAce())) {
        throw err instanceof Error ? err : new Error(String(err));
      }
    }
  }

  const custom = await tryCustomAceEndpoint(recipe);
  if (custom) return custom;

  if (await canUseStudioCloudAce()) {
    return renderAceStepOnFal(recipe);
  }

  throw new Error(
    'No song engine available. At your desk: npm run render:local-ace (free GPU). Away / PC off: use the live site with Song generation on — studio cloud uses your Firestore fal key. Or set RENDER_ACE_MODE=auto in .env.local.'
  );
}

async function canUseStudioCloudAce(): Promise<boolean> {
  const { resolveFalApiKey } = await import('@/lib/server/render/fal-config');
  return Boolean(await resolveFalApiKey());
}
