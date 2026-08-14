'use client';

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Sparkles,
  Rocket,
  Gift,
  Globe,
  LayoutGrid,
  Lock,
  Bell,
  Radio,
  CalendarRange,
} from 'lucide-react';
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
import { SIGNUP_INK } from '@/lib/subscription';
import { getProCheckoutCtaLine } from '@/lib/studio-tiers';
import { useLockFeature } from '@/hooks/use-lock-feature';
import {
  DEFAULT_HOUSE_BAR,
  DEFAULT_WEEKLY_CHALLENGE,
  type SceneLivePublic,
} from '@/lib/scene/live-events';

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

export function WhatsNewDialog() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const { user, authReady, loading } = useAuth();
  const scheduledRef = useRef(false);
  const { enabled: lockOn } = useLockFeature();
  const [sceneLive, setSceneLive] = useState<SceneLivePublic | null>(null);

  useEffect(() => {
    let cancelled = false;
    void fetch('/api/scene/live', { cache: 'no-store' })
      .then(async (res) => {
        const data = (await res.json()) as Partial<SceneLivePublic>;
        if (cancelled) return;
        setSceneLive({
          houseBar: { ...DEFAULT_HOUSE_BAR, ...data.houseBar },
          weeklyChallenge: { ...DEFAULT_WEEKLY_CHALLENGE, ...data.weeklyChallenge },
        });
      })
      .catch(() => {
        if (!cancelled) {
          setSceneLive({
            houseBar: DEFAULT_HOUSE_BAR,
            weeklyChallenge: DEFAULT_WEEKLY_CHALLENGE,
          });
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const whatsNewItems = useMemo(
    () =>
      [
        {
          title: 'Activity talks about your work',
          desc: 'Push and the bell now say “your verse is still open,” “streak dies at midnight,” and “someone echoed your bar” — not that the feed has posts. Tune it in Settings → Notifications.',
          icon: Bell,
          color: 'text-emerald-400',
          bgColor: 'bg-emerald-500/5',
        },
        ...(sceneLive?.houseBar.enabled
          ? [
              {
                title: sceneLive.houseBar.title || 'House bar of the day',
                desc: `One shared unfinished bar is pinned on The Scene: “${sceneLive.houseBar.seedBar}” Answer it from the pin — Admin can rewrite or hide it anytime.`,
                icon: Radio,
                color: 'text-fuchsia-400',
                bgColor: 'bg-fuchsia-500/5',
              } as const,
            ]
          : [
              {
                title: 'House bar of the day',
                desc: 'The Scene can pin one shared unfinished bar for everyone to answer. Studio Ops turns it on (and rewrites the line) from Admin → Config — no redeploy.',
                icon: Radio,
                color: 'text-fuchsia-400',
                bgColor: 'bg-fuchsia-500/5',
              } as const,
            ]),
        ...(sceneLive?.weeklyChallenge.enabled
          ? [
              {
                title: sceneLive.weeklyChallenge.title,
                desc: `${sceneLive.weeklyChallenge.description} Your bar count shows on The Scene. Admin can change or hide the challenge anytime.`,
                icon: CalendarRange,
                color: 'text-amber-400',
                bgColor: 'bg-amber-500/5',
              } as const,
            ]
          : [
              {
                title: 'Weekly public challenge',
                desc: 'A Scene-wide weekly cypher (hand-written bars, Monday reset) can be pinned, rewritten, or turned off from Admin → Config.',
                icon: CalendarRange,
                color: 'text-amber-400',
                bgColor: 'bg-amber-500/5',
              } as const,
            ]),
        {
          title: 'The Scene — your new home',
          desc: 'Sign in and land on your block: friends\u2019 wall drops, a Discover stream of who\u2019s live, and Your Booth. The Vault moved to its own room — one click away.',
          icon: Rocket,
          color: 'text-emerald-400',
          bgColor: 'bg-emerald-500/5',
        },
        {
          title: 'Press your Artist Home',
          desc: 'Logged-out home is a live Pressing playground — type your name and a bar, watch the page change, claim to save. Try writing free opens an Architect-style unfinished starter on the sheet.',
          icon: Globe,
          color: 'text-fuchsia-400',
          bgColor: 'bg-fuchsia-500/5',
        },
        ...(lockOn
          ? [
              {
                title: 'Finish this bar (social)',
                desc: 'Optional /lock casts: Fit score + share. Try sheet also finishes an Architect starter. Never the guest home door.',
                icon: Lock,
                color: 'text-amber-300',
                bgColor: 'bg-amber-500/5',
              } as const,
            ]
          : []),
        {
          title: 'Artist Home & The Block',
          desc: 'Your shareable public page — living skin, The Board, embeds, friends feed. Flip it live from Your Booth on the Scene or Studio Progress → Sharing.',
          icon: Globe,
          color: 'text-fuchsia-400',
          bgColor: 'bg-fuchsia-500/5',
        },
        {
          title: `${SIGNUP_INK} welcome Ink demo`,
          desc: `Free artists get ${SIGNUP_INK} Ink to try AI tools on a demo catalog. ${getProCheckoutCtaLine('yearly')} for export, vault saves, and unlimited projects.`,
          icon: Sparkles,
          color: 'text-primary',
          bgColor: 'bg-primary/5',
        },
        {
          title: 'Calibration Hub',
          desc: 'Vibe presets for everyone. Free tier gets DNA & Style PRESETS tabs; Pro unlocks Vault save.',
          icon: LayoutGrid,
          color: 'text-sky-400',
          bgColor: 'bg-sky-500/5',
        },
        {
          title: 'Refer a Friend',
          desc: 'Ink Store → copy your link. You and each friend get 150 Ink when they join (up to 4).',
          icon: Gift,
          color: 'text-amber-400',
          bgColor: 'bg-amber-500/5',
        },
      ] as const,
    [lockOn, sceneLive]
  );

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
    user?.studioPrivacyIntroCompletedAt,
    user?.createdAt,
    authReady,
    loading,
  ]);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg md:max-w-xl h-auto max-h-[min(90vh,100dvh)] flex flex-col p-0 overflow-hidden bg-background border-2 rounded-xl shadow-2xl z-[3000]">
        <DialogHeader className="p-5 sm:p-6 pb-4 border-b bg-muted/5 relative">
          <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
            <Rocket className="h-14 w-14 sm:h-16 sm:w-16" />
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-2 pr-12">
            <Badge className="bg-primary/20 text-primary border-primary/20 font-code px-2 text-[10px]">Bar 4 Bar v.07</Badge>
            <span className="text-[9px] font-bold uppercase tracking-[0.25em] sm:tracking-[0.3em] text-muted-foreground">Studio Upgrade Notes</span>
          </div>
          <DialogTitle className="font-headline text-2xl sm:text-3xl font-bold tracking-tighter leading-tight pr-4">
            What&apos;s New in the Studio
          </DialogTitle>
          <p className="text-[11px] sm:text-xs text-muted-foreground leading-relaxed pt-1 max-w-md">
            Activity now pings your verse, streak, and echoes. House bar of the day and the weekly
            challenge are admin-togglable on The Scene.
          </p>
        </DialogHeader>

        <div className="p-4 sm:p-6 overflow-y-auto studio-scrollbar">
          <ul className="space-y-2.5 sm:space-y-3">
            {whatsNewItems.map((item) => {
              const Icon = item.icon;
              return (
                <li
                  key={item.title}
                  className={cn(
                    'p-3 sm:p-3.5 rounded-lg border border-white/5 transition-all hover:bg-white/5',
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
          <p className="text-[9px] text-muted-foreground font-code uppercase tracking-widest text-center sm:text-left">June 2026 Studio Update</p>
          <Button onClick={dismiss} className="w-full sm:w-auto px-8 sm:px-10 font-bold h-10 shadow-lg">
            Got it
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
