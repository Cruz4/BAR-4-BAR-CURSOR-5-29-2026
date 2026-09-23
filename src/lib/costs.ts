/**
 * Per-action Ink costs — studio economy (rebalanced for Render Studio anti-arbitrage).
 * Pro Writer: 1,777/mo · Studio Max: 80,000/mo residency.
 */
export const AI_COSTS = {
  generateNextLine: 3,
  generateDraftPerBar: 3,

  analyzeRelayAssets: 12,
  extractAlbumDna: 24,
  generateRelayDraft: 3,

  suggestTrackTitles: 6,
  suggestVibe: 18,
  generateCoverArt: 30,
  analyzeStructure: 12,

  findRhymes: 15,
  improveMyStyle: 42,

  /** Charged once per freestyle recording session after several successful speech chunks. */
  freestyleTranscription: 3,
  /** Continuation chunks in an already-billed freestyle session — free. */
  freestyleTranscriptionChunk: 0,
  /** Wall / comment voice-note transcripts — free. */
  transcribeVoiceNote: 0,

  runCreativeEffect: 12,

  aiVideoDirector: 100,
  /** Legacy label — vocal render uses renderSong via Render API. */
  aiMusicCowriter: 44,
  renderSong: 44,
  renderInstrumental: 44,
  renderRepaint: 6,
  renderStemBundle: 40,
  renderMidiStem: 12,
  renderVoiceMatch: 36,
  renderSignatureTrain: 220,
} as const;

/** Bill the Freestyle Session fee on this successful speech chunk (~14s of studio pickup). */
export const FREESTYLE_BILL_AFTER_CHUNKS = 5;
