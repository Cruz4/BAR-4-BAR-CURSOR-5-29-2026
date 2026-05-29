'use client';

import { auth } from '@/lib/firebase/client/firebase';
import type { AnalyticsEventName } from '@/lib/analytics-events';

export async function trackStudioEvent(
  event: AnalyticsEventName,
  metadata: Record<string, string | number | boolean | null> = {}
): Promise<void> {
  const user = auth.currentUser;
  if (!user) return;

  try {
    const token = await user.getIdToken();
    await fetch('/api/analytics/event', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        event,
        userId: user.uid,
        userName: user.displayName || 'Artist',
        metadata,
      }),
    });
  } catch {
    // Non-blocking analytics
  }
}
