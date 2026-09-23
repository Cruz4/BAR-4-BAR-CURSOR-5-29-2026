import { mergeDirection } from '@/lib/utils';
import type { Album, StyleProfile, Track, TrackSection } from '@/lib/types';
import {
  RENDER_COMPILER_VERSION,
  type CompileInstrumentalInput,
  type CompileSongInput,
  type CompiledRenderRecipe,
  type RenderRecipeRails,
} from '@/lib/song-generation/types';
import { hashField } from '@/lib/song-generation/recipe';

const DEFAULT_DURATION_SEC = 240;
const MAX_CAPTION_CHARS = 1200;

const SECTION_LABEL: Record<TrackSection['type'], string> = {
  intro: 'Intro',
  verse: 'Verse',
  hook: 'Hook',
  chorus: 'Chorus',
  bridge: 'Bridge',
  pre: 'Pre-Chorus',
  outro: 'Outro',
};

function isVibeActive(track: Track): boolean {
  return Boolean(track.vibe?.enabled ?? track.vibe?.genre);
}

function isStyleActive(track: Track): boolean {
  return track.styleEnabled !== false && Boolean(track.styleEnabled);
}

function isDnaActive(track: Track, album: Album): boolean {
  const td = track.direction;
  if (td?.enabled === false) return false;
  if (td?.inheritFromAlbum === false) {
    return Boolean(td?.setting_world || td?.emotion_core || td?.message_truth);
  }
  const merged = mergeDirection(album.direction, track.direction);
  return Boolean(merged.setting_world || merged.emotion_core || merged.message_truth);
}

function flattenLyrics(track: Track): string {
  const lines: string[] = [];
  for (const section of track.sections) {
    const label = SECTION_LABEL[section.type] ?? 'Section';
    const barTexts = section.bars
      .map((b) => b.text?.trim())
      .filter((t) => t && t.length > 0);
    if (barTexts.length === 0) continue;
    lines.push(`[${label}]`);
    lines.push(barTexts.join('\n'));
  }
  return lines.join('\n').trim();
}

function truncateCaption(text: string): string {
  if (text.length <= MAX_CAPTION_CHARS) return text;
  return `${text.slice(0, MAX_CAPTION_CHARS - 3)}...`;
}

function buildVibeCaption(track: Track): string {
  const v = track.vibe;
  if (!v) return '';
  const parts: string[] = [];
  if (v.genre) parts.push(`Genre: ${v.genre}`);
  if (v.tempoBPM) parts.push(`BPM: ${v.tempoBPM}`);
  if (v.feeling?.length) parts.push(`Feel: ${v.feeling.join(', ')}`);
  if (v.instrumentation) parts.push(`Instruments: ${v.instrumentation}`);
  if (v.productionNotes) parts.push(`Production: ${v.productionNotes}`);
  return parts.join('. ');
}

function buildStyleCaption(styleProfile?: StyleProfile | null): string {
  const latest = styleProfile?.history?.[0];
  if (!latest?.analysis) return '';
  const metrics = latest.metrics;
  const cadence = metrics?.cadenceMap ? ` Cadence: ${metrics.cadenceMap}.` : '';
  return `Vocal delivery & phrasing: ${latest.analysis}${cadence}`;
}

function buildDnaCaption(album: Album, track: Track): string {
  const merged = mergeDirection(album.direction, track.direction);
  const parts: string[] = [];
  if (merged.setting_world) parts.push(`World: ${merged.setting_world}`);
  if (merged.emotion_core) parts.push(`Emotion arc: ${merged.emotion_core}`);
  if (merged.trigger_moment) parts.push(`Turn: ${merged.trigger_moment}`);
  if (merged.message_truth) parts.push(`Truth: ${merged.message_truth}`);
  if (merged.tone_palette) parts.push(`Tone palette: ${merged.tone_palette}`);
  return parts.join('. ');
}

function buildIntentsCaption(track: Track, album: Album): string {
  if (track.intentsEnabled === false) return '';
  const checked = new Set(track.checkedIntents ?? []);
  if (!checked.size) return '';
  const refs = album.thingsToSay ?? [];
  const picked = track.intentRefs
    .map((id, i) => ({ id, text: refs[i] }))
    .filter((x) => checked.has(x.id) && x.text)
    .map((x) => x.text);
  return picked.length ? `Section emphasis: ${picked.join('; ')}` : '';
}

function buildGuardrails(track: Track): { negative: string; constraints: string } {
  const g = track.guardrails;
  if (!g?.enabled) return { negative: '', constraints: '' };
  const neg: string[] = [];
  if (g.negativePrompt) neg.push(g.negativePrompt);
  if (g.forbiddenWords?.length) neg.push(`Avoid words: ${g.forbiddenWords.join(', ')}`);
  const must = g.mustIncludeWords?.length
    ? `Must include ideas: ${g.mustIncludeWords.join(', ')}`
    : '';
  return { negative: neg.join('. '), constraints: must };
}

export function minimumLyricsForSongRender(track: Track): boolean {
  const text = flattenLyrics(track);
  return text.replace(/\[[^\]]+\]/g, '').trim().length >= 40;
}

