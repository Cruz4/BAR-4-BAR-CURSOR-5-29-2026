'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SIGNUP_INK } from '@/lib/subscription';
import { buildLoginUrl } from '@/lib/login-links';
import { prepareGuestTrackForSignup } from '@/lib/guest-track-session';
import { GUEST_DEMO_MAX_USES } from '@/lib/guest-try';
import { useSearchParams } from 'next/navigation';

type GuestTrySaveBannerProps = {
  /** Live remaining count from the editor after a gen (optional). */
  remainingOverride?: number | null;
};

/** Soft gate — write freely; demo AI is capped and separate from signup Ink. */
export function GuestTrySaveBanner({ remainingOverride = null }: GuestTrySaveBannerProps) {
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

  const signupHref = buildLoginUrl({
    mode: 'signup',
    marketingRef: searchParams.get('ref'),
    next: '/',
  });

  const left = remaining;
  const outOfDemo = left !== null && left <= 0;

  return (
    <div className="shrink-0 border-b border-emerald-500/30 bg-emerald-500/10 px-3 md:px-4 py-2.5 flex flex-wrap items-center justify-between gap-2 z-50">
      <div className="flex items-start gap-2 min-w-0 flex-1">
        <Sparkles className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
        <div className="min-w-0 space-y-0.5">
          <p className="text-[10px] md:text-[11px] font-code text-emerald-50/95 leading-snug">
            <span className="font-bold text-emerald-200">Try sheet — no account yet.</span>{' '}
            Write freely. <span className="text-emerald-100/90">Rhyme Pulse</span> is live & free.
            {' '}<span className="text-emerald-100/90">Generate Next</span> — up to {GUEST_DEMO_MAX_USES} demo assists (not Ink).
            Other AI tools unlock after signup.
          </p>
          <p className="text-[9px] md:text-[10px] font-code text-muted-foreground leading-snug">
            {outOfDemo ? (
              <>Demo assists used on this browser. Sign up to save this track and get {SIGNUP_INK} Ink (separate from the demo).</>
            ) : left !== null ? (
              <>
                <span className="text-emerald-300 font-bold">{left}</span> demo assist{left === 1 ? '' : 's'} left
                {' · '}Sign up → save + {SIGNUP_INK} Ink for the full studio
              </>
            ) : (
              <>Sign up to save this track and unlock {SIGNUP_INK} Ink for the full Co-Writer.</>
            )}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <Button asChild size="sm" className="h-8 px-3 text-[10px] font-bold uppercase tracking-wide bg-emerald-500 hover:bg-emerald-400 text-emerald-950">
          <Link href={signupHref} onClick={() => prepareGuestTrackForSignup()}>
            Sign up to save
          </Link>
        </Button>
        <Button asChild variant="ghost" size="sm" className="h-8 px-2 text-[10px] font-bold uppercase text-muted-foreground">
          <Link href="/welcome">About</Link>
        </Button>
      </div>
    </div>
  );
}
