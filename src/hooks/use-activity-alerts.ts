'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { fetchActivityUnreadCount } from '@/lib/activity/client';
import { fetchFriendships } from '@/lib/profile/social-client';
import { syncAppBadge } from '@/lib/activity/app-badge';

export type ActivityAlertSummary = {
  /** Unread received activity (primary badge). */
  total: number;
  unreadReceived: number;
  /** Pending incoming friend requests (still useful for docks). */
  friendRequests: number;
};

const EMPTY: ActivityAlertSummary = { total: 0, unreadReceived: 0, friendRequests: 0 };
const POLL_MS = 45_000;
const REFRESH_EVENT = 'b4b-activity-alerts-refresh';

/** Call after marking read / responding so badges update immediately. */
export function refreshActivityAlerts() {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(REFRESH_EVENT));
}

/**
 * Unread activity badge — replaces the old localStorage-based social alerts.
 * Badge follows unread activity only so opening the bell (which marks seen
 * items read) clears the count. Pending friend requests stay on /activity.
 */
export function useActivityAlerts() {
  const { user } = useAuth();
  const [summary, setSummary] = useState<ActivityAlertSummary>(EMPTY);

  const refresh = useCallback(async () => {
    if (!user?.id) {
      setSummary(EMPTY);
      syncAppBadge(0);
      return;
    }
    try {
      const [unreadReceived, friendships] = await Promise.all([
        fetchActivityUnreadCount(),
        fetchFriendships(user.id).catch(() => []),
      ]);
      const friendRequests = friendships.filter(
        (f) => f.status === 'pending' && f.requestedBy !== user.id
      ).length;
      // Prefer activity unread; boost with live pending requests if higher
      // (covers the window before emit lands / before inbox open marks read).
      const total = unreadReceived;
      setSummary({ total, unreadReceived, friendRequests });
      syncAppBadge(total);
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
    window.addEventListener(REFRESH_EVENT, onRefresh);
    return () => {
      window.clearInterval(id);
      window.removeEventListener('focus', onFocus);
      window.removeEventListener(REFRESH_EVENT, onRefresh);
    };
  }, [user?.id, refresh]);

  return { ...summary, refresh };
}

/** @deprecated Use useActivityAlerts — kept as alias so old imports keep working. */
export const useSocialAlerts = useActivityAlerts;
