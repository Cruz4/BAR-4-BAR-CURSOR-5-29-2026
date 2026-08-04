'use client';

/**
 * Re-export so existing imports of useSocialAlerts keep working,
 * now backed by the activity unread system.
 */
export { useActivityAlerts as useSocialAlerts, useActivityAlerts, refreshActivityAlerts } from '@/hooks/use-activity-alerts';
