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
import { Archive, Compass, Globe, Music, Radio, Sparkles, Trophy, Users } from 'lucide-react';
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
    title: 'Public music identity',
    desc: 'Choose up to three public labels, including Music Fan, then add genres, moods, influences, region, collaboration status, and what you are focused on.',
    icon: Globe,
    color: 'text-fuchsia-400',
    bgColor: 'bg-fuchsia-500/5',
  },
  {
    title: 'Featured Library track',
    desc: 'Feature a First Drop you released or purchased. Pick the 30-second public excerpt; entitled listeners receive the full stream and everyone else sees Buy.',
    icon: Music,
    color: 'text-fuchsia-300',
    bgColor: 'bg-fuchsia-500/5',
    firstDropsOnly: true,
  },
  {
    title: 'Explainable Discover',
    desc: 'Browse For your taste, For your craft, or New & live. Matches explain their public genre, mood, influence, region, role, or collaboration connection.',
    icon: Compass,
    color: 'text-sky-400',
    bgColor: 'bg-sky-500/5',
  },
  {
    title: 'Support Circle',
    desc: 'Follow and Inner Circle are one-way support. Friends stay reciprocal and still control collaboration and Msgs.',
    icon: Users,
    color: 'text-emerald-400',
    bgColor: 'bg-emerald-500/5',
  },
  {
    title: 'Listener Insights',
    desc: 'Creators can see qualified First Drop listeners, repeats, completions, buyer conversions, sources, timeline, and track summaries without exposing named listener histories.',
    icon: Radio,
    color: 'text-cyan-400',
    bgColor: 'bg-cyan-500/5',
    firstDropsOnly: true,
  },
  {
    title: 'Emerging (7d)',
    desc: 'A transparent momentum board with visible scores, signals, and reasons. Money, Ink, Pro, ads, and sponsorship cannot buy ranking points.',
    icon: Trophy,
    color: 'text-amber-400',
    bgColor: 'bg-amber-500/5',
  },
  {
    title: 'Safer Vault restore',
    desc: 'Versioned backups now preview imports and merge as collision-safe copies. Restore never removes or overwrites your current projects.',
    icon: Archive,
    color: 'text-violet-300',
    bgColor: 'bg-violet-500/5',
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
            <Badge className="bg-primary/20 text-primary border-primary/20 font-code px-2 text-[10px]">Bar 4 Bar v.09</Badge>
            <span className="text-[9px] font-bold uppercase tracking-[0.25em] sm:tracking-[0.3em] text-muted-foreground">Studio notes</span>
          </div>
          <DialogTitle className="font-headline text-2xl sm:text-3xl font-bold tracking-tighter leading-tight pr-4">
            What&apos;s New
          </DialogTitle>
        </DialogHeader>

        <div className="p-4 sm:p-6 overflow-y-auto studio-scrollbar">
          <ul className="space-y-2.5">
            {WHATS_NEW_ITEMS.filter((item) => firstDropsOn || !('firstDropsOnly' in item)).map((item) => {
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
