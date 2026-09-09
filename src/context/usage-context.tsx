'use client';

import React, { createContext, useState, useEffect, ReactNode, useCallback, useContext, useRef } from 'react';
import type { AIUsageLog } from '@/lib/types';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { db, auth } from '@/lib/firebase/client/firebase';
import { doc, collection, query, orderBy, limit } from 'firebase/firestore';
import { subscribeDocument, subscribeQuery } from '@/lib/firebase/client/firestore-subscribe';
import { syncUserUsageBootstrap } from '@/lib/init-user-usage-client';
import { waitForAuthUser } from '@/lib/firebase/client/auth-ready';
import { computeActiveRules } from '@/lib/active-rules';
import type { ActiveRules } from '@/components/dna-synthesis-loader';
import type { Album, StyleProfile, Track } from '@/lib/types';
import { trackLowInkHit } from '@/lib/conversion-analytics';
import { totalInkBalance } from '@/lib/ink-balance';
import { ZeroInkDialog } from '@/components/zero-ink-dialog';

export type AiSpendContext = {
  track: Track;
  album: Album;
  styleProfile?: StyleProfile | null;
};

interface UsageContextType {
  usageHistory: any[];
  inkBalance: number;
  residencyBalance: number;
  trialInkBalance: number;
  purchasedBalance: number;
  loading: boolean;
  lastSpent: { amount: number; pressX: number; pressY: number; currentX: number; currentY: number; activeRules?: ActiveRules; actionName?: string } | null;
  mousePos: { x: number; y: number };
  addUsageLog: (log: Omit<AIUsageLog, 'id' | 'timestamp'>) => void;
  /**
   * Client-side balance gate + spend animation only.
   * Real Ink deduction happens server-side in `runSecuredAiAction`.
   * Returns false when the local balance cannot cover the amount.
   */
  deductInk: (amount: number, actionName: string, mouseEvent?: any) => boolean;
  /**
   * Dismisses the local spend animation after a failed AI call.
   * Does not credit Ink — server refunds inside `runSecuredAiAction` on failure.
   */
  refundInk: (amount: number, reason?: string) => void;
  /** No-op stub — Ink grants are fulfilled server-side (Stripe / residency). */
  addInk: (amount: number) => void;
  registerAiContext: (ctx: AiSpendContext | null) => void;
}

export const UsageContext = createContext<UsageContextType | undefined>(undefined);

export const useUsage = () => {
    const context = useContext(UsageContext);
    if (!context) {
        throw new Error('useUsage must be used within a UsageProvider');
    }
    return context;
}

