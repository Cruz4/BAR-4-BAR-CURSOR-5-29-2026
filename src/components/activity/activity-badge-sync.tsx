'use client';

/**
 * Keeps the installed-app icon badge in sync on every signed-in route —
 * not only pages that mount the Activity header/dock.
 */

import { useEffect } from 'react';
import { useActivityAlerts } from '@/hooks/use-activity-alerts';
import { syncAppBadge } from '@/lib/activity/app-badge';
import { getAppBadgeTotal } from '@/lib/app-badge-counts';

function pushBadgeToLauncher() {
  void syncAppBadge(getAppBadgeTotal());
}

export function ActivityBadgeSync() {
  useActivityAlerts();

  useEffect(() => {
    pushBadgeToLauncher();

    const onHide = () => {
      if (document.visibilityState === 'hidden') pushBadgeToLauncher();
    };
    const onPageHide = () => pushBadgeToLauncher();

    document.addEventListener('visibilitychange', onHide);
    window.addEventListener('pagehide', onPageHide);
    return () => {
      document.removeEventListener('visibilitychange', onHide);
      window.removeEventListener('pagehide', onPageHide);
    };
  }, []);

  return null;
}
