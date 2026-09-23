import { AI_COSTS } from '@/lib/costs';

export type InkActionKey = keyof typeof AI_COSTS;

/** Human-readable names for each billable action */
export const INK_ACTION_LABELS: Record<InkActionKey, string> = {
  generateNextLine: 'Next / Previous Line',
  generateDraftPerBar: 'Studio Draft (per bar)',
  analyzeRelayAssets: 'Extract DNA Profile',
  extractAlbumDna: 'Extract Album DNA',
  generateRelayDraft: 'DNA Remix (per bar)',
  suggestTrackTitles: 'Suggest Track Titles',
  suggestVibe: 'Analyze Vibe',
  generateCoverArt: 'Generate Scene',
  analyzeStructure: '+ Paste Your Lyrics',
  findRhymes: 'Rhyme Pulse',
  improveMyStyle: 'Train AI on Style',
  freestyleTranscription: 'Freestyle Session',
  freestyleTranscriptionChunk: 'Freestyle pickup (free)',
  transcribeVoiceNote: 'Voice transcript',
  runCreativeEffect: 'Creative Effect',
  aiVideoDirector: 'AI Video Director',
  aiMusicCowriter: 'Generate Song (legacy key)',
  renderSong: 'Generate Song',
  renderInstrumental: 'Generate Instrumental',
  renderRepaint: 'Repaint Section',
  renderStemBundle: 'Stem Bundle',
  renderMidiStem: 'Stem to MIDI',
  renderVoiceMatch: 'Voice Match Pass',
  renderSignatureTrain: 'Artist Signature Training',
};

export function inkTooltip(action: InkActionKey, cost?: number): string {
  const amount = cost ?? AI_COSTS[action];
  return `${INK_ACTION_LABELS[action]} — ${amount} Ink`;
}

export function inkButtonLabel(action: InkActionKey, cost?: number): string {
  const amount = cost ?? AI_COSTS[action];
  return `${INK_ACTION_LABELS[action]} (${amount} Ink)`;
}
