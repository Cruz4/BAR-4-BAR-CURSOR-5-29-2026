'use client';

export {
  ActivityAlertsProvider,
  refreshActivityAlerts,
  useActivityAlerts,
  type ActivityAlertSummary,
} from '@/context/activity-alerts-context';

/** @deprecated Use useActivityAlerts — kept as alias so old imports keep working. */
export { useActivityAlerts as useSocialAlerts } from '@/context/activity-alerts-context';
