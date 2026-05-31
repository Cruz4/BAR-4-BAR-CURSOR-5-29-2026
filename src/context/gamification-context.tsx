'use client';

import React, { createContext, useContext, useEffect, useRef, useState, ReactNode } from 'react';
import { doc } from 'firebase/firestore';
import { db } from '@/lib/firebase/client/firebase';
import { subscribeDocument } from '@/lib/firebase/client/firestore-subscribe';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { DEFAULT_GAMIFICATION_SUMMARY, type GamificationSummary } from '@/lib/gamification/types';
import { rankFromXp } from '@/lib/gamification/ranks';
import { getAchievement } from '@/lib/gamification/achievements';
import { isProUser } from '@/lib/subscription';

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
  const { toast } = useToast();
  const [summary, setSummary] = useState<GamificationSummary>(DEFAULT_GAMIFICATION_SUMMARY);
  const [loading, setLoading] = useState(true);
  const prevUnlocksRef = useRef<Set<string>>(new Set());
  const toastRef = useRef(toast);
  toastRef.current = toast;

  useEffect(() => {
    const onUnlock = (e: Event) => {
      const detail = (e as CustomEvent).detail as {
        unlocks?: Array<{ id: string; title: string; description: string; inkReward: number }>;
      };
      detail?.unlocks?.forEach((u) => {
        toastRef.current({
          title: `Achievement unlocked: ${u.title}`,
          description: u.inkReward
            ? `${u.description} (+${u.inkReward} Ink)`
            : u.description,
        });
      });
    };
    window.addEventListener('b4b-achievement-unlock', onUnlock);
    return () => window.removeEventListener('b4b-achievement-unlock', onUnlock);
  }, []);

  useEffect(() => {
    if (!user?.id || !authReady) {
      setSummary(DEFAULT_GAMIFICATION_SUMMARY);
      prevUnlocksRef.current = new Set();
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
        if (prevUnlocksRef.current.size > 0) {
          for (const id of currentIds) {
            if (!prevUnlocksRef.current.has(id)) {
              const def = getAchievement(id);
              if (def) {
                toastRef.current({
                  title: `Achievement unlocked: ${def.title}`,
                  description: def.inkReward
                    ? `${def.description} (+${def.inkReward} Ink)`
                    : def.description,
                });
              }
            }
          }
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