export function compileSongRenderRecipe(input: CompileSongInput): CompiledRenderRecipe {
  const { track, album, styleProfile, durationSec = DEFAULT_DURATION_SEC, seed, artistSignatureId } =
    input;

  const lyricsText = flattenLyrics(track);
  if (!minimumLyricsForSongRender(track)) {
    throw new Error('Sheet needs approved lyrics before song render.');
  }

  const rails: RenderRecipeRails = {
    vibe: isVibeActive(track),
    styleDna: isStyleActive(track),
    dnaSuite: isDnaActive(track, album),
    intents: track.intentsEnabled !== false,
    guardrails: Boolean(track.guardrails?.enabled),
    specialInstructions: Boolean(track.specialInstructions?.trim()),
  };

  const captionParts: string[] = [];
  if (rails.vibe) captionParts.push(buildVibeCaption(track));
  if (rails.styleDna) captionParts.push(buildStyleCaption(styleProfile));
  if (rails.dnaSuite) captionParts.push(buildDnaCaption(album, track));
  if (rails.intents) captionParts.push(buildIntentsCaption(track, album));
  if (rails.specialInstructions && track.specialInstructions) {
    captionParts.push(`Artist notes: ${track.specialInstructions.trim()}`);
  }

  const { negative, constraints } = rails.guardrails
    ? buildGuardrails(track)
    : { negative: '', constraints: '' };
  if (constraints) captionParts.push(constraints);

  const caption = truncateCaption(
    captionParts.filter(Boolean).join('\n\n') || 'Contemporary studio production matching the lyric sheet.'
  );

  const negativeCaption = truncateCaption(
    negative || 'low quality, noise, clipping, off-key vocals'
  );

  const recipe: CompiledRenderRecipe = {
    compilerVersion: RENDER_COMPILER_VERSION,
    workKind: 'song',
    rails,
    lyricsText,
    caption,
    negativeCaption,
    durationSec,
    ...(typeof track.vibe?.tempoBPM === 'number' && track.vibe.tempoBPM > 0
      ? { bpm: track.vibe.tempoBPM }
      : {}),
    ...(typeof seed === 'number' ? { seed } : {}),
    artistSignatureId: artistSignatureId ?? null,
    voiceMatchId: null,
    fieldHashes: {
      lyrics: hashField(lyricsText),
      vibe: hashField(rails.vibe ? track.vibe : null),
      style: hashField(rails.styleDna ? styleProfile?.history?.[0] : null),
      dna: hashField(rails.dnaSuite ? mergeDirection(album.direction, track.direction) : null),
      intents: hashField(rails.intents ? track.checkedIntents : null),
      guardrails: hashField(rails.guardrails ? track.guardrails : null),
      special: hashField(rails.specialInstructions ? track.specialInstructions : null),
    },
    rawSnapshot: {
      trackId: track.id,
      albumId: album.id,
      title: track.title,
    },
  };

  return recipe;
}

export function compileInstrumentalRenderRecipe(
  input: CompileInstrumentalInput
): CompiledRenderRecipe {
  const { track, album, durationSec = DEFAULT_DURATION_SEC, seed, musicStyleSignatureId } = input;

  const rails: RenderRecipeRails = {
    vibe: isVibeActive(track),
    styleDna: false,
    dnaSuite: isDnaActive(track, album),
    intents: false,
    guardrails: Boolean(track.guardrails?.enabled),
    specialInstructions: Boolean(track.specialInstructions?.trim()),
  };

  const captionParts: string[] = [
    'Instrumental only. No lead vocals, backing vocals, spoken words, or lyrical content.',
  ];
  if (rails.vibe) captionParts.push(buildVibeCaption(track));
  if (rails.dnaSuite) captionParts.push(buildDnaCaption(album, track));
  if (rails.specialInstructions && track.specialInstructions) {
    captionParts.push(`Production notes: ${track.specialInstructions.trim()}`);
  }

  const { negative } = rails.guardrails
    ? buildGuardrails(track)
    : { negative: '' };
  const negativeCaption = truncateCaption(
    [negative, 'vocals, singing, speech, lyrics, rap, chanting'].filter(Boolean).join('. ')
  );

  return {
    compilerVersion: RENDER_COMPILER_VERSION,
    workKind: 'instrumental',
    rails,
    lyricsText: '',
    caption: truncateCaption(captionParts.join('\n\n')),
    negativeCaption,
    durationSec,
    ...(typeof track.vibe?.tempoBPM === 'number' && track.vibe.tempoBPM > 0
      ? { bpm: track.vibe.tempoBPM }
      : {}),
    ...(typeof seed === 'number' ? { seed } : {}),
    artistSignatureId: musicStyleSignatureId ?? null,
    voiceMatchId: null,
    fieldHashes: {
      vibe: hashField(rails.vibe ? track.vibe : null),
      dna: hashField(rails.dnaSuite ? mergeDirection(album.direction, track.direction) : null),
      guardrails: hashField(rails.guardrails ? track.guardrails : null),
      special: hashField(rails.specialInstructions ? track.specialInstructions : null),
    },
    rawSnapshot: {
      trackId: track.id,
      albumId: album.id,
      title: track.title,
      instrumental: true,
    },
  };
}
