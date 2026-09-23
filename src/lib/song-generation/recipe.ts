import { createHash } from 'crypto';
import type { CompiledRenderRecipe } from '@/lib/song-generation/types';

export function hashRecipe(recipe: CompiledRenderRecipe): string {
  const payload = JSON.stringify({
    compilerVersion: recipe.compilerVersion,
    workKind: recipe.workKind,
    lyricsText: recipe.lyricsText,
    caption: recipe.caption,
    negativeCaption: recipe.negativeCaption,
    durationSec: recipe.durationSec,
    bpm: recipe.bpm,
    musicalKey: recipe.musicalKey,
    seed: recipe.seed,
    artistSignatureId: recipe.artistSignatureId,
    voiceMatchId: recipe.voiceMatchId,
    fieldHashes: recipe.fieldHashes,
  });
  return createHash('sha256').update(payload).digest('hex');
}

export function hashField(value: unknown): string {
  return createHash('sha256').update(JSON.stringify(value ?? null)).digest('hex').slice(0, 16);
}
