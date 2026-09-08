'use client';

import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { setFoldBadgeCount } from '@/lib/app-badge-counts';
import { foldBackClient, markAllFoldsReadClient, markAllFoldsUnreadClient, markFoldReadClient, subscribeFolds } from '@/lib/folds/client';
import { peerIdOf, unreadFor, type FoldDoc } from '@/lib/folds/types';
import { useFoldsFeature } from '@/hooks/use-folds-feature';
import { FoldLiveSlip, type FoldSlip } from '@/components/folds/fold-live-slip';

type FoldInboxValue = {
  folds: FoldDoc[];
  unread: number;
  waiting: number;
  ready: boolean;
  markFoldRead: (foldId: string) => Promise<void>;
  markFoldUnread: (foldId: string) => Promise<void>;
  markAllFoldsRead: () => Promise<void>;
  markAllFoldsUnread: () => Promise<void>;
};

const FoldInboxContext = createContext<FoldInboxValue>({
  folds: [],
  unread: 0,
  waiting: 0,
  ready: false,
  markFoldRead: async () => undefined,
  markFoldUnread: async () => undefined,
  markAllFoldsRead: async () => undefined,
  markAllFoldsUnread: async () => undefined,
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
  const [heldUnread, setHeldUnread] = useState<Record<string, string>>({});
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
      setHeldUnread({});
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
        const arrived: Record<string, string> = {};
        for (const fold of next) {
          const prev = seenBarRef.current.get(fold.id);
          seenBarRef.current.set(fold.id, fold.lastBarId);
          if (!fold.lastBarId || fold.lastBarId === prev) continue;
          if (fold.lastSenderId === uid) continue;
          if (pathnameRef.current === `/msgs/${fold.id}`) continue;
          arrived[fold.id] = fold.lastBarId;
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
        if (Object.keys(arrived).length) {
          setHeldUnread((prev) => ({ ...prev, ...arrived }));
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

  useEffect(() => {
    const openId = pathname.startsWith('/msgs/') ? pathname.slice('/msgs/'.length) : '';
    if (!openId) return;
    setHeldUnread((prev) => {
      if (!prev[openId]) return prev;
      const next = { ...prev };
      delete next[openId];
      return next;
    });
  }, [pathname]);

  const foldsForUi = useMemo(() => {
    if (!user?.id) return folds;
    return folds.map((fold) => {
      if (fold.deletedFor?.[user.id]) return fold;
      if (!(heldUnread[fold.id] && heldUnread[fold.id] === fold.lastBarId)) return fold;
      if (unreadFor(fold, user.id) > 0) return fold;
      return {
        ...fold,
        unread: { ...fold.unread, [user.id]: 1 },
      };
    });
  }, [folds, heldUnread, user?.id]);

  const unread = useMemo(() => {
    if (!user?.id) return 0;
    return foldsForUi.reduce((sum, fold) => {
      if (fold.deletedFor?.[user.id]) return sum;
      return sum + unreadFor(fold, user.id);
    }, 0);
  }, [foldsForUi, user?.id]);
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

  const markFoldRead = useCallback(async (foldId: string) => {
    await markFoldReadClient(foldId);
    setHeldUnread((prev) => {
      if (!prev[foldId]) return prev;
      const next = { ...prev };
      delete next[foldId];
      return next;
    });
  }, []);

  const markFoldUnread = useCallback(async (foldId: string) => {
    await foldBackClient(foldId);
    setHeldUnread((prev) => {
      const fold = folds.find((item) => item.id === foldId);
      if (!fold?.lastBarId) return prev;
      return { ...prev, [foldId]: fold.lastBarId };
    });
  }, [folds]);

  const markAllFoldsRead = useCallback(async () => {
    await markAllFoldsReadClient();
    setHeldUnread({});
  }, []);

  const markAllFoldsUnread = useCallback(async () => {
    await markAllFoldsUnreadClient();
  }, []);

  const value = useMemo(
    () => ({
      folds: foldsForUi,
      unread,
      waiting,
      ready,
      markFoldRead,
      markFoldUnread,
      markAllFoldsRead,
      markAllFoldsUnread,
    }),
    [foldsForUi, unread, waiting, ready, markFoldRead, markFoldUnread, markAllFoldsRead, markAllFoldsUnread]
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
