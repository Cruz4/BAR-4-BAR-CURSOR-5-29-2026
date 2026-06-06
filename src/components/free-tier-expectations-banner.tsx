'use client';

import React, { useEffect, useState } from 'react';
import { X, Sparkles, Timer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { FREE_TIER_EXPECTATIONS, PRO_TRIAL_BANNER } from '@/lib/studio-onboarding';
import { isProUser } from '@/lib/subscription';
import { getTrialDaysRemaining, isTrialActive } from '@/lib/trial';
import type { User } from '@/lib/types';
import Link from 'next/link';

export function FreeTierExpectationsBanner({ user }: { user: User | null }) {
  const [visible, setVisible] = useState(false);
  const paidPro = isProUser(user);
  const trialActive = isTrialActive(user);
  const trialDays = getTrialDaysRemaining(user);
  const mode: 'hidden' | 'trial' | 'visitor' = paidPro ? 'hidden' : trialActive ? 'trial' : 'visitor';

  useEffect(() => {
    if (mode === 'hidden') return;
    const dismissKey = mode === 'trial' ? PRO_TRIAL_BANNER.dismissKey : FREE_TIER_EXPECTATIONS.dismissKey;
    try {
      const dismissed = localStorage.getItem(dismissKey);
      setVisible(!dismissed);
    } catch {
      setVisible(true);
    }
  }, [mode]);

  if (mode === 'hidden' || !visible) return null;

  const dismiss = () => {
    const dismissKey = mode === 'trial' ? PRO_TRIAL_BANNER.dismissKey : FREE_TIER_EXPECTATIONS.dismissKey;
    try {
      localStorage.setItem(dismissKey, '1');
    } catch {
      /* ignore */
    }
    setVisible(false);
  };

  if (mode === 'trial') {
    return (
      <div className="shrink-0 border-b border-sky-500/25 bg-sky-500/[0.08] px-4 py-2.5 flex items-start gap-3 z-50">
        <Timer className="h-4 w-4 text-sky-400 shrink-0 mt-0.5" />
        <div className="flex-grow min-w-0 space-y-1">
          <p className="text-[10px] font-bold uppercase tracking-widest text-sky-400">
            {PRO_TRIAL_BANNER.headline} — {trialDays} day{trialDays === 1 ? '' : 's'} left
          </p>
          <p className="text-[11px] text-muted-foreground leading-snug">
            Full Pro workflow unlocked: custom DNA saves, Performance Mode, Freestyle, vault import/export, and DNA Drop links. Upgrade before trial ends to keep access.
          </p>
          <Link href="/usage?tab=cloud" className="text-[9px] font-bold uppercase text-sky-400 hover:underline">
            Upgrade to Studio Pro →
          </Link>
        </div>
        <Button type="button" variant="ghost" size="icon" className="h-7 w-7 shrink-0 text-muted-foreground hover:text-foreground" onClick={dismiss} aria-label="Dismiss">
          <X className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <div className="shrink-0 border-b border-orange-500/20 bg-orange-500/[0.06] px-4 py-2.5 flex items-start gap-3 z-50">
      <Sparkles className="h-4 w-4 text-orange-500 shrink-0 mt-0.5" />
      <div className="flex-grow min-w-0 space-y-1">
        <p className="text-[10px] font-bold uppercase tracking-widest text-orange-600">{FREE_TIER_EXPECTATIONS.headline}</p>
        <p className="text-[11px] text-muted-foreground leading-snug">{FREE_TIER_EXPECTATIONS.body}</p>
        <Link href="/pricing" className="text-[9px] font-bold uppercase text-orange-600 hover:underline">
          Compare tiers →
        </Link>
      </div>
      <Button type="button" variant="ghost" size="icon" className="h-7 w-7 shrink-0 text-muted-foreground hover:text-foreground" onClick={dismiss} aria-label="Dismiss">
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
}
