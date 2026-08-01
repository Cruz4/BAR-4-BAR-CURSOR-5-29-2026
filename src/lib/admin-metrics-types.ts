export type DailyCount = { date: string; count: number };

export type SignupAttributionRow = {
  ref: string;
  label: string;
  landingHitsTotal: number;
  landingHitsLast7Days: number;
  landingHitsLast30Days: number;
  landingHitsLast90Days: number;
  signupsTotal: number;
  signupsLast7Days: number;
  signupsLast30Days: number;
  signupsLast90Days: number;
  signupConversionRatePercent: number;
  activated: number;
  activationRatePercent: number;
  proActive: number;
  shareOfSignupsPercent: number;
};

export type SignupAttributionStats = {
  taggedSignups: number;
  organicSignups: number;
  totalLandingHits: number;
  landingHitsLast30Days: number;
  byRef: SignupAttributionRow[];
};

/** Anonymous guest try-sheet funnel (pre-signup). */
export type GuestTryFunnelStats = {
  opens: number;
  opensLast7Days: number;
  opensLast30Days: number;
  wroteBar: number;
  demoAiRequests: number;
  demoAiSuccesses: number;
  demoAiLimits: number;
  demoAiErrors: number;
  optionAccepts: number;
  optionDismisses: number;
  lockedFeatureTaps: number;
  signupCtaClicks: number;
  /** Signups that arrived with intent=guest_try or fromGuestTry metadata (from analytics). */
  guestTrySignups: number;
  openToWrotePercent: number;
  wroteToAiPercent: number;
  aiToAcceptPercent: number;
  openToCtaPercent: number;
  openToSignupPercent: number;
};

export type AdminMetricsSnapshot = {
  generatedAt: string;
  funnel: {
    totalSignups: number;
    signupsLast7Days: number;
    signupsLast30Days: number;
    signupsLast90Days: number;
    signupsByDay: DailyCount[];
    activatedUsers: number;
    activationRatePercent: number;
    avgHoursToFirstAi: number | null;
    avgHoursToFirstGenerateNextLine: number | null;
    trackEditorOpens: number;
    pricingPageViews: number;
    checkoutStarts: number;
    checkoutCompletions: number;
    pricingToCheckoutRatePercent: number;
    checkoutToPaidRatePercent: number;
    signupToPaidRatePercent: number;
  };
  retention: {
    usersWith7DayReturn: number;
    sevenDayReturnRatePercent: number;
    activeLast7Days: number;
    activeLast30Days: number;
  };
  monetization: {
    activeProMonthly: number;
    activeProYearly: number;
    estimatedMrr: number;
    inkPackRevenue30d: number;
    inkPackRevenue90d: number;
    subscriptionRevenue30d: number;
    totalRevenue30d: number;
    totalRevenue90d: number;
    avgRevenuePerPayingUser: number;
  };
  freeTierPressure: {
    usersAtAlbumLimit: number;
    usersAtTrackLimit: number;
    usersLowInk: number;
    freeLimitHitEvents: number;
    upgradeClickEvents: number;
    lowInkHitEvents: number;
    inkDepletionEvents: number;
    /** Users who completed the Pro trial DNA vault quest */
    trialQuestCompleteEvents: number;
    usersInkDepleted: number;
    inkDepletedChurned30d: number;
    upgradeClicksByTrigger: {
      slot_limit: number;
      low_ink: number;
      trial_quest: number;
      pricing: number;
      ink_depletion: number;
      other: number;
    };
    freeLimitHitsByType: {
      album: number;
      track: number;
    };
  };
  acquisition: {
    adSpend30d: number;
    adSpend90d: number;
    costPerSignup: number | null;
    costPerActivatedUser: number | null;
    notes: string;
  };
  signupAttribution: SignupAttributionStats;
  guestTryFunnel: GuestTryFunnelStats;
  recentEvents: Array<{
    timestamp: string;
    event: string;
    userId: string;
    userName: string | null;
    metadata: Record<string, unknown>;
  }>;
  gamification: {
    usersWithAchievements: number;
    achievementUnlockEvents: number;
    streakMilestoneEvents: number;
    shareCardGenerated: number;
    shareCardOpened: number;
    leaderboardViews: number;
    avgStreakActiveUsers: number;
  };
};

export type AdminMetricsCacheMeta = {
  fromCache: boolean;
  computedAt: string;
  expiresAt: string;
  stale: boolean;
};

export type AdminMetricsResponse = AdminMetricsSnapshot & {
  cache: AdminMetricsCacheMeta;
};
