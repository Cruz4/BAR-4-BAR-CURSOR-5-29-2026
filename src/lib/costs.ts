/**
 * Per-action Ink costs — studio economy.
 * Pools: 1,100/mo (Pro Monthly) · 2,500/mo (Pro Yearly residency refill).
 */
export const AI_COSTS = {
  generateNextLine: 10,
  generateDraftPerBar: 2,

  analyzeRelayAssets: 10,
  generateRelayDraft: 2,

  suggestTrackTitles: 3,
  suggestVibe: 20,
  generateCoverArt: 25,
  analyzeStructure: 8,

  findRhymes: 20,
  improveMyStyle: 30,

  freestyleTranscription: 3,

  runCreativeEffect: 10,

  aiVideoDirector: 100,
  aiMusicCowriter: 80,
} as const;
