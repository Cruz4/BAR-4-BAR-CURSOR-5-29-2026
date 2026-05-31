'use client';

import { auth } from '@/lib/firebase/client/firebase';
import type { GamificationTrigger, GamificationUnlock } from '@/lib/gamification/types';
import { dispatchAchievementUnlocks } from '@/lib/gamification/unlock-events';

async function authHeaders() {
  const user = auth.currentUser;
  if (!user) throw new Error('Not signed in');
  const token = await user.getIdToken();
  return { user, token };
}

export type GamificationEventResult = {
  unlocks: GamificationUnlock[];
  xpGain: number;
};

export async function postGamificationEvent(
  trigger: GamificationTrigger,
  metadata: Record<string, string | number | boolean | null> = {}
): Promise<GamificationEventResult> {
  try {
    const { user, token } = await authHeaders();
    const res = await fetch('/api/gamification/event', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        trigger,
        userId: user.uid,
        userName: user.displayName || 'Artist',
        metadata,
      }),
    });
    if (!res.ok) return { unlocks: [], xpGain: 0 };
    const data = (await res.json()) as GamificationEventResult;
    dispatchAchievementUnlocks(data.unlocks, data.xpGain ?? 0);
    return data;
  } catch {
    return { unlocks: [], xpGain: 0 };
  }
}

export async function patchGamificationSettings(settings: {
  publicProfile?: boolean;
  leaderboardHidden?: boolean;
  displayName?: string;
}) {
  const { user, token } = await authHeaders();
  const res = await fetch('/api/gamification/settings', {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ ...settings, userId: user.uid }),
  });
  if (!res.ok) throw new Error('Failed to update profile settings');
  return res.json();
}

export async function trackShareCardEvent(
  type: 'share_card_generated' | 'share_card_opened',
  metadata?: Record<string, string>
) {
  try {
    const user = auth.currentUser;
    if (!user) return;
    const token = await user.getIdToken();
    await fetch('/api/analytics/event', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ event: type, userId: user.uid, metadata: metadata || {} }),
    });
  } catch {
    /* non-blocking */
  }
}
