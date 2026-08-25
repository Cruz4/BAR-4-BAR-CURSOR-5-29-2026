export type SupportRelationshipState = {
  following: boolean;
  innerCircle: boolean;
  followerCount: number;
  innerCircleCount: number;
};

export type SupportRelationshipAction =
  | 'follow'
  | 'unfollow'
  | 'inner_circle_on'
  | 'inner_circle_off';

export function nextSupportRelationship(
  previousInnerCircle: boolean | null,
  action: SupportRelationshipAction
): { exists: boolean; innerCircle: boolean } {
  if (action === 'unfollow') return { exists: false, innerCircle: false };
  if (action === 'inner_circle_off' && previousInnerCircle === null) {
    return { exists: false, innerCircle: false };
  }
  return {
    exists: true,
    innerCircle:
      action === 'inner_circle_on'
        ? true
        : action === 'inner_circle_off'
          ? false
          : previousInnerCircle === true,
  };
}

export type SupportRelationshipRow = {
  userId: string;
  displayName: string;
  profileSlug?: string;
  innerCircle: boolean;
  createdAt: string;
  updatedAt: string;
  mutual?: boolean;
  engagement?: SupporterEngagement;
};

export type SupportAnalyticsWindow = 7 | 30 | 90;

export type SupporterEngagement = {
  qualifiedListeningDays: number;
  purchaseCount: number;
  totalPaidCents: number;
  periodPaidCents: number;
  firstQualifiedAt?: string;
  lastQualifiedAt?: string;
  firstPurchaseAt?: string;
  lastPurchaseAt?: string;
  lastSource?: string;
};

export type SupportTopSupporter = SupporterEngagement & {
  userId: string;
  displayName: string;
  profileSlug?: string;
  innerCircle: boolean;
  followsYou: boolean;
  mutual: boolean;
  periodPurchases: number;
  firstSupportedAt: string;
  lastSupportedAt: string;
  topTrackTitle?: string;
};

export type SupportGrowthDay = {
  day: string;
  newFollowers: number;
  newInnerCircle: number;
};

export type SupportDashboard = {
  windowDays: SupportAnalyticsWindow;
  followers: SupportRelationshipRow[];
  following: SupportRelationshipRow[];
  totals: {
    followers: number;
    innerCircleSupporters: number;
    following: number;
    inMyInnerCircle: number;
  };
  analytics: {
    newFollowers: number;
    newInnerCircle: number;
    activeFollowerListeners: number;
    repeatFollowerListeners: number;
    lifetimeFollowerBuyers: number;
    periodFollowerBuyers: number;
    repeatFollowerBuyers: number;
    mutualSupporters: number;
    publicProfileSupporters: number;
    periodPurchases: number;
    periodGrossCents: number;
    followerPeriodGrossCents: number;
    lifetimePurchases: number;
    lifetimeGrossCents: number;
    followerLifetimeGrossCents: number;
    rates: {
      innerCirclePercent: number;
      mutualPercent: number;
      activeListenerPercent: number;
      supporterBuyerPercent: number;
      repeatBuyerPercent: number;
      publicProfilePercent: number;
      supporterRevenuePercent: number;
    };
    growth: SupportGrowthDay[];
    sources: Array<{ source: string; supporters: number }>;
    topSupporters: SupportTopSupporter[];
  };
};
