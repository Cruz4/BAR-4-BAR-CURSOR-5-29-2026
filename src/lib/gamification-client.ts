'use client';

import { auth } from '@/lib/firebase/client/firebase';
import type { GamificationSummary, GamificationTrigger, GamificationUnlock } from '@/lib/gamification/types';
import {
  dispatchAchievementUnlocks,
  dispatchGamificationSummaryPatch,
} from '@/lib/gamification/unlock-events';

async function authHeaders() {
  const user = auth.currentUser;
  if (!user) throw new Error('Not signed in');
  const token = await user.getIdToken();
  return { user, token };
}

export type GamificationEventResult = {
  unlocks: GamificationUnlock[];
  summary: GamificationSummary;
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
    if (!res.ok) return { unlocks: [], summary: {} as GamificationSummary, xpGain: 0 };
    const data = (await res.json()) as GamificationEventResult;
    if (data.summary) {
      dispatchGamificationSummaryPatch(data.summary);
    }
    dispatchAchievementUnlocks(data.unlocks, data.xpGain ?? 0);
    return data;
  } catch {
    return { unlocks: [], summary: {} as GamificationSummary, xpGain: 0 };
  }
}

export async function patchGamificationSettings(settings: {
  publicProfile?: boolean;
  leaderboardHidden?: boolean;
  displayName?: string;
  profilePhotoMode?: 'collage' | 'custom' | 'initials';
  profilePhotoUrl?: string | null;
  profileCollageAlbumIds?: string[] | null;
  starMarkUseStar?: boolean;
  starMarkSeed?: number;
  starMarkSlots?: Array<{
    id: string;
    seed: number;
    lockedAt: string;
    label: string;
  }> | null;
  starMarkPinnedSlotId?: string | null;
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
  if (!res.ok) {
    let message = 'Failed to update profile settings';
    try {
      const body = (await res.json()) as { error?: string };
      if (body?.error) message = body.error;
    } catch {
      /* ignore */
    }
    throw new Error(message);
  }
  const data = await res.json();
  if (data.summary) {
    dispatchGamificationSummaryPatch(data.summary);
  }
  return data;
}

export async function fetchGamificationSummary(userId: string): Promise<GamificationSummary | null> {
  try {
    const { token } = await authHeaders();
    const res = await fetch(`/api/gamification/summary?userId=${encodeURIComponent(userId)}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { summary?: GamificationSummary };
    return data.summary ?? null;
  } catch {
    return null;
  }
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
