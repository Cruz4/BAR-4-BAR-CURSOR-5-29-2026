/** Shared analytics event names — client + server. */
export const ANALYTICS_EVENTS = {
  SIGNUP: 'signup',
  SESSION_START: 'session_start',
  PAGE_VIEW: 'page_view',
  TRACK_EDITOR_OPEN: 'track_editor_open',
  PRICING_VIEW: 'pricing_view',
  CHECKOUT_STARTED: 'checkout_started',
  CHECKOUT_COMPLETED: 'checkout_completed',
  UPGRADE_CLICK: 'upgrade_click',
  FREE_LIMIT_HIT: 'free_limit_hit',
  AI_ACTION: 'ai_action',
  ACHIEVEMENT_UNLOCKED: 'achievement_unlocked',
  QUEST_STEP_COMPLETE: 'quest_step_complete',
  STREAK_MILESTONE: 'streak_milestone',
  SHARE_CARD_GENERATED: 'share_card_generated',
  SHARE_CARD_OPENED: 'share_card_opened',
  LEADERBOARD_VIEW: 'leaderboard_view',
} as const;

export type AnalyticsEventName = (typeof ANALYTICS_EVENTS)[keyof typeof ANALYTICS_EVENTS];

export type AnalyticsEventPayload = {
  event: AnalyticsEventName;
  metadata?: Record<string, string | number | boolean | null>;
};
