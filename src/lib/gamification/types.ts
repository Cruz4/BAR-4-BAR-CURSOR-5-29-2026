/** Gamification profile stored at users/{uid}/gamification/summary */

export type RankId =
  | 'open_mic'
  | 'soundcheck'
  | 'demo_tape'
  | 'cipher_cut'
  | 'session_ready'
  | 'green_room'
  | 'headliner'
  | 'encore_run'
  | 'catalog_king'
  | 'vault_architect';

export type GamificationSummary = {
  xp: number;
  rankId: RankId;
  /**
   * Prestige cycles completed (0–5). Raising this scales personal achievement
   * ceilings — it is never itself a requirement to unlock badges.
   */
  prestigeLevel?: number;
  currentStreak: number;
  longestStreak: number;
  /** achievement id → unlockedAt ISO */
  unlockedAchievements: Record<string, string>;
  weeklyChallengeProgress: Record<string, number>;
  weeklyChallengeWeekKey: string;
  monthlyChallengeProgress: Record<string, number>;
  monthlyChallengeMonthKey: string;
  generateNextLineMonthCount: number;
  tracksCompletedMonthCount: number;
  /**
   * Lifetime hand-written **lines** (typed or edited by you — not AI-generated).
   * Display as rhyme bars via linesToRhymeBars(). Achievements & “write X bars” challenges use this.
   */
  lifetimeBarsWritten: number;
  /** Lifetime AI-generated lines (Generate Next, full drafts, Smart Structure paste, etc.). */
  lifetimeLinesGenerated: number;
  lifetimeTracksCompleted: number;
  lifetimeGenerateNextLine: number;
  lifetimeStudioSessions: number;
  personalBests: {
    /** Lines written in one calendar day */
    barsInDay: number;
    longestStreak: number;
    /** Lines written in one session on a track */
    barsInSession: number;
  };
  publicProfile: boolean;
  profileSlug?: string;
  /**
   * Artist Home hero portrait source.
   * - `custom` — uploaded photo
   * - `collage` — album cover collage (auto or picked)
   * - `initials` — stock star with 2-letter initials (no photo / collage)
   * Default when unset: `initials` (until the artist picks collage/custom).
   */
  profilePhotoMode?: 'collage' | 'custom' | 'initials';
  /** Square JPEG/PNG data URL or https URL when profilePhotoMode is custom. */
  profilePhotoUrl?: string;
  /**
   * Optional ordered album IDs for the hero collage (1–9).
   * When empty/absent, newest album covers are used automatically.
   */
  profileCollageAlbumIds?: string[];
  /**
   * Vesperfold Mark — generative feed-star identity (~54M looks).
   * When `starMarkUseStar` is true, feed chips show the generative star (round).
   * When off + custom photo, feed chips show a square photo.
   * When off + no photo, feed chips show the stock initials star.
   * Artist Home hero photo stays independent; a small star badge appears there when generative is on.
   */
  starMarkUseStar?: boolean;
  starMarkSeed?: number;
  /** When set, this vault slot stays the active star until unlocked (survives logout). */
  starMarkPinnedSlotId?: string | null;
  starMarkSlots?: Array<{
    id: string;
    seed: number;
    lockedAt: string;
    label: string;
  }>;
  leaderboardHidden: boolean;
  bonusInkGrantedThisMonth: number;
  bonusInkMonthKey: string;
  /** Rolling 7-day **line** count for leaderboard ranking */
  barsWritten7d: number;
  /** Lines written today (resets daily) */
  barsWrittenToday: number;
  barsWrittenDayKey: string;
  tracksCompleted30d: number;
  generateNextLineWeekCount: number;
  dnaFilledWeekCount: number;
  tracksCompletedWeekCount: number;
  /** Foreign DNA Drops imported into this vault (lifetime). */
  lifetimeDnaImports: number;
  /** Accepted friendships sealed by this user (lifetime). */
  lifetimeFriendshipsAccepted: number;
  /** Public wall posts published (lifetime). */
  lifetimeWallPosts: number;
  /** DNA Drops this artist published (lifetime). */
  lifetimeSharesCreated: number;
  /** Times other artists imported this user's DNA Drops. */
  lifetimeDnaImportsReceived: number;
  /** Loves received on wall posts and replies (lifetime). */
  lifetimeLovesReceived?: number;
  /** XP earned from loves today — soft cap so farming stays boring. */
  loveXpToday?: number;
  loveXpDayKey?: string;
  dnaImportWeekCount: number;
  friendshipWeekCount: number;
  wallPostWeekCount: number;
  shareCreatedWeekCount: number;
  qualifiedListenWeekCount: number;
  qualifiedListenSongWeekCount: number;
  qualifiedListenWeekSongIds: string[];
  quoteReverbWeekCount: number;
  galleryPostWeekCount: number;
  creatorListenerWeekCount: number;
  lifetimePaidSupports: number;
  lifetimeQualifiedListeningDays: number;
  lifetimePressedSongs: number;
  lifetimeFirstDropSales: number;
  lifetimeQuoteReverbs: number;
  lifetimeGalleryPosts: number;
  lifetimeCreatorQualifiedListeners: number;
  lastGenerateNextLineDayKey: string;
  updatedAt: string;
};

