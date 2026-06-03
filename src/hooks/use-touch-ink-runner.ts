'use client';

import { useCallback, useRef } from 'react';
import { usePrefersTouch } from '@/hooks/use-prefers-touch';
import { useUsage } from '@/context/usage-context';
import { useInkCosts } from '@/hooks/use-ink-costs';
import { INK_ACTION_LABELS, type InkActionKey } from '@/lib/ink-labels';
import { useToast } from '@/hooks/use-toast';

const ARM_MS = 5000;

/**
 * On touch devices: first tap arms (shows ink cost); second tap on the same action deducts and runs.
 * On desktop: single click deducts and runs (unchanged).
 */
export function useTouchInkRunner() {
  const touch = usePrefersTouch();
  const { deductInk } = useUsage();
  const { tooltip } = useInkCosts();
  const { toast } = useToast();
  const armedRef = useRef<{ key: string; expires: number } | null>(null);

  const runWithInk = useCallback(
    (
      actionKey: string,
      cost: number,
      actionName: InkActionKey,
      event: React.MouseEvent | undefined,
      run: () => void | Promise<void>
    ): boolean => {
      if (!touch) {
        if (!deductInk(cost, actionName, event)) return false;
        void run();
        return true;
      }

      const now = Date.now();
      const armed = armedRef.current;
      if (armed?.key === actionKey && armed.expires > now) {
        armedRef.current = null;
        if (!deductInk(cost, actionName, event)) return false;
        void run();
        return true;
      }

      armedRef.current = { key: actionKey, expires: now + ARM_MS };
      const safeCost = Number.isFinite(cost) && cost > 0 ? Math.ceil(cost) : 0;
      const label =
        actionName in INK_ACTION_LABELS
          ? tooltip(actionName, safeCost)
          : null;
      toast({
        title: 'Confirm Ink spend',
        description: `${label || `Studio action — ${safeCost} Ink`} — tap again to run.`,
        duration: 3500,
      });
      return false;
    },
    [touch, deductInk, tooltip, toast]
  );

  const clearArmed = useCallback(() => {
    armedRef.current = null;
  }, []);

  return { runWithInk, clearArmed, touchInkEnabled: touch };
}
