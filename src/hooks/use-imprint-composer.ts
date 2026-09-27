'use client';

import { useEffect, useMemo, useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useProductSurfaces } from '@/hooks/use-product-surfaces';
import { patchGamificationSettings } from '@/lib/gamification-client';
import { isImprintComposerPermanent } from '@/lib/product-surface-modes';
import {
  quotePressFadersFromText,
  sanitizeQuotePressSlots,
  type QuotePressConfig,
  type QuotePressFaders,
  type QuotePressSlot,
} from '@/lib/profile/quote-press';

export function useImprintComposer(text: string, isPro: boolean, savedSlots?: unknown) {
  const { toast } = useToast();
  const { imprintComposer } = useProductSurfaces();
  const imprintPermanent = isImprintComposerPermanent(imprintComposer);
  const [imprintToggled, setImprintToggled] = useState(false);
  const [imprintFaders, setImprintFaders] = useState<QuotePressFaders>(() =>
    quotePressFadersFromText('')
  );
  const [imprintSlots, setImprintSlots] = useState<QuotePressSlot[]>([]);
  const [slotBusy, setSlotBusy] = useState(false);

  const imprintOn = imprintPermanent ? Boolean(text.trim()) : imprintToggled;
  const showImprintToggle = !imprintPermanent;

  useEffect(() => {
    setImprintSlots(sanitizeQuotePressSlots(savedSlots));
  }, [savedSlots]);

  useEffect(() => {
    if (!imprintPermanent || !text.trim()) return;
    if (isPro) setImprintFaders(quotePressFadersFromText(text));
  }, [imprintPermanent, text, isPro]);

  const activeImprintConfig = useMemo<QuotePressConfig>(() => {
    const faders = isPro ? imprintFaders : quotePressFadersFromText(text);
    return { faders };
  }, [isPro, imprintFaders, text]);

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

  const resetImprint = () => {
    if (!imprintPermanent) setImprintToggled(false);
    setImprintFaders(quotePressFadersFromText(''));
  };

  const setImprintOn = (next: boolean | ((prev: boolean) => boolean)) => {
    if (imprintPermanent) return;
    setImprintToggled((prev) => (typeof next === 'function' ? next(prev) : next));
  };

  const imprintPayload = imprintOn ? { quotePress: activeImprintConfig } : {};

  return {
    imprintOn,
    imprintPermanent,
    showImprintToggle,
    setImprintOn,
    toggleImprint,
    resetImprint,
    imprintFaders,
    setImprintFaders,
    imprintSlots,
    slotBusy,
    activeImprintConfig,
    persistImprintSlots,
    imprintPayload,
  };
}
