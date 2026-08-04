/**
 * Per-action Ink costs — studio economy.
 * Pools: 1,777/mo (Pro Monthly) · 3,444/mo (Pro Yearly residency refill).
 * Visitor: 250 welcome on signup · +150/mo from month two (see subscription.ts).
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

  /** Charged once per freestyle recording session (first successfully transcribed chunk). */
  freestyleTranscription: 3,
  /** Continuation chunks in an already-billed freestyle session — free. */
  freestyleTranscriptionChunk: 0,

  runCreativeEffect: 10,

  // Roadmap placeholders — pre-priced and Pro-gated (see PRO_ONLY_AI_ACTIONS in
  // ai-gate.ts) for when the feature ships, but no flow file or dispatcher
  // entry exists yet. Not reachable from any UI; do not remove without also
  // clearing the ai-gate.ts gate entry, or wire up a real flow before shipping
  // a button that calls these action names.
  aiVideoDirector: 100,
  aiMusicCowriter: 80,
} as const;
