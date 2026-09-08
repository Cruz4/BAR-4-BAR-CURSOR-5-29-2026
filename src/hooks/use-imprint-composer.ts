'use client';

import { useEffect, useMemo, useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { patchGamificationSettings } from '@/lib/gamification-client';
import {
  quotePressFadersFromText,
  sanitizeQuotePressSlots,
  type QuotePressConfig,
  type QuotePressFaders,
  type QuotePressSlot,
} from '@/lib/profile/quote-press';

export function useImprintComposer(text: string, isPro: boolean, savedSlots?: unknown) {
  const { toast } = useToast();
  const [imprintOn, setImprintOn] = useState(false);
  const [imprintFaders, setImprintFaders] = useState<QuotePressFaders>(() =>
    quotePressFadersFromText('')
  );
  const [imprintSlots, setImprintSlots] = useState<QuotePressSlot[]>([]);
  const [slotBusy, setSlotBusy] = useState(false);

  useEffect(() => {
    setImprintSlots(sanitizeQuotePressSlots(savedSlots));
  }, [savedSlots]);

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
    setImprintOn((value) => {
      const next = !value;
      if (next && isPro) setImprintFaders(quotePressFadersFromText(text));
      return next;
    });
  };

  const resetImprint = () => {
    setImprintOn(false);
    setImprintFaders(quotePressFadersFromText(''));
  };

  const imprintPayload =
    imprintOn && text.trim() ? { quotePress: activeImprintConfig } : {};

  return {
    imprintOn,
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
