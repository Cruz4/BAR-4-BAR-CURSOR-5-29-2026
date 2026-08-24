import type { EmergingRankingEntry, EmergingSignals } from '@/lib/emerging-ranking';

export const MUSIC_CHART_WINDOW_DAYS = 7 as const;

export type TrackChartSignals = {
  qualifiedListeners: number;
  completions: number;
  repeatListeners: number;
  purchaseConversions: number;
};

export type TrackChartEntry = {
  shareId: string;
  title: string;
  artistId: string;
  artistName: string;
  artistSlug: string;
  score: number;
  signals: TrackChartSignals;
  reasons: string[];
  genres: string[];
  regions: string[];
  updatedAt?: string;
};

export type ArtistChartEntry = EmergingRankingEntry & {
  genres: string[];
  regions: string[];
};

export const TRACK_CHART_FORMULA: Array<{
  signal: keyof TrackChartSignals;
  label: string;
  points: number;
}> = [
  { signal: 'qualifiedListeners', label: 'qualified 80% listen', points: 1 },
  { signal: 'completions', label: 'completed listen', points: 2 },
  { signal: 'repeatListeners', label: 'repeat listener day', points: 3 },
  { signal: 'purchaseConversions', label: 'unique listener-to-buyer conversion', points: 8 },
];

export function emptyTrackChartSignals(): TrackChartSignals {
  return {
    qualifiedListeners: 0,
    completions: 0,
    repeatListeners: 0,
    purchaseConversions: 0,
  };
}

function whole(value: number, cap: number): number {
  return Math.max(0, Math.min(cap, Math.floor(Number(value) || 0)));
}

/**
 * Song momentum rewards verified attention and conversion, not raw starts.
 * Dollar amount, Ink, tier, ads, and sponsorship are intentionally not inputs.
 */
export function trackChartScore(signals: TrackChartSignals): number {
  return (
    whole(signals.qualifiedListeners, 10_000) +
    whole(signals.completions, 10_000) * 2 +
    whole(signals.repeatListeners, 5_000) * 3 +
    whole(signals.purchaseConversions, 5_000) * 8
  );
}

export function trackChartReasons(signals: TrackChartSignals): string[] {
  return [
    signals.purchaseConversions > 0
      ? `${signals.purchaseConversions} unique buyer conversion${signals.purchaseConversions === 1 ? '' : 's'}`
      : '',
    signals.repeatListeners > 0
      ? `${signals.repeatListeners} repeat listener day${signals.repeatListeners === 1 ? '' : 's'}`
      : '',
    signals.completions > 0
      ? `${signals.completions} completed listen${signals.completions === 1 ? '' : 's'}`
      : '',
    signals.qualifiedListeners > 0
      ? `${signals.qualifiedListeners} qualified listen${signals.qualifiedListeners === 1 ? '' : 's'}`
      : '',
  ].filter(Boolean).slice(0, 3);
}

export function chartRegionLabels(value: unknown): string[] {
  if (typeof value !== 'string') return [];
  const seen = new Set<string>();
  const labels: string[] = [];
  for (const raw of value.split(/\s*(?:\/|\||;|,)\s*/)) {
    const label = raw.trim().replace(/\s+/g, ' ').slice(0, 80);
    const key = label.toLocaleLowerCase();
    if (!label || seen.has(key)) continue;
    seen.add(key);
    labels.push(label);
  }
  return labels.slice(0, 5);
}

export type MusicChartsResponse = {
  window: { days: 7; from: string; through: string };
  tracks: TrackChartEntry[];
  artists: ArtistChartEntry[];
  filters: { genres: string[]; regions: string[] };
  formula: {
    tracks: typeof TRACK_CHART_FORMULA;
    artists: Array<{ signal: keyof EmergingSignals; label: string; points: number }>;
  };
  integrity: {
    qualifiedAtPercent: 80;
    ownerActionsExcluded: true;
    dedupedListenerProof: true;
    liveProfileRequired: true;
    leaderboardOptInRequired: true;
    paymentAmountAffectsRank: false;
    inkAffectsRank: false;
    subscriptionTierAffectsRank: false;
    sponsoredPlacementAffectsRank: false;
    publicRegionOnly: true;
  };
};
