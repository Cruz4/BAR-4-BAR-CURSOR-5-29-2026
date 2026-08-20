'use client';

import React, { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { ToastAction } from '@/components/ui/toast';
import { fetchActivityFeed } from '@/lib/activity/client';
import { refreshActivityAlerts } from '@/hooks/use-activity-alerts';

const SEEN_KEY = 'b4b_drop_sale_seen';
const POLL_MS = 18_000;

function readSeen(): Set<string> {
  try {
    const raw = sessionStorage.getItem(SEEN_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return new Set();
    return new Set(parsed.filter((id): id is string => typeof id === 'string').slice(-80));
  } catch {
    return new Set();
  }
}

function writeSeen(ids: Set<string>) {
  try {
    sessionStorage.setItem(SEEN_KEY, JSON.stringify([...ids].slice(-80)));
  } catch {
    /* ignore */
  }
}

/** Louder in-app toast when a First Drop sale lands (activity type `drop_sold`). */
export function DropSaleAlertListener() {
  const { user, authReady, loading } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const toastRef = useRef(toast);
  const seenRef = useRef<Set<string>>(readSeen());
  const primedRef = useRef(false);

  useEffect(() => {
    toastRef.current = toast;
  }, [toast]);

  useEffect(() => {
    if (!authReady || loading || !user?.id) return;

    let cancelled = false;

    const poll = async () => {
      if (cancelled) return;
      try {
        const feed = await fetchActivityFeed('received', 24);
        const sales = feed.filter((e) => e.type === 'drop_sold');
        if (!primedRef.current) {
          // First tick: remember existing sales so we don't replay old ones.
          for (const sale of sales) seenRef.current.add(sale.id);
          writeSeen(seenRef.current);
          primedRef.current = true;
          return;
        }

        let changed = false;
        for (const sale of sales) {
          if (seenRef.current.has(sale.id)) continue;
          seenRef.current.add(sale.id);
          changed = true;

          const who = sale.actorName?.trim() || 'Someone';
          toastRef.current({
            title: '💸 YOU GOT A SALE',
            description: sale.preview?.trim() || `${who} bought your First Drop`,
            duration: 16_000,
            className:
              'border-2 border-emerald-300/70 bg-emerald-950/95 text-emerald-50 shadow-[0_0_40px_rgba(16,185,129,0.55)]',
            action: (
              <ToastAction
                altText="Open earnings"
                onClick={() => router.push(sale.href || '/earnings')}
              >
                Earnings
              </ToastAction>
            ),
          });
          void refreshActivityAlerts();
        }

        if (changed) writeSeen(seenRef.current);
      } catch {
        /* non-blocking */
      }
    };

    void poll();
    const timer = window.setInterval(() => void poll(), POLL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [authReady, loading, user?.id, router]);

  return null;
}
