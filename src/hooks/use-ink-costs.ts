'use client';

import { useEffect, useState, useCallback } from 'react';
import { doc } from 'firebase/firestore';
import { db } from '@/lib/firebase/client/firebase';
import { subscribeDocument } from '@/lib/firebase/client/firestore-subscribe';
import { mergeStudioCosts, type StudioCosts } from '@/lib/studio-costs';
import type { InkActionKey } from '@/lib/ink-labels';
import { inkButtonLabel, inkTooltip } from '@/lib/ink-labels';

export function useInkCosts() {
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

  /** Same as getCost — no discount on AI action spend (Yearly Pro ink-store discount is checkout-only). */
  const getEffectiveCost = useCallback(
    (action: InkActionKey, overrideBase?: number) => {
      const base = overrideBase ?? costs[action];
      return Math.max(1, Math.ceil(base));
    },
    [costs]
  );

  const tooltip = useCallback(
    (action: InkActionKey, overrideBase?: number) =>
      inkTooltip(action, getEffectiveCost(action, overrideBase)),
    [getEffectiveCost]
  );

  const buttonLabel = useCallback(
    (action: InkActionKey, overrideBase?: number) =>
      inkButtonLabel(action, getEffectiveCost(action, overrideBase)),
    [getEffectiveCost]
  );

  return { costs, getCost, getEffectiveCost, tooltip, buttonLabel };
}
