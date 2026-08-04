import { AI_COSTS } from '@/lib/costs';

export type InkActionKey = keyof typeof AI_COSTS;

/** Human-readable names for each billable action */
export const INK_ACTION_LABELS: Record<InkActionKey, string> = {
  generateNextLine: 'Next / Previous Line',
  generateDraftPerBar: 'Studio Draft (per bar)',
  analyzeRelayAssets: 'Extract DNA Profile',
  generateRelayDraft: 'DNA Remix (per bar)',
  suggestTrackTitles: 'Suggest Track Titles',
  suggestVibe: 'Analyze Vibe',
  generateCoverArt: 'Generate Scene',
  analyzeStructure: '+ Paste Your Lyrics',
  findRhymes: 'Rhyme Pulse',
  improveMyStyle: 'Train AI on Style',
  freestyleTranscription: 'Freestyle Session',
  freestyleTranscriptionChunk: 'Freestyle Chunk (free)',
  runCreativeEffect: 'Creative Effect',
  aiVideoDirector: 'AI Video Director',
  aiMusicCowriter: 'AI Music Co-Writer',
};

export function inkTooltip(action: InkActionKey, cost?: number): string {
  const amount = cost ?? AI_COSTS[action];
  return `${INK_ACTION_LABELS[action]} — ${amount} Ink`;
}

export function inkButtonLabel(action: InkActionKey, cost?: number): string {
  const amount = cost ?? AI_COSTS[action];
  return `${INK_ACTION_LABELS[action]} (${amount} Ink)`;
}
