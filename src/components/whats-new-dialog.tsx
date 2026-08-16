'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Sparkles, Rocket, Globe, Bell, Music } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import {
  hasDismissedWhatsNew,
  hasWhatsNewBeenShownThisLogin,
  markWhatsNewDismissed,
  markWhatsNewShownThisLogin,
} from '@/lib/whats-new-session';
import { isStudioOnboardingBusy } from '@/lib/studio-privacy-intro';
import { useFirstDropsFeature } from '@/hooks/use-first-drops-feature';

function isVaultLanding(pathname: string | null): boolean {
  if (!pathname) return false;
  if (pathname === '/' || pathname === '/vault') return true;
  return pathname.startsWith('/albums/') && !pathname.includes('/tracks/');
}

function isBrandNewStudioAccount(createdAt: string | undefined): boolean {
  if (!createdAt) return false;
  const created = new Date(createdAt);
  if (Number.isNaN(created.getTime())) return false;
  return Date.now() - created.getTime() < 7 * 24 * 60 * 60 * 1000;
}

const WHATS_NEW_ITEMS = [
  {
    title: 'First Drops',
    desc: 'Put the actual song on a DNA Drop, set a price or pay-what-you-want, and fans stream it here after they buy. Library is on The Scene.',
    icon: Music,
    color: 'text-fuchsia-400',
    bgColor: 'bg-fuchsia-500/5',
  },
  {
    title: 'The Scene',
    desc: 'Sign-in home: friends, Discover, and Your Booth. Vault is one click away. A house bar and weekly challenge can pin on the block.',
    icon: Rocket,
    color: 'text-emerald-400',
    bgColor: 'bg-emerald-500/5',
  },
  {
    title: 'Artist Home',
    desc: 'Your public page — skin, wall, embeds. Flip it live from Your Booth. Logged-out visitors can try a Pressing, then claim it.',
    icon: Globe,
    color: 'text-sky-400',
    bgColor: 'bg-sky-500/5',
  },
  {
    title: 'Activity',
    desc: 'The bell and push talk about your verse, streak, and echoes. Tune it in Settings → Notifications.',
    icon: Bell,
    color: 'text-amber-400',
    bgColor: 'bg-amber-500/5',
  },
] as const;

export function WhatsNewDialog() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const { user, authReady, loading } = useAuth();
  const { enabled: firstDropsOn } = useFirstDropsFeature();
  const scheduledRef = useRef(false);

  const dismiss = useCallback(() => {
    if (user?.id) {
      markWhatsNewDismissed(user.id);
    }
    setOpen(false);
  }, [user?.id]);

  const handleOpenChange = useCallback(
    (next: boolean) => {
      if (!next) {
        dismiss();
        return;
      }
      setOpen(true);
    },
    [dismiss]
  );

  useEffect(() => {
    scheduledRef.current = false;
    setOpen(false);
  }, [pathname, user?.id]);

  useEffect(() => {
    if (!user?.id || !authReady || loading) return;
    if (!isVaultLanding(pathname)) return;
    if (!user.vaultTutorialCompletedAt && !user.sceneTutorialCompletedAt) return;
    if (!user.studioPrivacyIntroCompletedAt) return;
    if (isBrandNewStudioAccount(user.createdAt)) return;
    if (isStudioOnboardingBusy()) return;
    if (hasDismissedWhatsNew(user.id)) return;
    if (hasWhatsNewBeenShownThisLogin(user.id) || scheduledRef.current) return;

    scheduledRef.current = true;
    const timer = setTimeout(() => {
      if (!user?.id || hasDismissedWhatsNew(user.id)) return;
      if (!user.vaultTutorialCompletedAt) return;
      if (!user.studioPrivacyIntroCompletedAt) return;
      if (isBrandNewStudioAccount(user.createdAt)) return;
      if (isStudioOnboardingBusy()) return;
      if (hasWhatsNewBeenShownThisLogin(user.id)) return;
      markWhatsNewShownThisLogin(user.id);
      setOpen(true);
    }, 2000);

    return () => clearTimeout(timer);
  }, [
    pathname,
    user?.id,
    user?.vaultTutorialCompletedAt,
    user?.sceneTutorialCompletedAt,
    user?.studioPrivacyIntroCompletedAt,
    user?.createdAt,
    authReady,
    loading,
  ]);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg h-auto max-h-[min(90vh,100dvh)] flex flex-col p-0 overflow-hidden bg-background border-2 rounded-xl shadow-2xl z-[3000]">
        <DialogHeader className="p-5 sm:p-6 pb-4 border-b bg-muted/5 relative">
          <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
            <Sparkles className="h-14 w-14 sm:h-16 sm:w-16" />
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-2 pr-12">
            <Badge className="bg-primary/20 text-primary border-primary/20 font-code px-2 text-[10px]">Bar 4 Bar v.08</Badge>
            <span className="text-[9px] font-bold uppercase tracking-[0.25em] sm:tracking-[0.3em] text-muted-foreground">Studio notes</span>
          </div>
          <DialogTitle className="font-headline text-2xl sm:text-3xl font-bold tracking-tighter leading-tight pr-4">
            What&apos;s New
          </DialogTitle>
        </DialogHeader>

        <div className="p-4 sm:p-6 overflow-y-auto studio-scrollbar">
          <ul className="space-y-2.5">
            {WHATS_NEW_ITEMS.filter((item) => firstDropsOn || item.title !== 'First Drops').map((item) => {
              const Icon = item.icon;
              return (
                <li
                  key={item.title}
                  className={cn(
                    'p-3 sm:p-3.5 rounded-lg border border-white/5',
                    item.bgColor
                  )}
                >
                  <div className="flex items-start gap-3">
                    <div className={cn('mt-0.5 p-1.5 rounded border border-current/20 shrink-0', item.color)}>
                      <Icon className="h-3.5 w-3.5" />
                    </div>
                    <div className="space-y-0.5 min-w-0">
                      <h4 className="text-[11px] sm:text-xs font-bold text-foreground uppercase tracking-wide">{item.title}</h4>
                      <p className="text-[10px] sm:text-[11px] text-muted-foreground leading-snug font-code">{item.desc}</p>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>

        <DialogFooter className="p-4 sm:p-6 border-t bg-muted/5 flex-col-reverse sm:flex-row sm:justify-between gap-3 items-stretch sm:items-center">
          <p className="text-[9px] text-muted-foreground font-code uppercase tracking-widest text-center sm:text-left">August 2026</p>
          <Button onClick={dismiss} className="w-full sm:w-auto px-8 sm:px-10 font-bold h-10 shadow-lg">
            Got it
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
