/**
 * Album motif ledger — promises (thingsToSay, vault motifs) vs what lyrics actually use.
 * "Open" means nowhere on the album yet — not "repeat this word on track 7."
 */

import { tokenizeLine } from '@/lib/lyrics-analysis';
import type { Album, Track } from '@/lib/types';

export type MotifDebtStatus = 'open' | 'elsewhere' | 'here';

export type AlbumMotifDebt = {
  motif: string;
  status: MotifDebtStatus;
  /** Track titles where lyrics touch this motif. */
  trackTitles: string[];
};

const MAX_PROMISES = 32;

function uniquePreserveOrder(items: string[], max: number): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of items) {
    const trimmed = raw.replace(/\s+/g, ' ').trim();
    const key = trimmed.toLowerCase();
    if (!trimmed || seen.has(key)) continue;
    seen.add(key);
    out.push(trimmed);
    if (out.length >= max) break;
  }
  return out;
}

export function collectTrackLyricLines(track: Track): string[] {
  return (track.sections ?? [])
    .flatMap((s) => (s.bars ?? []).map((b) => (b.text || '').trim()))
    .filter(Boolean);
}

/** True when the motif's words show up in the lyric corpus (phrase or strong token overlap). */
export function motifTouchesLyrics(motif: string, lines: string[]): boolean {
  const m = motif.replace(/\s+/g, ' ').trim().toLowerCase();
  if (!m || lines.length === 0) return false;
  const corpus = lines.join(' ').toLowerCase();
  if (corpus.includes(m)) return true;

  const tokens = tokenizeLine(m).filter((t) => t.length > 2);
  if (tokens.length === 0) return false;
  if (tokens.length === 1) return corpus.includes(tokens[0]);
  const hits = tokens.filter((t) => corpus.includes(t));
  return hits.length >= Math.ceil(tokens.length * 0.6);
}

/** Album-level motif promises — not auto-mined from random lyric repeats. */
export function collectAlbumMotifPromises(album: Album | null | undefined): string[] {
  if (!album) return [];
  const raw: string[] = [];
  for (const t of album.thingsToSay ?? []) {
    if (typeof t === 'string' && t.trim()) raw.push(t);
  }
  for (const preset of album.dnaPresets ?? []) {
    if (preset.intents?.length) raw.push(...preset.intents);
    const motifs = preset.analysis?.motifs;
    if (Array.isArray(motifs)) {
      for (const item of motifs) {
        if (typeof item === 'string' && item.trim()) raw.push(item);
      }
    }
  }
  return uniquePreserveOrder(raw, MAX_PROMISES);
}

export function computeAlbumMotifDebts(
  album: Album | null | undefined,
  currentTrackId: string
): AlbumMotifDebt[] {
  const promises = collectAlbumMotifPromises(album);
  if (!promises.length || !album?.tracks?.length) return [];

  const trackRows = album.tracks.map((track) => ({
    id: track.id,
    title: (track.title || 'Untitled').trim() || 'Untitled',
    lines: collectTrackLyricLines(track),
  }));

  return promises.map((motif) => {
    const hits = trackRows.filter((row) => motifTouchesLyrics(motif, row.lines));
    const onCurrent = hits.some((row) => row.id === currentTrackId);
    let status: MotifDebtStatus = 'open';
    if (onCurrent) status = 'here';
    else if (hits.length > 0) status = 'elsewhere';
    return {
      motif,
      status,
      trackTitles: hits.map((row) => row.title),
    };
  });
}

export function openAlbumMotifDebts(debts: AlbumMotifDebt[]): string[] {
  return debts.filter((d) => d.status === 'open').map((d) => d.motif);
}

export function motifsNotOnTrack(debts: AlbumMotifDebt[]): string[] {
  return debts.filter((d) => d.status !== 'here').map((d) => d.motif);
}
