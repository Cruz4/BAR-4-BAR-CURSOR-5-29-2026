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
  LOW_INK_HIT: 'low_ink_hit',
  INK_DEPLETION: 'ink_depletion',
  TRIAL_QUEST_COMPLETE: 'trial_quest_complete',
  FREE_LIMIT_HIT: 'free_limit_hit',
  AI_ACTION: 'ai_action',
  ACHIEVEMENT_UNLOCKED: 'achievement_unlocked',
  QUEST_STEP_COMPLETE: 'quest_step_complete',
  STREAK_MILESTONE: 'streak_milestone',
  SHARE_CARD_GENERATED: 'share_card_generated',
  SHARE_CARD_OPENED: 'share_card_opened',
  LEADERBOARD_VIEW: 'leaderboard_view',
  USER_ACTIVATED: 'user_activated',
  // Artist Home social surfaces
  PROFILE_POST_CREATED: 'profile_post_created',
  PROFILE_REVERB: 'profile_reverb',
  PROFILE_FRIEND_REQUEST: 'profile_friend_request',
  PROFILE_FRIEND_ACCEPT: 'profile_friend_accept',
  PROFILE_GUESTBOOK_SIGNED: 'profile_guestbook_signed',
  DROP_CHECKOUT_STARTED: 'drop_checkout_started',
  DROP_PURCHASE: 'drop_purchase',
  DROP_SALE_RECORDED: 'drop_sale_recorded',
  DROP_CONNECT_STARTED: 'drop_connect_started',
} as const;

export type AnalyticsEventName = (typeof ANALYTICS_EVENTS)[keyof typeof ANALYTICS_EVENTS];

export type AnalyticsEventPayload = {
  event: AnalyticsEventName;
  metadata?: Record<string, string | number | boolean | null>;
};
