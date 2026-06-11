'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { Droplets, Sparkles, Timer, Battery } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/use-auth';
import { useUsage } from '@/context/usage-context';
import { FREE_MONTHLY_RESIDENCY_INK } from '@/lib/subscription';
import { expectedSignupResidencyInk, isEligibleForFreeMonthlyGrant } from '@/lib/ink-grants';
import { getProCheckoutCtaLine, getVisitorResidencyPoolCapLine } from '@/lib/studio-tiers';
import { INK_POOL_LABELS, getInkLedgerLabel } from '@/lib/ink-ledger';
import {
  hasSeenWelcomeInk,
  isRecentStudioAccount,
  markWelcomeInkSeen,
} from '@/lib/welcome-ink-session';
import {
  isStudioOnboardingBusy,
  STUDIO_PRIVACY_INTRO_ELIGIBLE_EVENT,
} from '@/lib/studio-privacy-intro';
import { cn } from '@/lib/utils';

type GrantLine = {
  pool: 'residency' | 'trial' | 'permanent';
  amount: number;
  label: string;
};

export function WelcomeInkDialog() {
  const { user, authReady, loading: authLoading } = useAuth();
  const { inkBalance, residencyBalance, trialInkBalance, purchasedBalance, loading: usageLoading } = useUsage();
  const [open, setOpen] = useState(false);
  const scheduledRef = useRef(false);

  const grantLines = useMemo((): GrantLine[] => {
    if (!user) return [];

    const monthKey = new Date().toISOString().slice(0, 7);
    const expectedAfterSignup = expectedSignupResidencyInk() + purchasedBalance;
    const monthlyTopUp = residencyBalance - expectedAfterSignup - trialInkBalance;
    const welcomeAmount =
      isEligibleForFreeMonthlyGrant(user.createdAt, monthKey) &&
      monthlyTopUp >= FREE_MONTHLY_RESIDENCY_INK - 5
        ? expectedSignupResidencyInk()
        : Math.max(0, residencyBalance - trialInkBalance - purchasedBalance);

    const lines: GrantLine[] = [];
    if (welcomeAmount > 0) {
      lines.push({
        pool: 'residency',
        amount: welcomeAmount,
        label: getInkLedgerLabel('signup_residency'),
      });
    }

    if (purchasedBalance > 0) {
      lines.push({
        pool: 'permanent',
        amount: purchasedBalance,
        label: 'Permanent Ink (referral or purchase)',
      });
    }

    if (trialInkBalance > 0) {
      lines.push({
        pool: 'trial',
        amount: trialInkBalance,
        label: getInkLedgerLabel('trial_ink'),
      });
    }

    if (
      isEligibleForFreeMonthlyGrant(user.createdAt, monthKey) &&
      monthlyTopUp >= FREE_MONTHLY_RESIDENCY_INK - 5
    ) {
      lines.push({
        pool: 'residency',
        amount: monthlyTopUp,
        label: getInkLedgerLabel('monthly_residency'),
      });
    }

    return lines;
  }, [user, residencyBalance, trialInkBalance, purchasedBalance]);

  const dismiss = useCallback(() => {
    if (user?.id) markWelcomeInkSeen(user.id);
    setOpen(false);
  }, [user?.id]);

  useEffect(() => {
    scheduledRef.current = false;
    setOpen(false);
  }, [user?.id]);

  const tryOpenWelcome = useCallback(() => {
    if (!user?.id || !isRecentStudioAccount(user.createdAt)) return;
    if (hasSeenWelcomeInk(user.id)) return;
    if (isStudioOnboardingBusy()) return;
    setOpen(true);
  }, [user?.id, user?.createdAt]);

  useEffect(() => {
    if (!authReady || authLoading || usageLoading || !user?.id) return;
    if (!isRecentStudioAccount(user.createdAt)) return;
    if (hasSeenWelcomeInk(user.id)) return;
    if (scheduledRef.current) return;
    if (isStudioOnboardingBusy()) return;

    scheduledRef.current = true;
    const timer = window.setTimeout(tryOpenWelcome, 2200);
    return () => window.clearTimeout(timer);
  }, [authReady, authLoading, usageLoading, user?.id, user?.createdAt, tryOpenWelcome]);

  useEffect(() => {
    const onEligible = () => tryOpenWelcome();
    window.addEventListener(STUDIO_PRIVACY_INTRO_ELIGIBLE_EVENT, onEligible);
    return () => window.removeEventListener(STUDIO_PRIVACY_INTRO_ELIGIBLE_EVENT, onEligible);
  }, [tryOpenWelcome]);

  if (!user || grantLines.length === 0) return null;

  return (
    <Dialog open={open} onOpenChange={(next) => !next && dismiss()}>
      <DialogContent className="max-w-md border-primary/25 bg-card/95">
        <DialogHeader>
          <DialogTitle className="font-headline text-xl uppercase flex items-center gap-2">
            <Droplets className="h-5 w-5 text-primary" />
            Your Ink reserves
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <p className="text-xs text-sky-300/95 flex items-start gap-2 leading-relaxed">
            <Sparkles className="h-4 w-4 shrink-0 mt-0.5 text-sky-400" />
            <span>
              Welcome Ink powers AI in the demo studio. Want full Pro workflow?{' '}
              <Link href="/pricing" className="font-bold text-sky-300 hover:underline" onClick={dismiss}>
                {getProCheckoutCtaLine('yearly')}
              </Link>
              .
            </span>
          </p>

          <p className="text-xs text-muted-foreground leading-relaxed">
            Ink added to your account — full history in{' '}
            <Link href="/usage?tab=history" className="text-primary hover:underline" onClick={dismiss}>
              Usage → History
            </Link>
            .
          </p>

          <ul className="space-y-2">
            {grantLines.map((line, i) => (
              <li
                key={`${line.pool}-${line.label}-${i}`}
                className="flex items-center justify-between gap-3 rounded-md border border-white/10 bg-white/5 px-3 py-2"
              >
                <div className="min-w-0">
                  <p className="text-[10px] font-bold uppercase text-foreground truncate">{line.label}</p>
                  <Badge
                    variant="outline"
                    className={cn(
                      'mt-1 text-[8px] uppercase',
                      line.pool === 'residency' && 'border-emerald-500/30 text-emerald-400',
                      line.pool === 'trial' && 'border-sky-500/30 text-sky-400',
                      line.pool === 'permanent' && 'border-orange-500/30 text-orange-400'
                    )}
                  >
                    {INK_POOL_LABELS[line.pool]}
                  </Badge>
                </div>
                <span className="font-code font-bold text-emerald-400 shrink-0">+{line.amount.toLocaleString()}</span>
              </li>
            ))}
          </ul>

          <div className="rounded-md border border-primary/20 bg-primary/5 px-3 py-2.5 space-y-1">
            <p className="text-[10px] font-bold uppercase tracking-widest text-primary flex items-center gap-2">
              <Battery className="h-3.5 w-3.5" />
              Total available now: {inkBalance.toLocaleString()} Ink
            </p>
            <p className="text-[10px] text-muted-foreground">
              Residency {residencyBalance.toLocaleString()}
              {trialInkBalance > 0 ? ` · Trial ${trialInkBalance.toLocaleString()}` : ''}
              {purchasedBalance > 0 ? ` · Permanent ${purchasedBalance.toLocaleString()}` : ''}
            </p>
          </div>

          <p className="text-[10px] text-muted-foreground flex items-center gap-2">
            <Timer className="h-3.5 w-3.5 shrink-0" />
            {getVisitorResidencyPoolCapLine()}
          </p>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" className="uppercase text-[10px] font-bold" asChild>
            <Link href="/usage?tab=history" onClick={dismiss}>View history</Link>
          </Button>
          <Button className="uppercase text-[10px] font-bold" onClick={dismiss}>
            Start writing
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
