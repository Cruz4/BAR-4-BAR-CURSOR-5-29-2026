import type { ArtistHomeSoundIdentity } from '@/lib/profile/sound-identity';

export type DiscoveryGraphMode = 'taste' | 'creation';

export type DiscoveryMatch = {
  score: number;
  reasons: string[];
};

const CREATOR_KINDS = new Set(['artist', 'songwriter', 'producer', 'engineer', 'dj']);

function normalized(values?: string[]): Map<string, string> {
  const out = new Map<string, string>();
  for (const value of values || []) {
    const clean = value.trim().replace(/\s+/g, ' ');
    if (clean) out.set(clean.toLocaleLowerCase(), clean);
  }
  return out;
}

function overlaps(a?: string[], b?: string[]): string[] {
  const left = normalized(a);
  const right = normalized(b);
  return [...left.entries()]
    .filter(([key]) => right.has(key))
    .map(([, label]) => label);
}

export function hasTasteSignals(identity?: ArtistHomeSoundIdentity): boolean {
  return Boolean(
    identity?.genres?.length ||
      identity?.moods?.length ||
      identity?.influences?.length ||
      identity?.region
  );
}

export function hasCreationSignals(identity?: ArtistHomeSoundIdentity): boolean {
  return Boolean(identity?.kinds?.some((kind) => CREATOR_KINDS.has(kind)));
}

/**
 * Explainable public-tag matching only. Money, Ink, subscription tier, private
 * lyrics, private DNA, and raw listening history are intentionally absent.
 */
export function buildDiscoveryMatch(
  viewer: ArtistHomeSoundIdentity | undefined,
  candidate: ArtistHomeSoundIdentity | undefined,
  mode: DiscoveryGraphMode
): DiscoveryMatch {
  if (!viewer || !candidate) return { score: 0, reasons: [] };
  const genres = overlaps(viewer.genres, candidate.genres);
  const moods = overlaps(viewer.moods, candidate.moods);
  const influences = overlaps(viewer.influences, candidate.influences);
  const reasons: string[] = [];
  let score = genres.length * 5 + moods.length * 3 + influences.length * 2;

  if (genres.length) reasons.push(`Genre · ${genres.slice(0, 2).join(', ')}`);
  if (moods.length) reasons.push(`Mood · ${moods.slice(0, 2).join(', ')}`);
  if (influences.length) reasons.push(`Influence · ${influences.slice(0, 1).join(', ')}`);

  const viewerRegion = viewer.region?.trim().toLocaleLowerCase();
  const candidateRegion = candidate.region?.trim().toLocaleLowerCase();
  if (viewerRegion && candidateRegion && viewerRegion === candidateRegion) {
    score += 2;
    reasons.push(`Region · ${viewer.region}`);
  }

  if (mode === 'creation') {
    const sharedKinds = overlaps(viewer.kinds, candidate.kinds).filter((kind) => CREATOR_KINDS.has(kind));
    if (sharedKinds.length) {
      score += sharedKinds.length * 2;
      reasons.push(`Craft · ${sharedKinds.slice(0, 2).join(', ')}`);
    }
    if (viewer.collaboration === 'open' && candidate.collaboration === 'open') {
      score += 3;
      reasons.push('Both open to collaborate');
    }
  }

  return { score, reasons: reasons.slice(0, 3) };
}
