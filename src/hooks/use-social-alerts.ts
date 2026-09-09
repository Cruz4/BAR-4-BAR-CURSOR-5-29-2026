'use client';

/**
 * Re-export so existing imports of useSocialAlerts keep working,
 * while polling runs once from ActivityAlertsProvider.
 */
export {
  ActivityAlertsProvider,
  refreshActivityAlerts,
  useActivityAlerts,
  useActivityAlerts as useSocialAlerts,
} from '@/context/activity-alerts-context';
