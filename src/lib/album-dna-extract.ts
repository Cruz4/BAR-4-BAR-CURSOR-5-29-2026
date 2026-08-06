/**
 * Build an ordered multi-track lyric corpus for Album DNA extraction.
 * Every track with lyrics appears; long tracks are truncated evenly to fit budget.
 */

import type { Album, Track } from '@/lib/types';

export const ALBUM_DNA_CORPUS_BUDGET = 7500;

export type AlbumDnaCorpusResult = {
  corpus: string;
  trackCount: number;
  truncated: boolean;
};

function collectTrackLines(track: Track): string[] {
  return (track.sections ?? []).flatMap((s) =>
    (s.bars ?? []).map((b) => (b.text || '').trim()).filter(Boolean)
  );
}

function trackBody(track: Track): string {
  return collectTrackLines(track).join('\n');
}

/**
 * Format album tracks in order for extractAlbumDna.
 * Throws if no tracks have lyric content.
 */
export function buildAlbumDnaCorpus(
  album: Album,
  budget = ALBUM_DNA_CORPUS_BUDGET
): AlbumDnaCorpusResult {
  const withLyrics = (album.tracks ?? [])
    .map((track, index) => {
      const body = trackBody(track);
      if (!body.trim()) return null;
      return {
        index: index + 1,
        title: (track.title || 'Untitled').trim() || 'Untitled',
        body,
      };
    })
    .filter((t): t is { index: number; title: string; body: string } => t != null);

  if (withLyrics.length === 0) {
    throw new Error('Add lyrics to at least one track before extracting Album DNA.');
  }

  const n = withLyrics.length;
  const headerOverhead = withLyrics.reduce(
    (acc, t) => acc + `TRACK ${t.index}/${album.tracks.length} — ${t.title}\n`.length + 2,
    0
  );
  const bodyBudget = Math.max(400, budget - headerOverhead);
  const perTrack = Math.max(120, Math.floor(bodyBudget / n));

  let truncated = false;
  const blocks = withLyrics.map((t) => {
    let body = t.body;
    if (body.length > perTrack) {
      truncated = true;
      body = `${body.slice(0, perTrack).trimEnd()}\n[…]`;
    }
    return `TRACK ${t.index}/${album.tracks.length} — ${t.title}\n${body}`;
  });

  let corpus = blocks.join('\n\n');
  if (corpus.length > budget) {
    truncated = true;
    corpus = `${corpus.slice(0, budget - 5).trimEnd()}\n[…]`;
  }

  return { corpus, trackCount: withLyrics.length, truncated };
}

/** True when any of the three Album DNA card fields already has text. */
export function albumDnaFieldsHaveContent(direction?: Album['direction'] | null): boolean {
  if (!direction) return false;
  return [direction.setting_world, direction.emotion_core, direction.message_truth].some(
    (v) => typeof v === 'string' && v.trim().length > 0
  );
}
