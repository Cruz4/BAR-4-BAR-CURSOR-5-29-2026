'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Bell } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import {
  fetchActivityPrefs,
  saveActivityPrefs,
  savePushToken,
} from '@/lib/activity/client';
import { registerActivityPush } from '@/lib/activity/push';
import {
  ACTIVITY_PUSH_INTRO_ELIGIBLE_EVENT,
  consumePendingActivityPushIntro,
  dismissActivityPushIntro,
  hasPendingActivityPushIntro,
  isActivityPushIntroDismissed,
  setActivityPushIntroOpen,
} from '@/lib/activity-push-intro';
import {
  hasPendingStudioPrivacyIntro,
  isStudioPrivacyIntroOpen,
  isVaultTourRunning,
} from '@/lib/studio-privacy-intro';

function pushSupportedInBrowser(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    'Notification' in window &&
    'serviceWorker' in navigator &&
    Boolean(process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY)
  );
}

/**
 * After Scene tour (complete or skip) — and after privacy intro clears —
 * offer one-tap enable for Activity web push.
 */
export function ActivityPushIntroDialog() {
  const pathname = usePathname();
  const { user } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const openTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setActivityPushIntroOpen(open);
    return () => setActivityPushIntroOpen(false);
  }, [open]);

  const clearOpenTimer = useCallback(() => {
    if (openTimerRef.current) {
      clearTimeout(openTimerRef.current);
      openTimerRef.current = null;
    }
  }, []);

  const finish = useCallback(() => {
    dismissActivityPushIntro();
    setOpen(false);
  }, []);

  const scheduleOpen = useCallback(() => {
    clearOpenTimer();
    if (!user?.id) return;
    if (!pushSupportedInBrowser()) return;
    if (isActivityPushIntroDismissed()) return;
    if (pathname !== '/') return;
    if (!hasPendingActivityPushIntro()) return;
    if (isVaultTourRunning()) return;
    if (hasPendingStudioPrivacyIntro() || isStudioPrivacyIntroOpen()) return;
    try {
      if (sessionStorage.getItem('b4b-demo-handoff-inflight') === '1') return;
    } catch {
      /* ignore */
    }

    openTimerRef.current = setTimeout(() => {
      openTimerRef.current = null;
      if (!user?.id || isActivityPushIntroDismissed()) return;
      if (!hasPendingActivityPushIntro()) return;
      if (isVaultTourRunning()) return;
      if (hasPendingStudioPrivacyIntro() || isStudioPrivacyIntroOpen()) return;
      if (typeof window !== 'undefined' && window.location.pathname !== '/') return;

      void (async () => {
        try {
          const prefs = await fetchActivityPrefs();
          if (prefs.pushEnabled) {
            dismissActivityPushIntro();
            return;
          }
        } catch {
          /* still offer enable */
        }
        if (!consumePendingActivityPushIntro()) return;
        setOpen(true);
      })();
    }, 900);
  }, [clearOpenTimer, pathname, user?.id]);

  useEffect(() => {
    setOpen(false);
    clearOpenTimer();
  }, [pathname, user?.id, clearOpenTimer]);

  useEffect(() => {
    scheduleOpen();
    return clearOpenTimer;
  }, [scheduleOpen, clearOpenTimer]);

  useEffect(() => {
    const onEligible = () => scheduleOpen();
    window.addEventListener(ACTIVITY_PUSH_INTRO_ELIGIBLE_EVENT, onEligible);
    return () => window.removeEventListener(ACTIVITY_PUSH_INTRO_ELIGIBLE_EVENT, onEligible);
  }, [scheduleOpen]);

  const enablePush = async () => {
    setBusy(true);
    try {
      const prefs = await fetchActivityPrefs();
      const result = await registerActivityPush();
      if (result.ok) {
        await saveActivityPrefs({ ...prefs, pushEnabled: true });
        await savePushToken(result.token);
        finish();
        toast({
          title: 'Push on',
          description: 'You’ll get alerts for friend requests, loves, and more. Change anytime in Settings.',
        });
        return;
      }
      if (result.reason === 'permission') {
        toast({
          title: 'Permission needed',
          description:
            'Allow notifications in your browser (address-bar icon → Notifications → Allow), then try again in Settings.',
        });
      } else if (result.reason === 'push_service') {
        toast({
          title: 'Push not available yet',
          description:
            'This browser couldn’t finish push setup. Clear site data for this site, reload once, or enable later in Settings → Notifications.',
        });
      } else {
        toast({
          title: 'Could not enable push',
          description: result.message || 'Try again from Settings → Notifications.',
        });
      }
      // Still dismiss so we don’t loop; they can use Settings.
      finish();
    } catch (e) {
      toast({
        variant: 'destructive',
        title: 'Could not enable push',
        description: e instanceof Error ? e.message : undefined,
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !next && finish()}>
      <DialogContent className="sm:max-w-md border-emerald-500/25">
        <DialogHeader>
          <DialogTitle className="font-headline text-xl flex items-center gap-2">
            <Bell className="h-5 w-5 text-emerald-400" />
            Stay in the loop
          </DialogTitle>
          <DialogDescription className="text-sm leading-relaxed">
            Turn on push alerts for friend requests, loves, replies, and DNA imports — even when Bar 4 Bar isn’t open.
            Your in-app Activity inbox still works either way.
          </DialogDescription>
        </DialogHeader>

        <p className="text-[11px] text-muted-foreground leading-snug rounded-lg border border-white/10 bg-black/25 p-3">
          On iPhone, use the home-screen app for the most reliable alerts. You can change this anytime under{' '}
          <Link href="/usage?tab=settings" className="text-primary font-bold hover:underline">
            Settings → Notifications
          </Link>
          .
        </p>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="ghost" className="w-full sm:w-auto" disabled={busy} onClick={finish}>
            Not now
          </Button>
          <Button
            className="w-full sm:flex-1 font-bold uppercase bg-emerald-600 hover:bg-emerald-500"
            disabled={busy}
            onClick={() => void enablePush()}
          >
            {busy ? 'Enabling…' : 'Enable push alerts'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
