'use client';

import React, { useEffect, useState } from 'react';
import { X, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { FREE_TIER_EXPECTATIONS } from '@/lib/studio-onboarding';
import { isProUser } from '@/lib/subscription';
import type { User } from '@/lib/types';
import Link from 'next/link';

export function FreeTierExpectationsBanner({ user }: { user: User | null }) {
  const [visible, setVisible] = useState(false);
  const paidPro = isProUser(user);
  const mode: 'hidden' | 'visitor' = paidPro ? 'hidden' : 'visitor';

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
    <div
      data-app-chrome
      className="z-50 flex shrink-0 items-start gap-3 border-b border-orange-500/20 bg-orange-500/[0.06] px-4 py-2.5 sm:max-xl:pr-[calc(3%+20rem)] min-[1760px]:pr-[calc(3%+20rem)]"
    >
      <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-orange-500" />
      <div className="min-w-0 flex-grow space-y-1">
        <p className="text-xs font-bold uppercase tracking-widest text-orange-600 sm:text-sm">
          {FREE_TIER_EXPECTATIONS.headline}
        </p>
        <p className="text-xs leading-relaxed text-muted-foreground sm:text-sm [overflow-wrap:anywhere]">
          {FREE_TIER_EXPECTATIONS.body}
        </p>
        <Link href="/usage?tab=cloud" className="text-[11px] font-bold uppercase text-orange-600 hover:underline sm:text-xs">
          Compare tiers →
        </Link>
      </div>
      <Button type="button" variant="ghost" size="icon" className="h-7 w-7 shrink-0 text-muted-foreground hover:text-foreground" onClick={dismissVisitorBanner} aria-label="Dismiss">
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
}
