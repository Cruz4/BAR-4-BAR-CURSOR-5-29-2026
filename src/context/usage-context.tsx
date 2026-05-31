'use client';

import React, { createContext, useState, useEffect, ReactNode, useCallback, useContext, useRef } from 'react';
import type { AIUsageLog } from '@/lib/types';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { db } from '@/lib/firebase/client/firebase';
import { doc, collection, query, orderBy, limit } from 'firebase/firestore';
import { subscribeDocument, subscribeQuery } from '@/lib/firebase/client/firestore-subscribe';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { initUserUsageAction } from '@/lib/server/usage-actions';
import { getAiAuth } from '@/lib/ai-client';
import { waitForAuthUser } from '@/lib/firebase/client/auth-ready';
import { computeActiveRules } from '@/lib/active-rules';
import type { ActiveRules } from '@/components/dna-synthesis-loader';
import type { Album, StyleProfile, Track } from '@/lib/types';
import { INK_PACK_YEARLY_DISCOUNT_PERCENT } from '@/lib/studio-tiers';

const API_KEY_STORAGE_KEY = 'bar4bar-custom-api-key';

export type AiSpendContext = {
  track: Track;
  album: Album;
  styleProfile?: StyleProfile | null;
};

interface UsageContextType {
  usageHistory: any[];
  inkBalance: number;
  residencyBalance: number;
  purchasedBalance: number;
  loading: boolean;
  customApiKey: string | null;
  lastSpent: { amount: number; pressX: number; pressY: number; currentX: number; currentY: number; activeRules?: ActiveRules; actionName?: string } | null;
  mousePos: { x: number; y: number };
  addUsageLog: (log: Omit<AIUsageLog, 'id' | 'timestamp'>) => void;
  deductInk: (amount: number, actionName: string, mouseEvent?: any) => boolean;
  refundInk: (amount: number, reason?: string) => void;
  addInk: (amount: number) => void;
  saveCustomApiKey: (key: string | null) => void;
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
  const [purchasedBalance, setPurchasedBalance] = useState<number>(0);
  const [customApiKey, setCustomApiKey] = useState<string | null>(null);
  const [lastSpent, setLastSpent] = useState<{ amount: number; pressX: number; pressY: number; currentX: number; currentY: number; activeRules?: ActiveRules; actionName?: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  
  const hasInitializedRef = useRef(false);
  const aiContextRef = useRef<AiSpendContext | null>(null);

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

  const addUsageLog = useCallback((log: Omit<AIUsageLog, 'id' | 'timestamp'>) => {
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
    
    try {
      const savedKey = localStorage.getItem(`${API_KEY_STORAGE_KEY}-${user.id}`);
      setCustomApiKey(savedKey);
    } catch (e) {
      console.warn("Local usage load failed");
    }

    const setupListeners = async () => {
      const firebaseUser = await waitForAuthUser();
      if (cancelled || !firebaseUser || firebaseUser.uid !== user.id) return;

      getAiAuth()
        .then(({ idToken, userId }) => initUserUsageAction(idToken, userId))
        .catch((e) => console.warn('Usage init skipped:', e));

      if (cancelled) return;

      unsubBalance = subscribeDocument(
        balanceRef,
        (data) => {
        if (data) {
          const res = data.residencyBalance || 0;
          const pur = data.purchasedBalance || 0;
          setResidencyBalance(res);
          setPurchasedBalance(pur);
          setInkBalance(res + pur);
        } else {
          setResidencyBalance(0);
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
      const q = query(logsRef, orderBy('timestamp', 'desc'), limit(50));
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
  }, [user?.id, authReady]);

  const deductInk = useCallback((amount: number, actionName: string, mouseEvent?: any) => {
    if (!user) return false;

    const finalAmount = Math.max(1, Math.ceil(amount));

    if (inkBalance < finalAmount) {
        const isYearly = user.subscriptionTier === 'yearly';
        toast({
          variant: 'destructive',
          title: 'Ink Reserve Low',
          description: (
            <span className="flex flex-col gap-2 text-sm">
              <span>You need {finalAmount} Ink for this action. Refill residency or buy permanent Ink packs.</span>
              {!isYearly && (
                <span className="text-[11px] text-muted-foreground leading-snug">
                  Yearly Pro includes {INK_PACK_YEARLY_DISCOUNT_PERCENT}% off permanent Ink packs — best value if you run out often.
                </span>
              )}
              <span className="flex gap-2 flex-wrap">
                <Button asChild size="sm" variant="secondary" className="h-8 text-[10px] font-bold uppercase">
                  <Link href={isYearly ? '/usage?tab=buy-ink' : '/usage?tab=cloud'}>
                    {isYearly ? 'Buy Ink' : 'Yearly Pro + Ink'}
                  </Link>
                </Button>
                <Button asChild size="sm" className="h-8 text-[10px] font-bold uppercase">
                  <Link href="/usage?tab=buy-ink">Buy Ink</Link>
                </Button>
              </span>
            </span>
          ),
          duration: 9000,
        });
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
  }, [inkBalance, residencyBalance, purchasedBalance, customApiKey, user, toast, mousePos]);

  const refundInk = useCallback((_amount: number, _reason: string = 'AI Error') => {
    // Refunds are handled server-side in runSecuredAiAction when AI fails after ink deduction.
  }, []);

  const addInk = useCallback((_amount: number) => {
    // Ink purchases are fulfilled server-side via Stripe webhook.
  }, []);

  const saveCustomApiKey = useCallback((key: string | null) => {
    if (!user) return;
    const isYearly = user.subscriptionTier === 'yearly';
    if (!isYearly && key) {
        toast({ variant: 'destructive', title: "Yearly Pro Required", description: "BYO API key is an exclusive benefit for Yearly Pro members." });
        return;
    }
    setCustomApiKey(key);
    if (key) {
        localStorage.setItem(`${API_KEY_STORAGE_KEY}-${user.id}`, key);
        toast({ title: "Custom API Key Saved", description: "Your Google key runs the model calls — Ink covers Bar 4 Bar workstation IP (prompts, DNA flow, guardrails), not double-billing for tokens." });
    } else {
        localStorage.removeItem(`${API_KEY_STORAGE_KEY}-${user.id}`);
    }
  }, [user, toast]);

  return (
    <UsageContext.Provider value={{
      usageHistory, inkBalance, residencyBalance, purchasedBalance, loading, customApiKey, lastSpent, mousePos,
      addUsageLog, deductInk, refundInk, addInk, saveCustomApiKey, registerAiContext,
    }}>
      {children}
    </UsageContext.Provider>
  );
};
