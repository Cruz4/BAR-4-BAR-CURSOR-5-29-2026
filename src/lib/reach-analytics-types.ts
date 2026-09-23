export type ReachAnalyticsDay = {
  day: string;
  count: number;
};

export type ReachAnalyticsPlace = {
  label: string;
  country?: string;
  region?: string;
  count: number;
};

export type ReachAnalyticsHour = {
  hourUtc: number;
  count: number;
};

export type ReachAnalyticsReferrer = {
  host: string;
  count: number;
};

export type ReachAnalyticsRecent = {
  at: string;
  place: string;
  country?: string;
  referrer?: string;
  device?: string;
};

export type ReachAnalyticsResponse = {
  kind: 'share' | 'profile';
  days: number;
  uniqueLandings: number;
  /** Visits in the selected `days` window (`days` 0 = all time). */
  periodLandings: number;
  /** Artist Home only — sum of wall post opens (same person can count on multiple posts). */
  allTimeWallOpens?: number;
  /** Legacy Firestore counter — often inflated (every page load). */
  legacyPageLoads?: number;
  imports?: number;
  note?: string;
  timeline: ReachAnalyticsDay[];
  places: ReachAnalyticsPlace[];
  hoursUtc: ReachAnalyticsHour[];
  referrers: ReachAnalyticsReferrer[];
  recent: ReachAnalyticsRecent[];
};
