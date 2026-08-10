'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { RefreshCw, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SIGNUP_INK } from '@/lib/subscription';
import { prepareGuestTrackForSignup } from '@/lib/guest-track-session';
import { GUEST_DEMO_MAX_USES } from '@/lib/guest-try';
import { useSearchParams } from 'next/navigation';
import {
  getGuestSignupHref,
  trackGuestSignupCta,
} from '@/lib/guest-funnel-client';

type GuestTrySaveBannerProps = {
  /** Live remaining count from the editor after a gen (optional). */
  remainingOverride?: number | null;
  /** Reshuffle Architect starter on bar 1 and clear bar 2. */
  onNewStarter?: () => void;
};

/** Soft gate — finish the Architect starter; demo AI capped; signup saves. */
export function GuestTrySaveBanner({
  remainingOverride = null,
  onNewStarter,
}: GuestTrySaveBannerProps) {
  const searchParams = useSearchParams();
  const [remaining, setRemaining] = useState<number | null>(null);

  const refreshRemaining = useCallback(() => {
    fetch('/api/ai/demo')
      .then((r) => r.json())
      .then((d) => {
        if (typeof d.remaining === 'number') setRemaining(d.remaining);
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    refreshRemaining();
  }, [refreshRemaining]);

  useEffect(() => {
    if (typeof remainingOverride === 'number') setRemaining(remainingOverride);
  }, [remainingOverride]);

  const signupHref = getGuestSignupHref({
    marketingRef: searchParams.get('ref'),
  });

  const left = remaining;
  const outOfDemo = left !== null && left <= 0;
  const usedSome = left !== null && left < GUEST_DEMO_MAX_USES;

  const onSignupClick = () => {
    trackGuestSignupCta(outOfDemo ? 'banner_exhausted' : usedSome ? 'banner_mid_demo' : 'banner');
    prepareGuestTrackForSignup();
  };

  return (
    <div
      className={
        outOfDemo
          ? 'shrink-0 border-b border-amber-500/40 bg-amber-500/15 px-2.5 py-1.5 md:px-4 md:py-2.5 flex flex-col gap-1.5 md:flex-row md:flex-wrap md:items-center md:justify-between md:gap-2 z-50'
          : 'shrink-0 border-b border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1.5 md:px-4 md:py-2.5 flex flex-col gap-1.5 md:flex-row md:flex-wrap md:items-center md:justify-between md:gap-2 z-50'
      }
    >
      <div className="flex items-start gap-1.5 md:gap-2 min-w-0 flex-1">
        <Sparkles
          className={
            outOfDemo
              ? 'h-3.5 w-3.5 md:h-4 md:w-4 text-amber-300 shrink-0 mt-0.5'
              : 'h-3.5 w-3.5 md:h-4 md:w-4 text-emerald-400 shrink-0 mt-0.5'
          }
        />
        <div className="min-w-0 space-y-0 md:space-y-0.5">
          <p
            className={
              outOfDemo
                ? 'text-[9px] md:text-[11px] font-code text-amber-50/95 leading-tight md:leading-snug'
                : 'text-[9px] md:text-[11px] font-code text-emerald-50/95 leading-tight md:leading-snug'
            }
          >
            {outOfDemo ? (
              <>
                <span className="font-bold text-amber-200">Your bars are ready to keep.</span>{' '}
                Demo assists are used — sign up free to save this sheet and unlock {SIGNUP_INK} Ink.
              </>
            ) : (
              <>
                <span className="font-bold text-emerald-200">Finish this bar</span>
                {' — '}
                deep Lyrical Architect starter on line 1. Drop yours on line 2.{' '}
                <span className="text-emerald-100/90">Rhyme Pulse</span> is free.
                {' '}
                <span className="text-emerald-100/90">Generate Next</span> — up to {GUEST_DEMO_MAX_USES}{' '}
                demo assists.
              </>
            )}
          </p>
          <p className="text-[8px] md:text-[10px] font-code text-muted-foreground leading-tight md:leading-snug">
            {outOfDemo ? (
              <>Takes ~20 seconds. Your try-sheet lines carry into the vault after signup.</>
            ) : left !== null ? (
              <>
                <span className="text-emerald-300 font-bold">{left}</span> demo assist
                {left === 1 ? '' : 's'} left
                {' · '}Sign up → save + {SIGNUP_INK} Ink
              </>
            ) : (
              <>Sign up to save this track and unlock the full Co-Writer.</>
            )}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-1.5 md:gap-2 shrink-0 self-stretch md:self-auto">
        {onNewStarter && !outOfDemo ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-7 md:h-8 px-2 md:px-2.5 text-[9px] md:text-[10px] font-bold uppercase tracking-wide border-emerald-500/40 text-emerald-100 hover:bg-emerald-500/20 gap-1"
            onClick={onNewStarter}
          >
            <RefreshCw className="h-3 w-3" />
            New starter
          </Button>
        ) : null}
        <Button
          asChild
          size="sm"
          className={
            outOfDemo
              ? 'h-7 md:h-8 flex-1 md:flex-none px-2.5 md:px-3 text-[9px] md:text-[10px] font-bold uppercase tracking-wide bg-amber-400 hover:bg-amber-300 text-amber-950'
              : 'h-7 md:h-8 flex-1 md:flex-none px-2.5 md:px-3 text-[9px] md:text-[10px] font-bold uppercase tracking-wide bg-emerald-500 hover:bg-emerald-400 text-emerald-950'
          }
        >
          <Link href={signupHref} onClick={onSignupClick}>
            {outOfDemo ? 'Save my bars' : 'Sign up to save'}
          </Link>
        </Button>
        <Button asChild variant="ghost" size="sm" className="h-7 md:h-8 px-2 text-[9px] md:text-[10px] font-bold uppercase text-muted-foreground">
          <Link href="/">Home</Link>
        </Button>
      </div>
    </div>
  );
}
