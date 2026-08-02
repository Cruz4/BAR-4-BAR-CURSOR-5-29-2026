/**
 * When Album DNA is on, build an "already used" summary from album Creative DNA
 * plus sibling-track lyrics so generation stays in the album world without
 * cloning Track 1's themes, end-rhymes, or topic beats.
 */

import { findRepeatedWords, lineEndWord, tokenizeLine } from '@/lib/lyrics-analysis';
import type { Album, Track } from '@/lib/types';

export type AlbumAlreadyUsedPayload = {
  /** Injected into AI prompts as continuity / avoid guidance. */
  promptBlock: string;
  /** Sibling lyric lines for near-duplicate guardrails. */
  repetitionContext: string[];
  /** End rhymes already used on other tracks (hard filter on options). */
  avoidEndWords: string[];
  hasSignal: boolean;
};

const MAX_END_WORDS = 28;
const MAX_MOTIFS = 18;
const MAX_SAMPLE_LINES = 10;
const MAX_INTENTS = 12;
const MAX_REPETITION_CONTEXT = 36;

function collectTrackLines(track: Track): string[] {
  return (track.sections ?? []).flatMap((s) =>
    (s.bars ?? []).map((b) => (b.text || '').trim()).filter(Boolean)
  );
}

function uniquePreserveOrder(items: string[], max: number): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of items) {
    const key = raw.trim().toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(raw.trim());
    if (out.length >= max) break;
  }
  return out;
}

function dnaFieldSnippets(album: Album): string[] {
  const d = album.direction;
  const fields = [
    album.theme,
    album.message,
    d?.setting_world,
    d?.emotion_core,
    d?.trigger_moment,
    d?.message_truth,
    d?.tone_palette,
    ...(album.thingsToSay ?? []),
  ];
  return uniquePreserveOrder(
    fields.filter((f): f is string => typeof f === 'string' && f.trim().length > 0),
    8
  );
}

/**
 * Build album-wide avoid/vary context for the current track.
 * Returns null when there is nothing useful to inject.
 */
export function buildAlbumAlreadyUsed(
  album: Album | null | undefined,
  currentTrackId: string
): AlbumAlreadyUsedPayload | null {
  if (!album?.tracks?.length) return null;

  const siblings = album.tracks.filter((t) => t.id !== currentTrackId);
  const siblingLines = siblings.flatMap(collectTrackLines);
  const endWords = uniquePreserveOrder(
    siblingLines.map((l) => lineEndWord(l)).filter((w): w is string => !!w),
    MAX_END_WORDS
  );

  const motifs = uniquePreserveOrder(
    findRepeatedWords(siblingLines, { minCount: 2 })
      .slice(0, MAX_MOTIFS)
      .map((r) => r.word),
    MAX_MOTIFS
  );

  // Distinctive long tokens that appear even once (album catchphrases).
  if (motifs.length < MAX_MOTIFS) {
    const freq = new Map<string, number>();
    for (const line of siblingLines) {
      for (const w of tokenizeLine(line)) {
        if (w.length < 5) continue;
        freq.set(w, (freq.get(w) ?? 0) + 1);
      }
    }
    const extras = [...freq.entries()]
      .sort((a, b) => b[1] - a[1] || b[0].length - a[0].length)
      .map(([w]) => w);
    for (const w of extras) {
      if (motifs.length >= MAX_MOTIFS) break;
      if (!motifs.some((m) => m.toLowerCase() === w)) motifs.push(w);
    }
  }

  const intents = uniquePreserveOrder(
    [
      ...(album.thingsToSay ?? []),
      ...siblings.flatMap((t) => t.checkedIntents ?? []),
      ...siblings.flatMap((t) => t.intentRefs ?? []),
    ].filter((s) => typeof s === 'string' && s.trim().length > 0),
    MAX_INTENTS
  );

  const sampleLines = uniquePreserveOrder(
    // Prefer denser lines; skip very short stubs.
    siblingLines.filter((l) => tokenizeLine(l).length >= 4),
    MAX_SAMPLE_LINES
  );

  const dnaAnchors = dnaFieldSnippets(album);

  const hasSignal =
    endWords.length > 0 ||
    motifs.length > 0 ||
    intents.length > 0 ||
    sampleLines.length > 0 ||
    dnaAnchors.length > 0;

  if (!hasSignal) return null;

  const parts: string[] = [
    '**ALBUM CONTINUITY (Album DNA ON):**',
    'Stay inside the album world and emotional palette, but do NOT recycle the same concrete images, punchlines, end-rhymes, or topic beats already used on other tracks. Advance the album story — do not rewrite Track 1.',
  ];

  if (dnaAnchors.length) {
    parts.push(
      `Album DNA anchors (keep the vibe; never restate these phrases verbatim): ${dnaAnchors
        .map((a) => `"${a}"`)
        .join('; ')}.`
    );
  }
  if (endWords.length) {
    parts.push(
      `Already-used end rhymes across other tracks (do not end a new line on these): ${endWords.join(', ')}.`
    );
  }
  if (motifs.length) {
    parts.push(
      `Motifs / topics already dense on other tracks (vary imagery and angle): ${motifs.join(', ')}.`
    );
  }
  if (intents.length) {
    parts.push(
      `Intents / talking points already explored on the album (develop differently or skip): ${intents
        .map((i) => `"${i}"`)
        .join('; ')}.`
    );
  }
  if (sampleLines.length) {
    parts.push(
      'Representative sibling lines (do not paraphrase closely):',
      ...sampleLines.map((l) => `- ${l}`)
    );
  }

  const repetitionContext = uniquePreserveOrder(sampleLines, MAX_REPETITION_CONTEXT);

  return {
    promptBlock: parts.join('\n'),
    repetitionContext,
    avoidEndWords: endWords,
    hasSignal: true,
  };
}
