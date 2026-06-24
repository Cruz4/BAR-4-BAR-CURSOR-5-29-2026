'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { usePrefersTouch } from '@/hooks/use-prefers-touch';
import { useUsage } from '@/context/usage-context';
import { useInkCosts } from '@/hooks/use-ink-costs';
import { INK_ACTION_LABELS, type InkActionKey } from '@/lib/ink-labels';
import { useToast } from '@/hooks/use-toast';

const ARM_MS = 5000;

const INK_CONFIRM_TOAST_CLASS =
  'pointer-events-none touch-ink-confirm border-primary/35 bg-background/95 backdrop-blur-md py-2.5 px-3 pr-5 shadow-lg';

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
  const armTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [armedKey, setArmedKey] = useState<string | null>(null);

  const clearArmed = useCallback(() => {
    armedRef.current = null;
    setArmedKey(null);
    if (armTimerRef.current) {
      clearTimeout(armTimerRef.current);
      armTimerRef.current = null;
    }
  }, []);

  const armAction = useCallback(
    (actionKey: string, cost: number, actionName: InkActionKey) => {
      const now = Date.now();
      armedRef.current = { key: actionKey, expires: now + ARM_MS };
      setArmedKey(actionKey);

      if (armTimerRef.current) {
        clearTimeout(armTimerRef.current);
      }
      armTimerRef.current = setTimeout(() => {
        if (armedRef.current?.key === actionKey) {
          clearArmed();
        }
      }, ARM_MS);

      const safeCost = Number.isFinite(cost) && cost > 0 ? Math.ceil(cost) : 0;
      const label =
        actionName in INK_ACTION_LABELS
          ? tooltip(actionName, safeCost)
          : null;
      toast({
        title: 'Confirm Ink spend',
        description: `${label || `Studio action — ${safeCost} Ink`} — tap the button again to run.`,
        duration: ARM_MS,
        className: INK_CONFIRM_TOAST_CLASS,
      });
    },
    [clearArmed, tooltip, toast]
  );

  useEffect(() => () => {
    if (armTimerRef.current) {
      clearTimeout(armTimerRef.current);
    }
  }, []);

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
        clearArmed();
        if (!deductInk(cost, actionName, event)) return false;
        void run();
        return true;
      }

      armAction(actionKey, cost, actionName);
      return false;
    },
    [touch, deductInk, clearArmed, armAction]
  );

  const isArmed = useCallback(
    (actionKey: string) => armedKey === actionKey,
    [armedKey]
  );

  return { runWithInk, clearArmed, touchInkEnabled: touch, armedKey, isArmed };
}
