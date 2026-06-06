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
import {
  Sparkles,
  Rocket,
  Gift,
  LayoutGrid,
  Music2,
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

function isVaultLanding(pathname: string | null): boolean {
  if (!pathname) return false;
  if (pathname === '/') return true;
  return pathname.startsWith('/albums/') && !pathname.includes('/tracks/');
}

const WHATS_NEW_ITEMS = [
  {
    title: '3-Day Pro Trial',
    desc: 'New signups get full Studio Pro for 3 days — DNA Vault save, Performance, Freestyle, and more.',
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
    title: 'Loose Track DNA',
    desc: 'Loose tracks keep their own DNA. Album tracks still inherit from the project.',
    icon: Music2,
    color: 'text-emerald-400',
    bgColor: 'bg-emerald-500/5',
  },
  {
    title: 'Refer a Friend',
    desc: 'Ink Store → copy your link. You and each friend get 150 Ink when they join (up to 4).',
    icon: Gift,
    color: 'text-amber-400',
    bgColor: 'bg-amber-500/5',
  },
] as const;

export function WhatsNewDialog() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const { user, authReady, loading } = useAuth();
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
    // New signups get the vault guided tour first — not this dialog.
    if (!user.vaultTutorialCompletedAt) return;
    if (hasDismissedWhatsNew(user.id)) return;
    if (hasWhatsNewBeenShownThisLogin(user.id) || scheduledRef.current) return;

    scheduledRef.current = true;
    const timer = setTimeout(() => {
      if (!user?.id || hasDismissedWhatsNew(user.id)) return;
      if (!user.vaultTutorialCompletedAt) return;
      if (hasWhatsNewBeenShownThisLogin(user.id)) return;
      markWhatsNewShownThisLogin(user.id);
      setOpen(true);
    }, 1200);

    return () => clearTimeout(timer);
  }, [pathname, user?.id, user?.vaultTutorialCompletedAt, authReady, loading]);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg md:max-w-xl h-auto max-h-[min(90vh,100dvh)] flex flex-col p-0 overflow-hidden bg-background border-2 rounded-xl shadow-2xl z-[3000]">
        <DialogHeader className="p-5 sm:p-6 pb-4 border-b bg-muted/5 relative">
          <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
            <Rocket className="h-14 w-14 sm:h-16 sm:w-16" />
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-2 pr-12">
            <Badge className="bg-primary/20 text-primary border-primary/20 font-code px-2 text-[10px]">Bar 4 Bar v.05</Badge>
            <span className="text-[9px] font-bold uppercase tracking-[0.25em] sm:tracking-[0.3em] text-muted-foreground">Studio Upgrade Notes</span>
          </div>
          <DialogTitle className="font-headline text-2xl sm:text-3xl font-bold tracking-tighter leading-tight pr-4">
            What&apos;s New in the Studio
          </DialogTitle>
          <p className="text-[11px] sm:text-xs text-muted-foreground leading-relaxed pt-1 max-w-md">
            A quick read on the latest studio features — dismiss anytime.
          </p>
        </DialogHeader>

        <div className="p-4 sm:p-6 overflow-y-auto studio-scrollbar">
          <ul className="space-y-2.5 sm:space-y-3">
            {WHATS_NEW_ITEMS.map((item) => {
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
