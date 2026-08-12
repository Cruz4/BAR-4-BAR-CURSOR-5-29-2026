/** Server-side checks before granting achievement unlocks and ink. */

import type { GamificationSummary, GamificationTrigger } from '@/lib/gamification/types';
import { ACHIEVEMENT_THRESHOLDS } from '@/lib/gamification/achievement-thresholds';
import { getPrestigeLevel, scaleByPrestige } from '@/lib/gamification/prestige';
import { rhymeBarsToLines } from '@/lib/lyrics-units';

export type AchievementVerifyContext = {
  tourCompletedVerified: boolean;
  trackCompleteVerified: boolean;
  barsOnTrackVerified: number;
  /** Hand-written non-empty lines on the active track (Firestore). */
  writtenLinesOnTrackVerified: number;
  albumTrackCountVerified: number;
  /** Completed tracks with min bars — counted from Firestore, not client counters */
  lifetimeCompletedTracksVerified: number;
  /** Concept albums with enough tracks */
  qualifyingAlbumCountVerified: number;
  /** Completed tracks on the active album */
  albumCompletedTracksVerified: number;
  /** Max non-empty lines on any saved track */
  maxBarsOnAnyTrackVerified: number;
};

type AnalyticsSummary = Record<string, unknown>;

type SummarySlice = Pick<
  GamificationSummary,
  | 'currentStreak'
  | 'longestStreak'
  | 'lifetimeBarsWritten'
  | 'lifetimeTracksCompleted'
  | 'lifetimeGenerateNextLine'
  | 'lifetimeStudioSessions'
  | 'lifetimeDnaImports'
  | 'lifetimeFriendshipsAccepted'
  | 'lifetimeWallPosts'
  | 'lifetimeSharesCreated'
  | 'lifetimeDnaImportsReceived'
  | 'personalBests'
  | 'prestigeLevel'
>;

function scaled(base: number, prestigeLevel?: number): number {
  return scaleByPrestige(base, getPrestigeLevel({ prestigeLevel }));
}

export function isAchievementActionVerified(
  achievementId: string,
  analytics: AnalyticsSummary,
  ctx: AchievementVerifyContext,
  trigger?: GamificationTrigger,
  prestigeLevel = 0
): boolean {
  const t = ACHIEVEMENT_THRESHOLDS;

  switch (achievementId) {
    case 'tour_graduate':
      return trigger === 'tour_complete' && ctx.tourCompletedVerified;
    case 'first_next_bar':
      return Boolean(analytics.firstGenerateNextLineAt);
    case 'first_paste':
      return Boolean(analytics.firstAnalyzeStructureAt);
    case 'rhyme_pulse_on':
      return Boolean(analytics.firstRhymePulseAt);
    case 'track_complete':
      return trigger === 'track_saved' && ctx.trackCompleteVerified;
    case 'bars_16_session':
      return (
        trigger === 'track_saved' &&
        ctx.writtenLinesOnTrackVerified >= rhymeBarsToLines(scaled(t.sessionBars, prestigeLevel))
      );
    case 'album_builder':
      return (
        trigger === 'track_saved' &&
        ctx.albumTrackCountVerified >= scaled(t.albumTracks, prestigeLevel)
      );
    case 'vault_strain':
      return trigger === 'dna_preset_saved';
    case 'share_drop':
      return trigger === 'share_created';
    case 'second_album':
      return trigger === 'album_limit_hit';
    case 'dna_import_first':
      return trigger === 'dna_imported';
    case 'circle_formed':
      return trigger === 'friendship_accepted';
    case 'wall_signal':
      return trigger === 'wall_post_created';
    case 'drop_resonance':
      return trigger === 'dna_drop_imported_by_other';
    case 'ai_trinity':
      return (
        Boolean(analytics.firstGenerateNextLineAt) &&
        Boolean(analytics.firstAnalyzeStructureAt) &&
        Boolean(analytics.firstRhymePulseAt)
      );
    case 'streak_3':
    case 'streak_7':
    case 'streak_30':
      return false;
    default:
      return false;
  }
}

