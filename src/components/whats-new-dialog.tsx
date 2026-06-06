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
  Cpu,
  Rocket,
  Gift,
  LayoutGrid,
  Lock,
  Music2,
  Layers,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import {
  hasWhatsNewBeenShownThisLogin,
  markWhatsNewShownThisLogin,
} from '@/lib/whats-new-session';

export function WhatsNewDialog() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const { user } = useAuth();
  const scheduledRef = useRef(false);

  const dismiss = useCallback(() => {
    if (user?.id) {
      markWhatsNewShownThisLogin(user.id);
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
    if (pathname !== '/' || !user?.id) {
      return;
    }

    if (hasWhatsNewBeenShownThisLogin(user.id) || scheduledRef.current) {
      return;
    }

    scheduledRef.current = true;
    const timer = setTimeout(() => {
      if (hasWhatsNewBeenShownThisLogin(user.id)) return;
      markWhatsNewShownThisLogin(user.id);
      setOpen(true);
    }, 1500);

    return () => clearTimeout(timer);
  }, [pathname, user?.id]);

  const CATEGORIES = [
    {
      title: 'New',
      color: 'text-primary',
      bgColor: 'bg-primary/5',
      icon: <Rocket className="h-4 w-4" />,
      items: [
        {
          title: '3-Day Pro Trial',
          desc: 'New signups get full Studio Pro for 3 days — DNA Vault save, Performance, Freestyle, and more.',
          icon: <Sparkles className="h-3.5 w-3.5" />,
        },
        {
          title: 'Calibration Hub',
          desc: 'Vibe presets for everyone. Free tier gets DNA & Style PRESETS tabs; Pro unlocks Vault save.',
          icon: <LayoutGrid className="h-3.5 w-3.5" />,
        },
        {
          title: 'Loose Track DNA',
          desc: 'Loose tracks keep their own DNA. Album tracks still inherit from the project.',
          icon: <Music2 className="h-3.5 w-3.5" />,
        },
      ],
    },
    {
      title: 'Updates',
      color: 'text-amber-500',
      bgColor: 'bg-amber-500/5',
      icon: <Cpu className="h-4 w-4" />,
      items: [
        {
          title: 'Free Tier Limits',
          desc: '4 editable tracks on Free. Downgrade? Your 4 newest stay editable; older ones are view-only.',
          icon: <Layers className="h-3.5 w-3.5" />,
        },
        {
          title: 'Pro Lock Labels',
          desc: 'Locked Pro tools stay visible with clear Studio Pro labels — no mystery gray buttons.',
          icon: <Lock className="h-3.5 w-3.5" />,
        },
        {
          title: 'Refer a Friend',
          desc: 'Ink Store → copy your link. You and each friend get 150 Ink when they join (up to 4).',
          icon: <Gift className="h-3.5 w-3.5" />,
        },
      ],
    },
  ];

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-5xl h-auto max-h-[90vh] flex flex-col p-0 overflow-hidden bg-background border-2 rounded-xl shadow-2xl z-[3000]">
        <DialogHeader className="p-6 pb-4 border-b bg-muted/5 relative">
          <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
            <Cpu className="h-16 w-16" />
          </div>
          <div className="flex items-center gap-3 mb-1">
            <Badge className="bg-primary/20 text-primary border-primary/20 font-code px-2 text-[10px]">Bar 4 Bar v.05</Badge>
            <span className="text-[9px] font-bold uppercase tracking-[0.3em] text-muted-foreground">Studio Upgrade Notes</span>
          </div>
          <DialogTitle className="font-headline text-3xl font-bold tracking-tighter">What's New in the Studio</DialogTitle>
        </DialogHeader>

        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {CATEGORIES.map((cat) => (
              <div key={cat.title} className="space-y-4">
                <div className={cn("flex items-center gap-2 border-b pb-2", cat.color, "border-current/10")}>
                  {cat.icon}
                  <h3 className="font-headline text-lg font-bold uppercase tracking-tight">{cat.title}</h3>
                </div>
                <div className="space-y-2">
                  {cat.items.map((item) => (
                    <div key={item.title} className={cn("p-3 rounded-lg border border-white/5 transition-all hover:bg-white/5 group", cat.bgColor)}>
                      <div className="flex items-start gap-3">
                        <div className={cn("mt-0.5 p-1 rounded border border-current/20 shrink-0", cat.color)}>
                          {item.icon}
                        </div>
                        <div className="space-y-0.5">
                          <h4 className="text-[11px] font-bold text-foreground uppercase tracking-wide group-hover:text-primary transition-colors">{item.title}</h4>
                          <p className="text-[10px] text-muted-foreground leading-tight font-code">{item.desc}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <DialogFooter className="p-6 border-t bg-muted/5 sm:justify-between items-center">
          <p className="text-[9px] text-muted-foreground font-code uppercase tracking-widest">May 28, 2026 Studio Update</p>
          <Button onClick={dismiss} className="px-10 font-bold h-10 shadow-lg">
            Dismiss & Enter Vault
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
