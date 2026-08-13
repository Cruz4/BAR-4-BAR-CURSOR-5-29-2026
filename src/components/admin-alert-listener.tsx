'use client';

import React, { useEffect, useRef } from 'react';
import { auth } from '@/lib/firebase/client/firebase';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import type { AdminAlert } from '@/lib/admin-alerts';

const CURSOR_KEY = 'b4b_admin_alerts_cursor';
const POLL_MS = 20_000;
const NOTIFY_PERMISSION_KEY = 'b4b_admin_notify_asked';

function readCursor(): string {
  try {
    const stored = sessionStorage.getItem(CURSOR_KEY);
    if (stored) return stored;
  } catch {
    /* ignore */
  }
  return new Date(Date.now() - 90_000).toISOString();
}

function writeCursor(iso: string) {
  try {
    sessionStorage.setItem(CURSOR_KEY, iso);
  } catch {
    /* ignore */
  }
}

function maybeAskBrowserNotify() {
  if (typeof window === 'undefined' || !('Notification' in window)) return;
  try {
    if (sessionStorage.getItem(NOTIFY_PERMISSION_KEY)) return;
    sessionStorage.setItem(NOTIFY_PERMISSION_KEY, '1');
    if (Notification.permission === 'default') {
      void Notification.requestPermission();
    }
  } catch {
    /* ignore */
  }
}

function alertTitle(kind: AdminAlert['kind']): string {
  if (kind === 'signup') return 'New signup';
  if (kind === 'pricing_view') return 'Pricing page';
  if (kind === 'checkout_started') return 'Checkout started';
  if (kind === 'guest_try') return 'Demo sheet';
  if (kind === 'guest_pressing') return 'Profile sandbox';
  if (kind === 'lock_funnel') return 'LOCK cast';
  return 'Page visit';
}

function pushBrowserNotify(alert: AdminAlert) {
  if (typeof window === 'undefined' || !('Notification' in window)) return;
  if (Notification.permission !== 'granted') return;
  try {
    new Notification(alertTitle(alert.kind), {
      body: alert.message,
      tag: `b4b-admin-${alert.id}`,
    });
  } catch {
    /* ignore */
  }
}

/** Polls admin alerts and shows in-app toasts (optional browser notifications). */
export function AdminAlertListener() {
  const { user, authReady, loading } = useAuth();
  const { toast } = useToast();
  const toastRef = useRef(toast);
  const seenIdsRef = useRef<Set<string>>(new Set());
  const cursorRef = useRef<string>(readCursor());
  const isAdmin = user?.role === 'admin';

  useEffect(() => {
    toastRef.current = toast;
  }, [toast]);

  useEffect(() => {
    if (!authReady || loading || !isAdmin || !user) return;

    maybeAskBrowserNotify();

    let cancelled = false;

    const poll = async () => {
      const firebaseUser = auth.currentUser;
      if (!firebaseUser || cancelled) return;
      try {
        const token = await firebaseUser.getIdToken();
        const since = cursorRef.current;
        const res = await fetch(`/api/admin/alerts?since=${encodeURIComponent(since)}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok || cancelled) return;
        const data = (await res.json()) as { alerts?: AdminAlert[] };
        const alerts = data.alerts || [];
        if (alerts.length === 0) return;

        let latest = since;
        for (const alert of alerts) {
          if (seenIdsRef.current.has(alert.id)) continue;
          seenIdsRef.current.add(alert.id);
          if (alert.timestamp > latest) latest = alert.timestamp;

          toastRef.current({
            title: alertTitle(alert.kind),
            description: alert.message,
            duration: 12_000,
          });
          pushBrowserNotify(alert);
        }

        cursorRef.current = latest;
        writeCursor(latest);
      } catch {
        // Non-blocking
      }
    };

    void poll();
    const id = window.setInterval(() => void poll(), POLL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [authReady, loading, isAdmin, user?.id]);

  return null;
}
