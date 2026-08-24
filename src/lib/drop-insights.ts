export type DropInsightTotals = {
  qualifiedListeners: number;
  repeatListeners: number;
  completions: number;
  milestone25: number;
  purchases: number;
  repeatBuyers: number;
  grossCents: number;
};
export type DropInsightDay = {
  day: string;
  qualifiedListeners: number;
  repeatListeners: number;
  completions: number;
  purchases: number;
};

export type DropInsightTrack = {
  shareId: string;
  title: string;
  qualifiedListeners: number;
  repeatListeners: number;
  completions: number;
  purchases: number;
};

export type DropInsightsResponse = {
  days: number;
  totals: DropInsightTotals;
  rates: {
    qualifiedPercent: number;
    completionPercent: number;
    listenerToBuyerPercent: number;
  };
  sources: Record<string, number>;
  timeline: DropInsightDay[];
  tracks: DropInsightTrack[];
  integrity: {
    qualifiedAtPercent: 80;
    ownerActionsExcluded: true;
    paymentAmountAffectsOrganicRank: false;
  };
};
