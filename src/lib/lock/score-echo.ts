import type { LockDnaSnapshot } from '@/lib/lock/types';
import { lineEndWord, multisyllabicMatch, nearRhymeScore } from '@/lib/lyrics-analysis/rhyme';

function tokens(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .replace(/[^a-z0-9'\s]/g, ' ')
      .split(/\s+/)
      .map((t) => t.trim())
      .filter((t) => t.length > 2)
  );
}

/** 0..1 phonetic end-rhyme vs the seed bar (ARPABET/heuristic, not spelling). */
function seedEndRhymeScore(seedBar: string, echoText: string): number {
  const seedWord = lineEndWord(seedBar);
  const echoWord = lineEndWord(echoText);
  if (!seedWord || !echoWord) return 0;
  if (seedWord.toLowerCase() === echoWord.toLowerCase()) return 0.35;

  const multi = multisyllabicMatch(seedBar, echoText, 4);
  if (multi.depth >= 1) {
    const depthBoost = multi.depth >= 2 ? 0.12 : 0;
    return Math.min(1, 0.45 + multi.score * 0.45 + depthBoost);
  }

  return Math.min(1, nearRhymeScore(seedWord, echoWord) * 0.92);
}

function dnaCorpus(dna?: LockDnaSnapshot | null): string {
  if (!dna) return '';
  const parts = [
    dna.setting_world,
    dna.emotion_core,
    dna.trigger_moment,
    dna.message_truth,
    dna.tone_palette,
    dna.styleBlurb,
    ...(dna.intents || []),
  ];
  return parts.filter((p): p is string => typeof p === 'string' && p.trim().length > 0).join(' ');
}

export type LockScoreResult = {
  score: number;
  label: 'Off-world' | 'In-world' | 'Hard LOCK';
};

/**
 * Free guest-safe heuristic — no Ink / no model call.
 * Overlap vs DNA snapshot + phonetic end-rhyme vs seed.
 */
export function scoreEchoAgainstLock(input: {
  echoText: string;
  seedBar: string;
  dnaSnapshot?: LockDnaSnapshot | null;
}): LockScoreResult {
  const echo = input.echoText.trim();
  if (!echo) return { score: 0, label: 'Off-world' };

  const echoTok = tokens(echo);
  const dnaTok = tokens(dnaCorpus(input.dnaSnapshot));
  const seedTok = tokens(input.seedBar);

  let overlap = 0;
  if (dnaTok.size > 0) {
    let hits = 0;
    for (const t of echoTok) if (dnaTok.has(t)) hits += 1;
    overlap = hits / Math.max(3, Math.min(echoTok.size, 12));
  } else if (seedTok.size > 0) {
    let hits = 0;
    for (const t of echoTok) if (seedTok.has(t)) hits += 1;
    overlap = hits / Math.max(2, Math.min(echoTok.size, 10));
  }

  const rhyme = seedEndRhymeScore(input.seedBar, echo);

  const lengthPenalty = echo.length < 12 ? 0.15 : echo.length > 220 ? 0.1 : 0;
  const raw = Math.round(Math.min(100, Math.max(0, overlap * 62 + rhyme * 38 - lengthPenalty * 100)));
  const score = Number.isFinite(raw) ? raw : 0;

  const label: LockScoreResult['label'] =
    score >= 78 ? 'Hard LOCK' : score >= 42 ? 'In-world' : 'Off-world';

  return { score, label };
}
