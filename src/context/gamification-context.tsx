'use client';

import React, { createContext, useContext, useEffect, useRef, useState, ReactNode } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { DEFAULT_GAMIFICATION_SUMMARY, type GamificationSummary } from '@/lib/gamification/types';
import { rankFromXp } from '@/lib/gamification/ranks';
import { prestigeTallyLabel } from '@/lib/gamification/prestige';
import { getAchievement } from '@/lib/gamification/achievements';
import { isProUser } from '@/lib/subscription';
import {
  createPersonalBestCelebrationState,
  detectProgressCelebrations,
  dispatchProgressCelebrations,
  syncPersonalBestCelebrationState,
  type PersonalBestCelebrationState,
} from '@/lib/gamification/progress-celebrations';
import { getDayKey } from '@/lib/gamification/challenges';
import {
  dispatchAchievementUnlocks,
  GAMIFICATION_SUMMARY_PATCH_EVENT,
} from '@/lib/gamification/unlock-events';
import { waitForAuthUser } from '@/lib/firebase/client/auth-ready';
import { fetchGamificationSummary } from '@/lib/gamification-client';
import { seedCelebrationsSeenFromSummary } from '@/lib/gamification/celebration-seen';

type GamificationContextType = {
  summary: GamificationSummary;
  rankLabel: string;
  loading: boolean;
};

const GamificationContext = createContext<GamificationContextType>({
  summary: DEFAULT_GAMIFICATION_SUMMARY,
  rankLabel: 'Open Mic',
  loading: true,
});

export function useGamification() {
  return useContext(GamificationContext);
}

/** Slow safety-net sync when the tab is visible; real-time updates use patch events. */
const SUMMARY_SYNC_INTERVAL_MS = 60_000;

export function GamificationProvider({ children }: { children: ReactNode }) {
  const { user, authReady } = useAuth();
  const [summary, setSummary] = useState<GamificationSummary>(DEFAULT_GAMIFICATION_SUMMARY);
  const [loading, setLoading] = useState(true);
  const prevUnlocksRef = useRef<Set<string>>(new Set());
  const summaryHydratedRef = useRef(false);
  const summaryFetchGenRef = useRef(0);
  const prevSummaryRef = useRef<GamificationSummary | null>(null);
  const pbCelebrationRef = useRef<PersonalBestCelebrationState | null>(null);

  useEffect(() => {
    if (!user?.id || !authReady) {
      setSummary(DEFAULT_GAMIFICATION_SUMMARY);
      prevUnlocksRef.current = new Set();
      summaryHydratedRef.current = false;
      summaryFetchGenRef.current = 0;
      prevSummaryRef.current = null;
      pbCelebrationRef.current = null;
      setLoading(false);
      return;
    }

    let cancelled = false;
    let inFlight = false;
    setLoading(true);

    const applySummary = (raw: GamificationSummary | null) => {
      if (raw === null) {
        if (!summaryHydratedRef.current) setLoading(false);
        return;
      }

      const data = { ...DEFAULT_GAMIFICATION_SUMMARY, ...raw } as GamificationSummary;
      const currentIds = new Set(Object.keys(data.unlockedAchievements || {}));

      if (!summaryHydratedRef.current) {
        summaryHydratedRef.current = true;
        prevUnlocksRef.current = currentIds;
        prevSummaryRef.current = data;
        pbCelebrationRef.current = createPersonalBestCelebrationState(data, getDayKey());
        seedCelebrationsSeenFromSummary(user.id, data, isProUser(user));
      } else {
        const newUnlocks = [...currentIds]
          .filter((id) => !prevUnlocksRef.current.has(id))
          .map((id) => {
            const def = getAchievement(id);
            if (!def) return null;
            return {
              id: def.id,
              title: def.title,
              description: def.description,
              inkReward: def.inkReward,
              xpReward: def.xpReward,
              proOnly: def.proOnly,
            };
          })
          .filter(Boolean) as Array<{
          id: string;
          title: string;
          description: string;
          inkReward: number;
          xpReward: number;
          proOnly?: boolean;
        }>;

        if (newUnlocks.length) {
          dispatchAchievementUnlocks(newUnlocks);
        }
        prevUnlocksRef.current = currentIds;
        if (pbCelebrationRef.current) {
          syncPersonalBestCelebrationState(pbCelebrationRef.current, data, getDayKey());
        }
      }

      setSummary(data);
      setLoading(false);
    };

    const pullSummary = async () => {
      if (cancelled || inFlight) return;
      inFlight = true;
      const fetchGen = ++summaryFetchGenRef.current;
      try {
        const firebaseUser = await waitForAuthUser();
        if (cancelled || !firebaseUser || firebaseUser.uid !== user.id) {
          if (!cancelled) setLoading(false);
          return;
        }

        const data = await fetchGamificationSummary(user.id);
        if (cancelled || fetchGen !== summaryFetchGenRef.current) return;
        applySummary(data);
      } finally {
        inFlight = false;
      }
    };

    void pullSummary();

    const onVisible = () => {
      if (document.visibilityState === 'visible') void pullSummary();
    };
    const onFocus = () => void pullSummary();

    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', onFocus);

    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible') void pullSummary();
    }, SUMMARY_SYNC_INTERVAL_MS);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', onFocus);
    };
  }, [user?.id, authReady]);

  useEffect(() => {
    const onPatch = (e: Event) => {
      const patch = (e as CustomEvent<GamificationSummary>).detail;
      if (!patch) return;
      setSummary((prev) => {
        const merged = {
          ...DEFAULT_GAMIFICATION_SUMMARY,
          ...prev,
          ...patch,
          unlockedAchievements: {
            ...(prev.unlockedAchievements || {}),
            ...(patch.unlockedAchievements || {}),
          },
          personalBests: {
            ...DEFAULT_GAMIFICATION_SUMMARY.personalBests,
            ...(prev.personalBests || {}),
            ...(patch.personalBests || {}),
          },
        } as GamificationSummary;
        prevUnlocksRef.current = new Set(Object.keys(merged.unlockedAchievements || {}));
        return merged;
      });
    };
    window.addEventListener(GAMIFICATION_SUMMARY_PATCH_EVENT, onPatch);
    return () => window.removeEventListener(GAMIFICATION_SUMMARY_PATCH_EVENT, onPatch);
  }, []);

  useEffect(() => {
    if (loading || !user?.id || !summaryHydratedRef.current) return;

    const prev = prevSummaryRef.current;
    if (!prev) {
      prevSummaryRef.current = summary;
      return;
    }

    if (pbCelebrationRef.current) {
      syncPersonalBestCelebrationState(pbCelebrationRef.current, summary, getDayKey());
      const celebrations = detectProgressCelebrations(
        prev,
        summary,
        isProUser(user),
        pbCelebrationRef.current
      );
      if (celebrations.length) {
        dispatchProgressCelebrations(celebrations);
      }
    }

    prevSummaryRef.current = summary;
  }, [summary, loading, user]);

  const rank = rankFromXp(summary.xp, isProUser(user));
  const prestigeTag = prestigeTallyLabel(summary.prestigeLevel);
  const rankLabel = prestigeTag ? `${rank.label} · ${prestigeTag}` : rank.label;

  return (
    <GamificationContext.Provider value={{ summary, rankLabel, loading }}>
      {children}
    </GamificationContext.Provider>
  );
}