export type GamificationUnlock = {
  id: string;
  title: string;
  description: string;
  inkReward: number;
  xpReward: number;
  proOnly?: boolean;
};

export type GamificationTrigger =
  | 'session_start'
  | 'ai_action'
  | 'smart_structure_used'
  | 'tour_complete'
  | 'rhyme_pulse_on'
  | 'track_saved'
  | 'dna_preset_saved'
  | 'share_created'
  | 'album_limit_hit'
  | 'dna_imported'
  | 'friendship_accepted'
  | 'wall_post_created'
  | 'quote_reverb_created'
  | 'dna_drop_imported_by_other'
  | 'love_received'
  | 'paid_support'
  | 'qualified_listen'
  | 'creator_sale'
  | 'creator_qualified_listener';

export const DEFAULT_GAMIFICATION_SUMMARY: GamificationSummary = {
  xp: 0,
  rankId: 'open_mic',
  prestigeLevel: 0,
  currentStreak: 0,
  longestStreak: 0,
  unlockedAchievements: {},
  weeklyChallengeProgress: {},
  weeklyChallengeWeekKey: '',
  monthlyChallengeProgress: {},
  monthlyChallengeMonthKey: '',
  generateNextLineMonthCount: 0,
  tracksCompletedMonthCount: 0,
  lifetimeBarsWritten: 0,
  lifetimeLinesGenerated: 0,
  lifetimeTracksCompleted: 0,
  lifetimeGenerateNextLine: 0,
  lifetimeStudioSessions: 0,
  personalBests: { barsInDay: 0, longestStreak: 0, barsInSession: 0 },
  publicProfile: false,
  profilePhotoMode: 'initials',
  /** Private by default — appear on leaderboard only when the artist opts in. */
  leaderboardHidden: true,
  bonusInkGrantedThisMonth: 0,
  bonusInkMonthKey: '',
  barsWritten7d: 0,
  barsWrittenToday: 0,
  barsWrittenDayKey: '',
  tracksCompleted30d: 0,
  generateNextLineWeekCount: 0,
  dnaFilledWeekCount: 0,
  tracksCompletedWeekCount: 0,
  lifetimeDnaImports: 0,
  lifetimeFriendshipsAccepted: 0,
  lifetimeWallPosts: 0,
  lifetimeSharesCreated: 0,
  lifetimeDnaImportsReceived: 0,
  lifetimeLovesReceived: 0,
  loveXpToday: 0,
  loveXpDayKey: '',
  dnaImportWeekCount: 0,
  friendshipWeekCount: 0,
  wallPostWeekCount: 0,
  shareCreatedWeekCount: 0,
  qualifiedListenWeekCount: 0,
  qualifiedListenSongWeekCount: 0,
  qualifiedListenWeekSongIds: [],
  quoteReverbWeekCount: 0,
  galleryPostWeekCount: 0,
  creatorListenerWeekCount: 0,
  lifetimePaidSupports: 0,
  lifetimeQualifiedListeningDays: 0,
  lifetimePressedSongs: 0,
  lifetimeFirstDropSales: 0,
  lifetimeQuoteReverbs: 0,
  lifetimeGalleryPosts: 0,
  lifetimeCreatorQualifiedListeners: 0,
  lastGenerateNextLineDayKey: '',
  updatedAt: new Date().toISOString(),
};

/** Resolve hero portrait mode — unset / unknown → stock initials star. */
export function normalizeProfilePhotoMode(
  mode: unknown
): 'collage' | 'custom' | 'initials' {
  if (mode === 'custom') return 'custom';
  if (mode === 'collage') return 'collage';
  return 'initials';
}
