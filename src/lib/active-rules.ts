import type { Album, StyleProfile, Track } from '@/lib/types';
import type { ActiveRules } from '@/components/dna-synthesis-loader';
import {
  isAlbumDnaActive,
  isGuardrailsActive,
  isIntentsActive,
  isStyleActive,
  isTrackDnaActive,
  isVibeActive,
} from '@/lib/co-writer-rules';

export function computeActiveRules(
  track?: Track | null,
  album?: Album | null,
  styleProfile?: StyleProfile | null
): ActiveRules {
  if (!track) return {};
  const styleAnalysis = styleProfile?.history?.[0]?.analysis?.trim() || '';
  return {
    dna: isAlbumDnaActive(track, album) || isTrackDnaActive(track),
    intents: isIntentsActive(track),
    style: isStyleActive(track) && !!styleAnalysis,
    vibe: isVibeActive(track),
    guardrails: isGuardrailsActive(track),
    instructions: !!track.specialInstructions?.trim(),
  };
}