export const UsageProvider = ({ children }: { children: ReactNode }) => {
  const { user, authReady } = useAuth();
  const { toast } = useToast();
  const [usageHistory, setUsageHistory] = useState<any[]>([]);
  const [inkBalance, setInkBalance] = useState<number>(0);
  const [residencyBalance, setResidencyBalance] = useState<number>(0);
  const [trialInkBalance, setTrialInkBalance] = useState<number>(0);
  const [purchasedBalance, setPurchasedBalance] = useState<number>(0);
  const [lastSpent, setLastSpent] = useState<{ amount: number; pressX: number; pressY: number; currentX: number; currentY: number; activeRules?: ActiveRules; actionName?: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  
  const hasInitializedRef = useRef(false);
  const aiContextRef = useRef<AiSpendContext | null>(null);
  const [zeroInkOpen, setZeroInkOpen] = useState(false);
  const [zeroInkAction, setZeroInkAction] = useState<string | undefined>();
  const zeroInkShownRef = useRef(false);

  const registerAiContext = useCallback((ctx: AiSpendContext | null) => {
    aiContextRef.current = ctx;
  }, []);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
        setMousePos({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  const addUsageLog = useCallback((_log: Omit<AIUsageLog, 'id' | 'timestamp'>) => {
      // System log handled via Firestore addDoc in deductInk
  }, []);

  useEffect(() => {
    if (!user || !authReady) {
      if (!user) {
        setLoading(false);
        setUsageHistory([]);
      }
      return;
    }

    let cancelled = false;
    let unsubBalance: (() => void) | null = null;
    let unsubLogs: (() => void) | null = null;
    setLoading(true);
    hasInitializedRef.current = false;
    const balanceRef = doc(db, 'users', user.id, 'usage', 'balance');
    
    const setupListeners = async () => {
      const firebaseUser = await waitForAuthUser();
      if (cancelled || !firebaseUser || firebaseUser.uid !== user.id) return;

      const forceRefresh = firebaseUser.emailVerified === true;
      syncUserUsageBootstrap(forceRefresh).catch((e) => console.warn('Usage init skipped:', e));

      if (cancelled) return;

      unsubBalance = subscribeDocument(
        balanceRef,
        (data) => {
        if (data) {
          const res = data.residencyBalance || 0;
          const trial = data.trialInkBalance || 0;
          const pur = data.purchasedBalance || 0;
          setResidencyBalance(res);
          setTrialInkBalance(trial);
          setPurchasedBalance(pur);
          setInkBalance(totalInkBalance({ residencyBalance: res, trialInkBalance: trial, purchasedBalance: pur }));
        } else {
          setResidencyBalance(0);
          setTrialInkBalance(0);
          setPurchasedBalance(0);
          setInkBalance(0);
        }
        hasInitializedRef.current = true;
        setLoading(false);
      }, (error) => {
        console.warn("Balance listener error", error);
        setLoading(false);
      });

      const logsRef = collection(db, 'users', user.id, 'usageLogs');
      const logLimit = process.env.NODE_ENV === 'development' ? 25 : 50;
      const q = query(logsRef, orderBy('timestamp', 'desc'), limit(logLimit));
      unsubLogs = subscribeQuery(q, (logs) => {
          setUsageHistory(logs);
      }, (error) => {
          console.warn("Usage history listener error", error);
          setUsageHistory([]);
      });
    };

    void setupListeners();

    return () => {
      cancelled = true;
      unsubBalance?.();
      unsubLogs?.();
      unsubBalance = null;
      unsubLogs = null;
    };
  }, [user, authReady]);

  const deductInk = useCallback((amount: number, actionName: string, mouseEvent?: any) => {
    if (!user) return false;

    // Free / zero-cost actions skip the preview animation and balance gate.
    const finalAmount = Math.max(0, Math.ceil(amount));
    if (finalAmount <= 0) return true;

    if (inkBalance < finalAmount) {
        trackLowInkHit(actionName, finalAmount, inkBalance);
        setZeroInkAction(actionName);
        if (!zeroInkShownRef.current) {
          zeroInkShownRef.current = true;
          setZeroInkOpen(true);
        } else {
          toast({
            variant: 'destructive',
            title: 'Not enough Ink',
            description: `You need ${finalAmount} Ink — you have ${inkBalance.toLocaleString()}.`,
            duration: 5000,
          });
        }
        return false;
    }
    
    const pressX = mouseEvent?.clientX || mousePos.x || window.innerWidth / 2;
    const pressY = mouseEvent?.clientY || mousePos.y || window.innerHeight / 2;
    const ctx = aiContextRef.current;
    const activeRules = ctx
      ? computeActiveRules(ctx.track, ctx.album, ctx.styleProfile)
      : undefined;
    
    setLastSpent({ 
        amount: finalAmount, 
        pressX, 
        pressY, 
        currentX: mousePos.x, 
        currentY: mousePos.y,
        activeRules,
        actionName,
    });

    // Ink is deducted server-side only (runSecuredAiAction). Client shows preview animation + balance check.
    return true;
  }, [inkBalance, user, toast, mousePos]);

  const refundInk = useCallback((_amount: number, _reason: string = 'AI Error') => {
    // Real refunds happen server-side in runSecuredAiAction when AI fails after deduction.
    // Clear the floating spend preview so the UI does not look like Ink stayed charged.
    setLastSpent(null);
  }, []);

  const addInk = useCallback((_amount: number) => {
    // Ink purchases / grants are fulfilled server-side (Stripe webhook, residency, milestones).
  }, []);

  useEffect(() => {
    if (inkBalance > 0) {
      zeroInkShownRef.current = false;
    }
  }, [inkBalance]);

  /** Retry welcome Ink bootstrap when verified users still show zero after first sync. */
  useEffect(() => {
    if (!user || loading || inkBalance > 0) return;
    const firebaseUser = auth.currentUser;
    if (!firebaseUser) return;
    if (!firebaseUser.emailVerified && !user.pendingWelcomeInk) return;

    const retryTimer = window.setTimeout(() => {
      syncUserUsageBootstrap(true).catch((e) => console.warn('Usage init retry skipped:', e));
    }, 2500);

    return () => window.clearTimeout(retryTimer);
  }, [user, loading, inkBalance]);

  return (
    <UsageContext.Provider value={{
      usageHistory, inkBalance, residencyBalance, trialInkBalance, purchasedBalance, loading, lastSpent, mousePos,
      addUsageLog, deductInk, refundInk, addInk, registerAiContext,
    }}>
      {children}
      <ZeroInkDialog
        open={zeroInkOpen}
        onOpenChange={setZeroInkOpen}
        user={user}
        inkBalance={inkBalance}
        actionName={zeroInkAction}
      />
    </UsageContext.Provider>
  );
};
