'use client';

import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { setFoldBadgeCount } from '@/lib/app-badge-counts';
import { subscribeFolds } from '@/lib/folds/client';
import { peerIdOf, unreadFor, type FoldDoc } from '@/lib/folds/types';
import { useFoldsFeature } from '@/hooks/use-folds-feature';
import { FoldLiveSlip, type FoldSlip } from '@/components/folds/fold-live-slip';

type FoldInboxValue = {
  folds: FoldDoc[];
  unread: number;
  waiting: number;
  ready: boolean;
};

const FoldInboxContext = createContext<FoldInboxValue>({
  folds: [],
  unread: 0,
  waiting: 0,
  ready: false,
});

export function useFoldInbox() {
  return useContext(FoldInboxContext);
}

export function FoldInboxProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const { enabled: foldsOn } = useFoldsFeature();
  const pathname = usePathname();
  const pathnameRef = useRef(pathname);
  pathnameRef.current = pathname;
  const [folds, setFolds] = useState<FoldDoc[]>([]);
  const [ready, setReady] = useState(false);
  const [slip, setSlip] = useState<FoldSlip | null>(null);
  const seenBarRef = useRef<Map<string, string>>(new Map());
  const primedRef = useRef(false);
  const slipTimer = useRef<number | null>(null);

  useEffect(() => {
    if (!user?.id || !foldsOn) {
      setFolds([]);
      setReady(true);
      setFoldBadgeCount(0);
      primedRef.current = false;
      seenBarRef.current = new Map();
      setSlip(null);
      return;
    }
    setReady(false);
    const uid = user.id;
    const unsub = subscribeFolds(
      uid,
      (next) => {
        setFolds(next);
        setReady(true);
        if (!primedRef.current) {
          next.forEach((fold) => seenBarRef.current.set(fold.id, fold.lastBarId));
          primedRef.current = true;
          return;
        }
        for (const fold of next) {
          const prev = seenBarRef.current.get(fold.id);
          seenBarRef.current.set(fold.id, fold.lastBarId);
          if (!fold.lastBarId || fold.lastBarId === prev) continue;
          if (fold.lastSenderId === uid) continue;
          if (pathnameRef.current === `/folds/${fold.id}`) continue;
          const peer = fold.members[peerIdOf(fold.memberIds, uid)];
          setSlip({
            id: fold.lastBarId,
            foldId: fold.id,
            name: peer?.name || 'Artist',
            text: fold.lastBar,
          });
          if (slipTimer.current) window.clearTimeout(slipTimer.current);
          slipTimer.current = window.setTimeout(() => setSlip(null), 8000);
        }
      },
      (err) => {
        console.warn('[folds inbox]', err);
        setReady(true);
      }
    );
    return () => {
      unsub();
      if (slipTimer.current) window.clearTimeout(slipTimer.current);
    };
  }, [user?.id, foldsOn]);

  const unread = useMemo(
    () => (user?.id ? folds.reduce((sum, fold) => sum + unreadFor(fold, user.id), 0) : 0),
    [folds, user?.id]
  );
  const waiting = useMemo(
    () =>
      user?.id
        ? folds.filter((fold) => fold.status === 'pending' && fold.initiatedBy !== user.id).length
        : 0,
    [folds, user?.id]
  );

  useEffect(() => {
    setFoldBadgeCount(unread);
  }, [unread]);

  const value = useMemo(
    () => ({ folds, unread, waiting, ready }),
    [folds, unread, waiting, ready]
  );

  return (
    <FoldInboxContext.Provider value={value}>
      {children}
      {foldsOn && slip ? <FoldLiveSlip slip={slip} onDismiss={() => setSlip(null)} /> : null}
    </FoldInboxContext.Provider>
  );
}

export function useFoldUnread(): number {
  return useFoldInbox().unread;
}
