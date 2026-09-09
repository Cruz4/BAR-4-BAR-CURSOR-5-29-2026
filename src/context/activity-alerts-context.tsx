'use client';

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { bustActivitySummaryCache, fetchActivitySummary } from '@/lib/activity/client';
import { ACTIVITY_ALERTS_REFRESH_EVENT } from '@/lib/activity/alerts-events';
import { setActivityBadgeCount } from '@/lib/app-badge-counts';

export type ActivityAlertSummary = {
  /** Unread received activity (primary badge). */
  total: number;
  unreadReceived: number;
  /** Unread admin House-release pings used by the Scene Library shortcut. */
  libraryReleases: number;
};

const EMPTY: ActivityAlertSummary = {
  total: 0,
  unreadReceived: 0,
  libraryReleases: 0,
};

const POLL_MS = 45_000;

/** Call after marking read / responding so badges update immediately. */
export function refreshActivityAlerts() {
  if (typeof window === 'undefined') return;
  bustActivitySummaryCache();
  window.dispatchEvent(new CustomEvent(ACTIVITY_ALERTS_REFRESH_EVENT));
}

type ActivityAlertsContextValue = ActivityAlertSummary & {
  refresh: () => Promise<void>;
};

const ActivityAlertsContext = createContext<ActivityAlertsContextValue | null>(null);

export function ActivityAlertsProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [summary, setSummary] = useState<ActivityAlertSummary>(EMPTY);

  const refresh = useCallback(async () => {
    if (!user?.id) {
      setSummary(EMPTY);
      setActivityBadgeCount(0);
      return;
    }
    try {
      const activity = await fetchActivitySummary();
      const total = activity.unreadReceived;
      setSummary({
        total,
        unreadReceived: activity.unreadReceived,
        libraryReleases: activity.unreadHouseReleases,
      });
      setActivityBadgeCount(total);
    } catch {
      /* keep last good count */
    }
  }, [user?.id]);

  useEffect(() => {
    void refresh();
    if (!user?.id) return;

    const id = window.setInterval(() => void refresh(), POLL_MS);
    const onFocus = () => void refresh();
    const onRefresh = () => void refresh();
    window.addEventListener('focus', onFocus);
    window.addEventListener(ACTIVITY_ALERTS_REFRESH_EVENT, onRefresh);
    return () => {
      window.clearInterval(id);
      window.removeEventListener('focus', onFocus);
      window.removeEventListener(ACTIVITY_ALERTS_REFRESH_EVENT, onRefresh);
    };
  }, [user?.id, refresh]);

  const value = useMemo(
    () => ({
      ...summary,
      refresh,
    }),
    [summary, refresh]
  );

  return <ActivityAlertsContext.Provider value={value}>{children}</ActivityAlertsContext.Provider>;
}

export function useActivityAlerts(): ActivityAlertSummary & { refresh: () => Promise<void> } {
  const ctx = useContext(ActivityAlertsContext);
  if (!ctx) {
    return { ...EMPTY, refresh: async () => undefined };
  }
  return ctx;
}
