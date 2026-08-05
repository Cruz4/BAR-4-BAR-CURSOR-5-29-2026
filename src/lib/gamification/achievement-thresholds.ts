/** Server-side unlock thresholds — counts are in **rhyme bars** (2 lines = 1 bar). */

export const ACHIEVEMENT_THRESHOLDS = {
  /** Rhyme bars on one track in a session (32 lines) */
  sessionBars: 16,
  /** Tracks on one concept album */
  albumTracks: 5,
  /** Wide concept album */
  albumTracksWide: 8,
  /** Concept albums that count toward Dual Blueprint */
  albumQualifyMinTracks: 3,
  /** Rhyme bars required to count a "Track Locked" completion (16 lines) */
  trackCompleteMinBars: 8,
  /** Deep single-track drafts — rhyme bars (verified from Firestore line count) */
  trackBarsDeep: 32,
  trackBarsCentury: 50,
  /** Lifetime rhyme bars (stored counters are lines; compare via rhymeBarsToLines) */
  lifetimeBars1k: 500,
  lifetimeBars2500: 1250,
  /** Verified AI next-line generations */
  lifetimeNextLine50: 50,
  lifetimeNextLine200: 200,
  /** Distinct completed tracks in Firestore */
  catalogCompleted5: 5,
  catalogCompleted12: 12,
  /** Completed tracks on one album */
  albumCompletedTracks: 3,
  /** Rhyme bars written in one calendar day */
  barsInDayNight: 12,
  barsInDayGraveyard: 20,
  streak3Days: 3,
  streak7Days: 7,
  streak30Days: 30,
  streak3MinLifetimeBars: 12,
  streak7MinLifetimeBars: 35,
  streak30MinLifetimeBars: 150,
  /** Longest streak milestones + writing floor (rhyme bars) */
  longestStreak14: 14,
  longestStreak14MinBars: 60,
  longestStreak60: 60,
  longestStreak60MinBars: 225,
  /** Unique studio days + writing floor (rhyme bars) */
  sessionDaysVeteran: 45,
  sessionVeteranMinBars: 125,
  /** Social — foreign DNA imports, friendships, wall, resonance */
  dnaImportsFirst: 1,
  dnaImportsCatalog: 5,
  dnaImportsArchive: 12,
  friendshipsFirst: 1,
  friendshipsInnerCircle: 5,
  friendshipsBlockCaptain: 12,
  wallPostsFirst: 1,
  wallPostsResidency: 10,
  dnaImportsReceivedFirst: 1,
  dnaImportsReceivedEcho: 5,
  sharesCreatedTriple: 3,
} as const;

/** Feet-wet trophies — only these are meant to unlock quickly for new artists. */
export const STARTER_ACHIEVEMENT_IDS = new Set<string>(['tour_graduate', 'first_next_bar']);

export function isStarterAchievement(id: string): boolean {
  return STARTER_ACHIEVEMENT_IDS.has(id);
}
