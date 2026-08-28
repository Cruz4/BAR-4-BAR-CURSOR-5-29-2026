/**
 * Artist Intelligence — private Support CRM overlay types.
 * Overlays live only under users/{uid}/supportCrm/{peerId} and are never shared.
 */

export type SupporterPriority = 'hot' | 'warm' | 'nurture' | 'snoozed' | 'cold';

export type SupportCrmRecommendedAction =
  | 'open_profile'
  | 'inner_circle_on'
  | 'inner_circle_off'
  | 'snooze'
  | 'add_note'
  | 'none';

export const SUPPORT_CRM_RECOMMENDED_ACTIONS = [
  'open_profile',
  'inner_circle_on',
  'inner_circle_off',
  'snooze',
  'add_note',
  'none',
] as const satisfies readonly SupportCrmRecommendedAction[];

export type SupportCrmOverlay = {
  peerId: string;
  notes: string;
  tags: string[];
  /** ISO — when set and in the future, priority is snoozed */
  snoozedUntil: string | null;
  updatedAt: string;
  updatedBy: string;
};

export type SupportCrmOverlayPatch = {
  notes?: string;
  tags?: string[];
  /** ISO or null to clear */
  snoozedUntil?: string | null;
};

export type ArtistIntelligencePerson = {
  peerId: string;
  displayName: string;
  profileSlug?: string;
  innerCircle: boolean;
  mutual: boolean;
  priority: SupporterPriority;
  reasons: string[];
  lastActivityAt: string | null;
  lastActivityLabel: string;
  recommendedAction: SupportCrmRecommendedAction;
  recommendedActionLabel: string;
  overlay: SupportCrmOverlay | null;
  engagement?: {
    qualifiedListeningDays: number;
    purchaseCount: number;
    totalPaidCents: number;
    periodPaidCents: number;
    lastQualifiedAt?: string;
    lastPurchaseAt?: string;
  };
};

export type ArtistIntelligenceSummary = {
  windowDays: 7 | 30 | 90;
  totals: {
    people: number;
    hot: number;
    warm: number;
    nurture: number;
    snoozed: number;
    cold: number;
    followers: number;
    innerCircle: number;
    periodGrossCents: number;
    qualifiedListeners: number;
  };
  people: ArtistIntelligencePerson[];
  copy: {
    emptyPeople: string;
    privacyNote: string;
  };
};

export const SUPPORT_CRM_PRIORITY_LABELS: Record<SupporterPriority, string> = {
  hot: 'Hot',
  warm: 'Warm',
  nurture: 'Nurture',
  snoozed: 'Snoozed',
  cold: 'Quiet',
};

export function supportCrmRecommendedActionLabel(action: SupportCrmRecommendedAction): string {
  switch (action) {
    case 'open_profile':
      return 'Open profile';
    case 'inner_circle_on':
      return 'Add to Inner Circle';
    case 'inner_circle_off':
      return 'Review Inner Circle';
    case 'snooze':
      return 'Snooze follow-up';
    case 'add_note':
      return 'Add a private note';
    default:
      return 'No action needed';
  }
}
