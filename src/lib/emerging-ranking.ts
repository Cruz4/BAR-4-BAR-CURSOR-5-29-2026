import { organicMomentumScore, type OrganicMomentumSignals } from '@/lib/drop-listen-analytics';

export const EMERGING_WINDOW_DAYS = 7 as const;

export type EmergingSignals = OrganicMomentumSignals;

export type EmergingRankingEntry = {
  userId: string;
  displayName: string;
  profileSlug: string;
  score: number;
  signals: EmergingSignals;
  reasons: string[];
};

export type EmergingRankingResponse = {
  window: { days: 7; from: string; through: string };
  entries: EmergingRankingEntry[];
  formula: Array<{ signal: keyof EmergingSignals; label: string; points: number }>;
  integrity: {
    leaderboardOptInRequired: true;
    liveProfileRequired: true;
    paymentAmountAffectsRank: false;
    inkAffectsRank: false;
    subscriptionTierAffectsRank: false;
    sponsoredPlacementAffectsRank: false;
  };
};

export const EMERGING_FORMULA: EmergingRankingResponse['formula'] = [
  { signal: 'qualifiedListeners', label: 'qualified listener', points: 1 },
  { signal: 'repeatListeners', label: 'repeat listener day', points: 3 },
  { signal: 'follows', label: 'new follower', points: 4 },
  { signal: 'innerCircleJoins', label: 'new Inner Circle supporter', points: 5 },
  { signal: 'convertedShares', label: 'shared-listen conversion', points: 5 },
  { signal: 'sharedLoves', label: 'Love on a shared song', points: 1 },
  { signal: 'purchaseConversions', label: 'unique track buyer conversion', points: 8 },
];

export function emptyEmergingSignals(): EmergingSignals {
  return {
    qualifiedListeners: 0,
    repeatListeners: 0,
    follows: 0,
    innerCircleJoins: 0,
    convertedShares: 0,
    sharedLoves: 0,
    purchaseConversions: 0,
  };
}

export function emergingDayKey(at = new Date()): string {
  return at.toISOString().slice(0, 10);
}

export function emergingEntryPath(userId: string, at = new Date()): string {
  return `emergingSignals/${emergingDayKey(at)}/entries/${userId}`;
}

export function emergingScore(signals: EmergingSignals): number {
  return organicMomentumScore(signals);
}

export function emergingReasons(signals: EmergingSignals): string[] {
  const reasons = [
    signals.qualifiedListeners > 0 ? `${signals.qualifiedListeners} qualified listener${signals.qualifiedListeners === 1 ? '' : 's'}` : '',
    signals.repeatListeners > 0 ? `${signals.repeatListeners} repeat listen${signals.repeatListeners === 1 ? '' : 's'}` : '',
    signals.follows > 0 ? `${signals.follows} new follower${signals.follows === 1 ? '' : 's'}` : '',
    signals.innerCircleJoins > 0 ? `${signals.innerCircleJoins} Inner Circle join${signals.innerCircleJoins === 1 ? '' : 's'}` : '',
    signals.purchaseConversions > 0 ? `${signals.purchaseConversions} listener-to-buyer conversion${signals.purchaseConversions === 1 ? '' : 's'}` : '',
    signals.convertedShares > 0 ? `${signals.convertedShares} shared-listen conversion${signals.convertedShares === 1 ? '' : 's'}` : '',
    (signals.sharedLoves || 0) > 0 ? `${signals.sharedLoves} Love${signals.sharedLoves === 1 ? '' : 's'} on shared music` : '',
  ].filter(Boolean);
  return reasons.slice(0, 3);
}
