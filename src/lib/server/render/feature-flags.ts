import 'server-only';

import { getProductSurfaces } from '@/lib/server/product-surfaces';
import {
  isSongGenerationSurfaceLive,
  type SongGenerationSurfaces,
} from '@/lib/product-surface-modes';
export async function getSongGenerationSurfaces(): Promise<SongGenerationSurfaces> {
  const surfaces = await getProductSurfaces();
  return {
    songGeneration: surfaces.songGeneration,
    cloudRendering: surfaces.cloudRendering,
    artistSignature: surfaces.artistSignature,
    voiceMatch: surfaces.voiceMatch,
    stemsMidi: surfaces.stemsMidi,
  };
}

export async function assertSongGenerationEnabled(): Promise<void> {
  const { songGeneration } = await getSongGenerationSurfaces();
  if (!isSongGenerationSurfaceLive(songGeneration)) {
    throw new Response(JSON.stringify({ error: 'Song generation is not enabled.' }), { status: 403 });
  }
}
