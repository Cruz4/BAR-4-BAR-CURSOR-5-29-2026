import 'server-only';

import type { CompiledRenderRecipe } from '@/lib/song-generation/types';
import { renderAceSong } from '@/lib/server/render/ace-client';

export type RenderedTakeAudio = {
  audio: Buffer;
  mime: string;
  durationSec: number;
  modelFamily: string;
  modelRevision: string;
  source: 'ace';
};

export async function renderTakeAudio(recipe: CompiledRenderRecipe): Promise<RenderedTakeAudio> {
  const ace = await renderAceSong(recipe);
  return { ...ace, source: 'ace' };
}
