/**
 * Per-action Ink costs — studio economy.
 * Pools: 1,777/mo (Pro Monthly) · 3,444/mo (Pro Yearly residency refill).
 * Visitor: 300 signup + 111/mo residency (see subscription.ts).
 */
export const AI_COSTS = {
  generateNextLine: 15,
  generateDraftPerBar: 2,

  analyzeRelayAssets: 10,
  generateRelayDraft: 2,

  suggestTrackTitles: 3,
  suggestVibe: 20,
  generateCoverArt: 25,
  analyzeStructure: 8,

  findRhymes: 10,
  improveMyStyle: 35,

  freestyleTranscription: 3,

  runCreativeEffect: 10,

  aiVideoDirector: 100,
  aiMusicCowriter: 80,
} as const;
