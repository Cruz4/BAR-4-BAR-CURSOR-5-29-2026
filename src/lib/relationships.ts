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
};

export type SupportDashboard = {
  followers: SupportRelationshipRow[];
  following: SupportRelationshipRow[];
  totals: {
    followers: number;
    innerCircleSupporters: number;
    following: number;
    inMyInnerCircle: number;
  };
};
