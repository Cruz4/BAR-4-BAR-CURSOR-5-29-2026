'use client';

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Sparkles, 
  Zap, 
  RefreshCw, 
  Undo2, 
  ShieldCheck, 
  CheckCircle2, 
  AlertCircle, 
  Cpu, 
  Waves,
  Rocket,
  ArrowRight,
  Fingerprint,
  ClipboardPaste,
  FolderOpen
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { usePathname } from 'next/navigation';

const VERSION = '0.3.0';
const STORAGE_KEY = 'b4b_seen_v03';

export function WhatsNewDialog() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    // Only show on the main dashboard to avoid collision with tips
    if (pathname !== '/') return;

    const hasSeen = localStorage.getItem(STORAGE_KEY);
    if (!hasSeen) {
      const timer = setTimeout(() => setOpen(true), 1500);
      return () => clearTimeout(timer);
    }
  }, [pathname]);

  const handleClose = () => {
    localStorage.setItem(STORAGE_KEY, 'true');
    setOpen(false);
  };

  const CATEGORIES = [
    {
      title: 'New',
      color: 'text-primary',
      bgColor: 'bg-primary/5',
      icon: <Rocket className="h-4 w-4" />,
      items: [
        { 
          title: 'Remix Mode', 
          desc: 'Analyze lyrics to re-synthesize new structures.',
          icon: <RefreshCw className="h-3.5 w-3.5" />
        },
        { 
          title: 'Smart Structure', 
          desc: 'Auto-paste deconstruction of raw text.',
          icon: <ClipboardPaste className="h-3.5 w-3.5" />
        },
        { 
          title: 'Undo System', 
          desc: '20-level history stack for instant reverts.',
          icon: <Undo2 className="h-3.5 w-3.5" />
        },
        { 
          title: 'Ink Animation', 
          desc: 'Visual feedback pen for every Ink spent.',
          icon: <Zap className="h-3.5 w-3.5" />
        }
      ]
    },
    {
      title: 'Updates',
      color: 'text-amber-500',
      bgColor: 'bg-amber-500/5',
      icon: <Cpu className="h-4 w-4" />,
      items: [
        { 
          title: '6-Section Hub', 
          desc: 'Full calibration grid in Generation Hub.',
          icon: <Fingerprint className="h-3.5 w-3.5" />
        },
        { 
          title: 'Vibe Vault', 
          desc: 'Save and load custom instrumentation.',
          icon: <FolderOpen className="h-3.5 w-3.5" />
        },
        { 
          title: 'Dual DNA', 
          desc: 'Emerald and Green rule layer badges.',
          icon: <CheckCircle2 className="h-3.5 w-3.5" />
        },
        { 
          title: 'Scale Up', 
          desc: 'Upgraded legibility for Bar Workstation.',
          icon: <Sparkles className="h-3.5 w-3.5" />
        }
      ]
    },
    {
      title: 'Fixes',
      color: 'text-emerald-500',
      bgColor: 'bg-emerald-500/5',
      icon: <ShieldCheck className="h-4 w-4" />,
      items: [
        { 
          title: 'Notepad logic', 
          desc: 'Hardened Split/Merge index integrity.',
          icon: <ArrowRight className="h-3 w-3" />
        },
        { 
          title: 'UI Decoupling', 
          desc: 'Vibe toggles no longer minimize cards.',
          icon: <Waves className="h-3 w-3" />
        },
        { 
          title: 'Crash Patch', 
          desc: 'Resolved Reference Errors in synthesis.',
          icon: <AlertCircle className="h-3 w-3" />
        },
        { 
          title: 'Admin Logic', 
          desc: 'Refined Ink adjustment dashboard tools.',
          icon: <Cpu className="h-3 w-3" />
        }
      ]
    }
  ];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-5xl h-auto max-h-[90vh] flex flex-col p-0 overflow-hidden bg-background border-2 rounded-xl shadow-2xl z-[3000]">
        <DialogHeader className="p-6 pb-4 border-b bg-muted/5 relative">
          <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
            <Cpu className="h-16 w-16" />
          </div>
          <div className="flex items-center gap-3 mb-1">
            <Badge className="bg-primary/20 text-primary border-primary/20 font-code px-2 text-[10px]">Bar 4 Bar v.03</Badge>
            <span className="text-[9px] font-bold uppercase tracking-[0.3em] text-muted-foreground">Studio Upgrade Notes</span>
          </div>
          <DialogTitle className="font-headline text-3xl font-bold tracking-tighter">What's New in the Studio</DialogTitle>
        </DialogHeader>

        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
          <p className="text-[9px] text-muted-foreground font-code uppercase tracking-widest">Architected for the 5/14/2026 State</p>
          <Button onClick={handleClose} className="px-10 font-bold h-10 shadow-lg">
            Dismiss & Enter Vault
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
