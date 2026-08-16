'use client';

import { useEffect, useState } from 'react';
import {
  DEFAULT_HOUSE_BAR,
  DEFAULT_WEEKLY_CHALLENGE,
  type SceneLivePublic,
} from '@/lib/scene/live-events';

export async function fetchSceneLive(): Promise<SceneLivePublic> {
  try {
    const res = await fetch('/api/scene/live', { cache: 'no-store' });
    if (!res.ok) {
      return { houseBar: DEFAULT_HOUSE_BAR, weeklyChallenge: DEFAULT_WEEKLY_CHALLENGE };
    }
    const data = (await res.json()) as Partial<SceneLivePublic>;
    return {
      houseBar: { ...DEFAULT_HOUSE_BAR, ...data.houseBar },
      weeklyChallenge: { ...DEFAULT_WEEKLY_CHALLENGE, ...data.weeklyChallenge },
    };
  } catch {
    return { houseBar: DEFAULT_HOUSE_BAR, weeklyChallenge: DEFAULT_WEEKLY_CHALLENGE };
  }
}

export function useSceneLive() {
  const [live, setLive] = useState<SceneLivePublic | null>(null);

  useEffect(() => {
    let cancelled = false;
    void fetchSceneLive().then((data) => {
      if (!cancelled) setLive(data);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const resolved = live ?? {
    houseBar: DEFAULT_HOUSE_BAR,
    weeklyChallenge: DEFAULT_WEEKLY_CHALLENGE,
  };

  return {
    live: resolved,
    loaded: live !== null,
    houseBarOn: Boolean(resolved.houseBar.enabled && resolved.houseBar.seedBar.trim()),
    weeklyOn: Boolean(resolved.weeklyChallenge.enabled),
  };
}
