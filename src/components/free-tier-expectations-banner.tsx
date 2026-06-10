'use client';

import React, { useEffect, useState } from 'react';
import { X, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { FREE_TIER_EXPECTATIONS } from '@/lib/studio-onboarding';
import { isProUser } from '@/lib/subscription';
import { isTrialActive } from '@/lib/trial';
import type { User } from '@/lib/types';
import Link from 'next/link';

export function FreeTierExpectationsBanner({ user }: { user: User | null }) {
  const [visible, setVisible] = useState(false);
  const paidPro = isProUser(user);
  const trialActive = isTrialActive(user);
  const mode: 'hidden' | 'visitor' = paidPro || trialActive ? 'hidden' : 'visitor';

  useEffect(() => {
    if (mode === 'hidden') return;
    try {
      const dismissed = localStorage.getItem(FREE_TIER_EXPECTATIONS.dismissKey);
      setVisible(!dismissed);
    } catch {
      setVisible(true);
    }
  }, [mode]);

  if (mode === 'hidden' || !visible) return null;

  const dismissVisitorBanner = () => {
    try {
      localStorage.setItem(FREE_TIER_EXPECTATIONS.dismissKey, '1');
    } catch {
      /* ignore */
    }
    setVisible(false);
  };

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
      <Button type="button" variant="ghost" size="icon" className="h-7 w-7 shrink-0 text-muted-foreground hover:text-foreground" onClick={dismissVisitorBanner} aria-label="Dismiss">
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
}
