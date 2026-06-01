/** Server-side unlock thresholds — Studio trophies should feel earned. */

export const ACHIEVEMENT_THRESHOLDS = {
  /** Bars on one track in a session */
  sessionBars: 32,
  /** Tracks on one concept album */
  albumTracks: 5,
  /** Wide concept album */
  albumTracksWide: 8,
  /** Concept albums that count toward Dual Blueprint */
  albumQualifyMinTracks: 3,
  /** Non-empty bars required to count a "Track Locked" completion */
  trackCompleteMinBars: 8,
  /** Deep single-track drafts (verified from Firestore) */
  trackBarsDeep: 64,
  trackBarsCentury: 100,
  /** Lifetime bars (server delta on save only) */
  lifetimeBars1k: 1000,
  lifetimeBars2500: 2500,
  /** Verified AI next-line generations */
  lifetimeNextLine50: 50,
  lifetimeNextLine200: 200,
  /** Distinct completed tracks in Firestore */
  catalogCompleted5: 5,
  catalogCompleted12: 12,
  /** Completed tracks on one album */
  albumCompletedTracks: 3,
  /** Bars written in one calendar day */
  barsInDayNight: 24,
  barsInDayGraveyard: 40,
  streak3Days: 3,
  streak7Days: 7,
  streak30Days: 30,
  streak3MinLifetimeBars: 24,
  streak7MinLifetimeBars: 70,
  streak30MinLifetimeBars: 300,
  /** Longest streak milestones + writing floor */
  longestStreak14: 14,
  longestStreak14MinBars: 120,
  longestStreak60: 60,
  longestStreak60MinBars: 450,
  /** Unique studio days + writing floor */
  sessionDaysVeteran: 45,
  sessionVeteranMinBars: 250,
} as const;

/** Feet-wet trophies — only these are meant to unlock quickly for new artists. */
export const STARTER_ACHIEVEMENT_IDS = new Set<string>(['tour_graduate', 'first_next_bar']);

export function isStarterAchievement(id: string): boolean {
  return STARTER_ACHIEVEMENT_IDS.has(id);
}
