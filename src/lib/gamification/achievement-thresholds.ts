/** Server-side unlock thresholds — counts are in **rhyme bars** (2 lines = 1 bar). */

export const ACHIEVEMENT_THRESHOLDS = {
  /** Rhyme bars on one track in a session (48 lines) */
  sessionBars: 24,
  /** Tracks on one concept album */
  albumTracks: 6,
  /** Wide concept album */
  albumTracksWide: 10,
  /** Concept albums that count toward Dual Blueprint */
  albumQualifyMinTracks: 4,
  /** Rhyme bars required to count a "Track Locked" completion (24 lines) */
  trackCompleteMinBars: 12,
  /** Deep single-track drafts — rhyme bars (verified from Firestore line count) */
  trackBarsDeep: 40,
  trackBarsCentury: 64,
  /** Lifetime rhyme bars (stored counters are lines; compare via rhymeBarsToLines) */
  lifetimeBars1k: 750,
  lifetimeBars2500: 2000,
  /** Verified AI next-line generations */
  lifetimeNextLine50: 75,
  lifetimeNextLine200: 300,
  /** Distinct completed tracks in Firestore */
  catalogCompleted5: 8,
  catalogCompleted12: 18,
  /** Completed tracks on one album */
  albumCompletedTracks: 4,
  /** Rhyme bars written in one calendar day */
  barsInDayNight: 16,
  barsInDayGraveyard: 28,
  streak3Days: 3,
  streak7Days: 7,
  streak30Days: 30,
  streak3MinLifetimeBars: 20,
  streak7MinLifetimeBars: 55,
  streak30MinLifetimeBars: 220,
  /** Longest streak milestones + writing floor (rhyme bars) */
  longestStreak14: 14,
  longestStreak14MinBars: 90,
  longestStreak60: 60,
  longestStreak60MinBars: 320,
  /** Unique studio days + writing floor (rhyme bars) */
  sessionDaysVeteran: 60,
  sessionVeteranMinBars: 200,
  /** Social — foreign DNA imports, friendships, wall, resonance */
  dnaImportsFirst: 1,
  dnaImportsCatalog: 6,
  dnaImportsArchive: 15,
  friendshipsFirst: 1,
  friendshipsInnerCircle: 6,
  friendshipsBlockCaptain: 15,
  wallPostsFirst: 1,
  wallPostsResidency: 14,
  dnaImportsReceivedFirst: 1,
  dnaImportsReceivedEcho: 6,
  sharesCreatedTriple: 4,
} as const;

/**
 * Feet-wet trophies — toast only (no full-screen spam).
 * Everything else should take real booth / Scene work.
 */
export const STARTER_ACHIEVEMENT_IDS = new Set<string>([
  'tour_graduate',
  'first_next_bar',
  'first_paste',
  'rhyme_pulse_on',
]);

export function isStarterAchievement(id: string): boolean {
  return STARTER_ACHIEVEMENT_IDS.has(id);
}
