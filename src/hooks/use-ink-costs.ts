'use client';

import { useEffect, useState, useCallback } from 'react';
import { doc } from 'firebase/firestore';
import { db } from '@/lib/firebase/client/firebase';
import { subscribeDocument } from '@/lib/firebase/client/firestore-subscribe';
import { mergeStudioCosts, type StudioCosts } from '@/lib/studio-costs';
import type { InkActionKey } from '@/lib/ink-labels';
import { inkButtonLabel, inkTooltip } from '@/lib/ink-labels';
import { useUsage } from '@/context/usage-context';
import { useAuth } from '@/hooks/use-auth';
import { applyByoInkDiscount, BYO_API_INK_DISCOUNT_PERCENT, isByoInkDiscountActive } from '@/lib/byo-api';

export function useInkCosts() {
  const { customApiKey } = useUsage();
  const { user } = useAuth();
  const byoActive = isByoInkDiscountActive(user, customApiKey);
  const [costs, setCosts] = useState<StudioCosts>(() => mergeStudioCosts());

  useEffect(() => {
    const unsub = subscribeDocument(
      doc(db, 'config', 'studio'),
      (data) => {
        setCosts(mergeStudioCosts(data?.costs));
      },
      () => undefined,
      60000
    );
    return () => unsub();
  }, []);

  const getCost = useCallback(
    (action: InkActionKey) => costs[action],
    [costs]
  );

  /** Applies BYO-API platform discount (50% off Ink) when Yearly Pro has a saved Google key. */
  const getEffectiveCost = useCallback(
    (action: InkActionKey, overrideBase?: number) => {
      const base = overrideBase ?? costs[action];
      return byoActive ? applyByoInkDiscount(base) : Math.max(1, Math.ceil(base));
    },
    [costs, byoActive]
  );

  const tooltip = useCallback(
    (action: InkActionKey, overrideBase?: number) => {
      const amount = getEffectiveCost(action, overrideBase);
      const base = inkTooltip(action, amount);
      return byoActive ? `${base} · BYO ${BYO_API_INK_DISCOUNT_PERCENT}% off` : base;
    },
    [getEffectiveCost, byoActive]
  );

  const buttonLabel = useCallback(
    (action: InkActionKey, overrideBase?: number) =>
      inkButtonLabel(action, getEffectiveCost(action, overrideBase)),
    [getEffectiveCost]
  );

  return { costs, getCost, getEffectiveCost, tooltip, buttonLabel, byoActive };
}
