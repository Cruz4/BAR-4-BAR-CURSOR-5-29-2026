export type DailyCount = { date: string; count: number };

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
  };
  acquisition: {
    adSpend30d: number;
    adSpend90d: number;
    costPerSignup: number | null;
    costPerActivatedUser: number | null;
    notes: string;
  };
  recentEvents: Array<{
    timestamp: string;
    event: string;
    userId: string;
    userName: string | null;
    metadata: Record<string, unknown>;
  }>;
};
