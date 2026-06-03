'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { trackStudioEvent } from '@/lib/analytics-client';
import { ANALYTICS_EVENTS } from '@/lib/analytics-events';

/** Sends page_view through the first-party analytics API (Firestore + admin rollups). */
export function ProductAnalytics() {
  const pathname = usePathname();
  const { user, authReady, loading } = useAuth();
  const lastPathRef = useRef<string | null>(null);

  useEffect(() => {
    if (!user || !authReady || loading) return;
    if (!pathname || pathname === lastPathRef.current) return;
    lastPathRef.current = pathname;
    void trackStudioEvent(ANALYTICS_EVENTS.PAGE_VIEW, { path: pathname });
  }, [pathname, user?.id, authReady, loading]);

  return null;
}