export function canUnlockAchievement(
  achievementId: string,
  analytics: AnalyticsSummary,
  ctx: AchievementVerifyContext,
  summary: SummarySlice,
  trigger?: GamificationTrigger
): boolean {
  const t = ACHIEVEMENT_THRESHOLDS;
  const prestige = getPrestigeLevel(summary);
  const S = (n: number) => scaled(n, prestige);
  const lifetimeLines = summary.lifetimeBarsWritten || 0;
  const sessionDays = Array.isArray(analytics.sessionDates)
    ? analytics.sessionDates.length
    : 0;

  switch (achievementId) {
    case 'streak_3':
      return (
        summary.currentStreak >= t.streak3Days &&
        lifetimeLines >= rhymeBarsToLines(S(t.streak3MinLifetimeBars))
      );
    case 'streak_7':
      return (
        summary.currentStreak >= t.streak7Days &&
        lifetimeLines >= rhymeBarsToLines(S(t.streak7MinLifetimeBars))
      );
    case 'streak_30':
      return (
        summary.currentStreak >= t.streak30Days &&
        lifetimeLines >= rhymeBarsToLines(S(t.streak30MinLifetimeBars))
      );
    case 'bars_1000':
      return lifetimeLines >= rhymeBarsToLines(S(t.lifetimeBars1k));
    case 'bars_2500':
      return lifetimeLines >= rhymeBarsToLines(S(t.lifetimeBars2500));
    case 'next_line_50':
      return (summary.lifetimeGenerateNextLine || 0) >= S(t.lifetimeNextLine50);
    case 'next_line_200':
      return (summary.lifetimeGenerateNextLine || 0) >= S(t.lifetimeNextLine200);
    case 'catalog_5_locked':
      return ctx.lifetimeCompletedTracksVerified >= S(t.catalogCompleted5);
    case 'catalog_12_locked':
      return ctx.lifetimeCompletedTracksVerified >= S(t.catalogCompleted12);
    case 'track_64_deep':
      return (
        ctx.barsOnTrackVerified >= rhymeBarsToLines(S(t.trackBarsDeep)) ||
        ctx.maxBarsOnAnyTrackVerified >= rhymeBarsToLines(S(t.trackBarsDeep))
      );
    case 'track_100_deep':
      return (
        ctx.barsOnTrackVerified >= rhymeBarsToLines(S(t.trackBarsCentury)) ||
        ctx.maxBarsOnAnyTrackVerified >= rhymeBarsToLines(S(t.trackBarsCentury))
      );
    case 'album_8_wide':
      return trigger === 'track_saved' && ctx.albumTrackCountVerified >= S(t.albumTracksWide);
    case 'dual_blueprint':
      return ctx.qualifyingAlbumCountVerified >= 2;
    case 'night_shift':
      return (summary.personalBests?.barsInDay || 0) >= rhymeBarsToLines(S(t.barsInDayNight));
    case 'graveyard_shift':
      return (summary.personalBests?.barsInDay || 0) >= rhymeBarsToLines(S(t.barsInDayGraveyard));
    case 'flame_14':
      return (
        (summary.longestStreak || 0) >= t.longestStreak14 &&
        lifetimeLines >= rhymeBarsToLines(S(t.longestStreak14MinBars))
      );
    case 'flame_60':
      return (
        (summary.longestStreak || 0) >= t.longestStreak60 &&
        lifetimeLines >= rhymeBarsToLines(S(t.longestStreak60MinBars))
      );
    case 'session_veteran':
      return (
        sessionDays >= S(t.sessionDaysVeteran) &&
        lifetimeLines >= rhymeBarsToLines(S(t.sessionVeteranMinBars))
      );
    case 'album_trilogy_done':
      return ctx.albumCompletedTracksVerified >= S(t.albumCompletedTracks);
    case 'dna_import_first':
      return (summary.lifetimeDnaImports || 0) >= t.dnaImportsFirst;
    case 'dna_import_5':
      return (summary.lifetimeDnaImports || 0) >= t.dnaImportsCatalog;
    case 'dna_import_12':
      return (summary.lifetimeDnaImports || 0) >= t.dnaImportsArchive;
    case 'circle_formed':
      return (summary.lifetimeFriendshipsAccepted || 0) >= t.friendshipsFirst;
    case 'inner_circle':
      return (summary.lifetimeFriendshipsAccepted || 0) >= t.friendshipsInnerCircle;
    case 'block_captain':
      return (summary.lifetimeFriendshipsAccepted || 0) >= t.friendshipsBlockCaptain;
    case 'wall_signal':
      return (summary.lifetimeWallPosts || 0) >= t.wallPostsFirst;
    case 'wall_residency':
      return (summary.lifetimeWallPosts || 0) >= t.wallPostsResidency;
    case 'drop_resonance':
      return (summary.lifetimeDnaImportsReceived || 0) >= t.dnaImportsReceivedFirst;
    case 'drop_echo_chamber':
      return (summary.lifetimeDnaImportsReceived || 0) >= t.dnaImportsReceivedEcho;
    case 'triple_live':
      return (summary.lifetimeSharesCreated || 0) >= t.sharesCreatedTriple;
    default:
      return isAchievementActionVerified(achievementId, analytics, ctx, trigger, prestige);
  }
}
