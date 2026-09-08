'use client';

/**
 * Keeps the installed-app icon badge in sync on every signed-in route —
 * not only pages that mount the Activity header/dock.
 */

import { useEffect } from 'react';
import { useActivityAlerts } from '@/hooks/use-activity-alerts';
import { syncAppBadge } from '@/lib/activity/app-badge';
import { getAppBadgeTotal } from '@/lib/app-badge-counts';

export function ActivityBadgeSync() {
  useActivityAlerts();

  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') {
        syncAppBadge(getAppBadgeTotal());
      }
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, []);

  return null;
}
