'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import {
  fetchSocialAlertSummary,
  type SocialAlertSummary,
} from '@/lib/profile/social-alerts';

const EMPTY: SocialAlertSummary = { total: 0, friendRequests: 0, newFriendPosts: 0 };
const POLL_MS = 60_000;

/** Pending friend requests + unread friend posts for The Block badge. */
export function useSocialAlerts() {
  const { user } = useAuth();
  const [summary, setSummary] = useState<SocialAlertSummary>(EMPTY);

  const refresh = useCallback(async () => {
    if (!user?.id) {
      setSummary(EMPTY);
      return;
    }
    try {
      const next = await fetchSocialAlertSummary(user.id);
      setSummary(next);
    } catch {
      /* keep last good count */
    }
  }, [user?.id]);

  useEffect(() => {
    void refresh();
    if (!user?.id) return;
    const id = window.setInterval(() => void refresh(), POLL_MS);
    const onFocus = () => void refresh();
    window.addEventListener('focus', onFocus);
    return () => {
      window.clearInterval(id);
      window.removeEventListener('focus', onFocus);
    };
  }, [user?.id, refresh]);

  return { ...summary, refresh };
}
