'use client';

import { useEffect, useMemo, useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { useGamification } from '@/context/gamification-context';
import { useProductSurfaces } from '@/hooks/use-product-surfaces';
import { auth } from '@/lib/firebase/client/firebase';
import { patchGamificationSettings } from '@/lib/gamification-client';
import { dispatchGamificationSummaryPatch } from '@/lib/gamification/unlock-events';
import { isImprintComposerPermanent } from '@/lib/product-surface-modes';
import {
  imprintShuffleRemaining,
  quotePressFadersFromText,
  sanitizeQuotePressSlots,
  type QuotePressConfig,
  type QuotePressFaders,
  type QuotePressSlot,
} from '@/lib/profile/quote-press';
import { isProUser } from '@/lib/subscription';

export type UseImprintComposerOptions = {
  /** When permanent Imprint is on, reuse faders from the viewer's first Imprint on this thread. */
  lockedFaders?: QuotePressFaders | null;
};

export function useImprintComposer(
  text: string,
  isPro: boolean,
  savedSlots?: unknown,
  options?: UseImprintComposerOptions
) {
  const { toast } = useToast();
  const { user } = useAuth();
  const { summary } = useGamification();
  const paidPro = isProUser(user);
  const { imprintComposer } = useProductSurfaces();
  const imprintPermanent = isImprintComposerPermanent(imprintComposer);
  const lockedFaders = options?.lockedFaders ?? null;
  const imprintStyleLocked = imprintPermanent && lockedFaders != null;
  const [imprintToggled, setImprintToggled] = useState(false);
  const [imprintFaders, setImprintFaders] = useState<QuotePressFaders>(() =>
    quotePressFadersFromText('')
  );
  const [imprintSlots, setImprintSlots] = useState<QuotePressSlot[]>([]);
  const [lookPinned, setLookPinned] = useState(false);
  const [slotBusy, setSlotBusy] = useState(false);
  const [shuffleNow, setShuffleNow] = useState(() => Date.now());

  const imprintOn = imprintPermanent ? Boolean(text.trim()) : imprintToggled;
  const showImprintToggle = !imprintPermanent;

  useEffect(() => {
    setImprintSlots(sanitizeQuotePressSlots(savedSlots));
  }, [savedSlots]);

  useEffect(() => {
    const timer = window.setInterval(() => setShuffleNow(Date.now()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (imprintStyleLocked && lockedFaders) {
      setImprintFaders(lockedFaders);
      return;
    }
    if (lookPinned) return;
    setImprintFaders(quotePressFadersFromText(text));
  }, [imprintStyleLocked, lockedFaders, lookPinned, text]);

  const shuffleMeter = useMemo(
    () => imprintShuffleRemaining(summary.imprintShuffleUses, paidPro, shuffleNow),
    [summary.imprintShuffleUses, paidPro, shuffleNow]
  );

  const activeImprintConfig = useMemo<QuotePressConfig>(() => {
    if (imprintStyleLocked && lockedFaders) return { faders: lockedFaders };
    return { faders: imprintFaders };
  }, [imprintStyleLocked, lockedFaders, imprintFaders]);

  const persistImprintSlots = async (nextSlots: QuotePressSlot[]) => {
    setSlotBusy(true);
    try {
      await patchGamificationSettings({ quotePressSlots: nextSlots });
      setImprintSlots(nextSlots);
    } catch (e) {
      toast({
        variant: 'destructive',
        title: 'Could not save imprint style',
        description: e instanceof Error ? e.message : undefined,
      });
    } finally {
      setSlotBusy(false);
    }
  };

  const toggleImprint = () => {
    if (imprintPermanent) return;
    setImprintToggled((value) => {
      const next = !value;
      if (next && isPro) setImprintFaders(quotePressFadersFromText(text));
      return next;
    });
  };

  const pinImprintLook = (faders: QuotePressFaders) => {
    setLookPinned(true);
    setImprintFaders(faders);
  };

  const resetImprint = () => {
    setLookPinned(false);
    if (!imprintPermanent) {
      setImprintToggled(false);
      setImprintFaders(quotePressFadersFromText(''));
      return;
    }
    if (lockedFaders) setImprintFaders(lockedFaders);
    else setImprintFaders(quotePressFadersFromText(''));
  };

  const shuffleImprint = async () => {
    if (imprintStyleLocked || slotBusy) return;
    if (shuffleMeter.remaining <= 0) {
      toast({
        title: 'No shuffles left',
        description: 'Each one comes back 24 hours after you use it.',
      });
      return;
    }
    setSlotBusy(true);
    try {
      const token = await auth.currentUser?.getIdToken();
      if (!token) throw new Error('Sign in to shuffle an Imprint.');
      const res = await fetch('/api/imprint/shuffle', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = (await res.json()) as {
        error?: string;
        faders?: QuotePressFaders;
        imprintShuffleUses?: string[];
      };
      if (Array.isArray(data.imprintShuffleUses)) {
        dispatchGamificationSummaryPatch({
          imprintShuffleUses: data.imprintShuffleUses,
        } as never);
      }
      if (!res.ok || !data.faders) {
        throw new Error(data.error || 'Could not shuffle that Imprint.');
      }
      pinImprintLook(data.faders);
    } catch (e) {
      toast({
        variant: 'destructive',
        title: 'Could not shuffle',
        description: e instanceof Error ? e.message : undefined,
      });
    } finally {
      setSlotBusy(false);
    }
  };

  const setImprintOn = (next: boolean | ((prev: boolean) => boolean)) => {
    if (imprintPermanent) return;
    setImprintToggled((prev) => (typeof next === 'function' ? next(prev) : next));
  };

  const imprintPayload = imprintOn ? { quotePress: activeImprintConfig } : {};

  return {
    imprintOn,
    imprintPermanent,
    imprintStyleLocked,
    showImprintToggle,
    setImprintOn,
    toggleImprint,
    resetImprint,
    imprintFaders,
    setImprintFaders,
    pinImprintLook,
    shuffleImprint,
    shuffleRemaining: shuffleMeter.remaining,
    shuffleCap: shuffleMeter.cap,
    imprintSlots,
    slotBusy,
    activeImprintConfig,
    persistImprintSlots,
    imprintPayload,
  };
}
