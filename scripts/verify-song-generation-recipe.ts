import type { Album, Track } from '../src/lib/types';
import {
  compileInstrumentalRenderRecipe,
  compileSongRenderRecipe,
  minimumLyricsForSongRender,
} from '../src/lib/song-generation/prompt-compiler';
import { hashRecipe } from '../src/lib/song-generation/recipe';

const baseTrack = (): Track => ({
  id: 't1',
  albumId: 'a1',
  ownerId: 'u1',
  title: 'Test',
  vibe: { enabled: true, genre: 'R&B', tempoBPM: 92, feeling: ['warm'], productionNotes: 'dry vox' },
  intentRefs: [],
  sections: [
    {
      id: 's1',
      type: 'verse',
      bars: Array.from({ length: 8 }, (_, i) => ({
        idx: i + 1,
        text: `Line ${i + 1} of the verse keeps going`,
        accepted: true,
        rhymeKey: 'a',
        syllables: 8,
      })),
    },
  ],
  status: 'in_progress',
  createdAt: new Date().toISOString(),
  styleEnabled: true,
});

const album: Album = {
  id: 'a1',
  ownerId: 'u1',
  title: 'Album',
  theme: 'night drive',
  createdAt: new Date().toISOString(),
  tracks: [],
  direction: { enabled: true, emotion_core: 'hope after rain' },
};

if (!minimumLyricsForSongRender(baseTrack())) {
  throw new Error('expected minimum lyrics');
}

const song = compileSongRenderRecipe({ track: baseTrack(), album });
if (!song.lyricsText.includes('[Verse]')) throw new Error('missing section tags');
const h1 = hashRecipe(song);
const h2 = hashRecipe(song);
if (h1 !== h2) throw new Error('recipe hash unstable');

const instrumental = compileInstrumentalRenderRecipe({
  track: { ...baseTrack(), workKind: 'instrumental', sections: [] },
  album,
});
if (instrumental.lyricsText) throw new Error('instrumental must not include lyrics');
if (!instrumental.negativeCaption.toLowerCase().includes('vocal')) {
  throw new Error('instrumental negative must block vocals');
}
if (instrumental.rails.styleDna) throw new Error('instrumental omits style DNA');

console.log('verify-song-generation-recipe: ok');
