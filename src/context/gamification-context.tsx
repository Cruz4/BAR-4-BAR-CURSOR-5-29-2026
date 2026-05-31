'use client';

import React, { createContext, useContext, useEffect, useRef, useState, ReactNode } from 'react';
import { doc } from 'firebase/firestore';
import { db } from '@/lib/firebase/client/firebase';
import { subscribeDocument } from '@/lib/firebase/client/firestore-subscribe';
import { useAuth } from '@/hooks/use-auth';
import { DEFAULT_GAMIFICATION_SUMMARY, type GamificationSummary } from '@/lib/gamification/types';
import { rankFromXp } from '@/lib/gamification/ranks';
import { getAchievement } from '@/lib/gamification/achievements';
import { isProUser } from '@/lib/subscription';
import { dispatchAchievementUnlocks } from '@/lib/gamification/unlock-events';

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

export function GamificationProvider({ children }: { children: ReactNode }) {
  const { user, authReady } = useAuth();
  const [summary, setSummary] = useState<GamificationSummary>(DEFAULT_GAMIFICATION_SUMMARY);
  const [loading, setLoading] = useState(true);
  const prevUnlocksRef = useRef<Set<string>>(new Set());
  const listenerReadyRef = useRef(false);

  useEffect(() => {
    if (!user?.id || !authReady) {
      setSummary(DEFAULT_GAMIFICATION_SUMMARY);
      prevUnlocksRef.current = new Set();
      listenerReadyRef.current = false;
      setLoading(false);
      return;
    }

    setLoading(true);
    const ref = doc(db, 'users', user.id, 'gamification', 'summary');
    const unsub = subscribeDocument(
      ref,
      (raw) => {
        const data = raw
          ? ({ ...DEFAULT_GAMIFICATION_SUMMARY, ...raw } as GamificationSummary)
          : DEFAULT_GAMIFICATION_SUMMARY;

        const currentIds = new Set(Object.keys(data.unlockedAchievements || {}));
        if (listenerReadyRef.current) {
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
        } else {
          listenerReadyRef.current = true;
        }

        prevUnlocksRef.current = currentIds;
        setSummary(data);
        setLoading(false);
      },
      (error) => {
        console.warn('Gamification listener error:', error);
        setLoading(false);
      }
    );

    return () => unsub();
  }, [user?.id, authReady]);

  const rankLabel = rankFromXp(summary.xp, isProUser(user)).label;

  return (
    <GamificationContext.Provider value={{ summary, rankLabel, loading }}>
      {children}
    </GamificationContext.Provider>
  );
}
