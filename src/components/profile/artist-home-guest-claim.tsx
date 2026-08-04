'use client';

/**
 * Soft claim CTA for signed-out visitors on Artist Home.
 * Thin bottom strip — dismissible, stays out of the hero/modules.
 */

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Globe, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/use-auth';
import { buildLoginUrl } from '@/lib/login-links';
import { trackGuestSignupCta } from '@/lib/guest-funnel-client';
import { cn } from '@/lib/utils';

const DISMISS_KEY = 'b4b-artist-home-claim-dismissed';

type ArtistHomeGuestClaimProps = {
  artistName: string;
  /** Profile owner's referral code — credits them when a guest signs up. */
  referralCode?: string;
  className?: string;
};

export function ArtistHomeGuestClaim({
  artistName,
  referralCode,
  className,
}: ArtistHomeGuestClaimProps) {
  const { user, loading } = useAuth();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (loading || user) {
      setVisible(false);
      return;
    }
    try {
      if (sessionStorage.getItem(DISMISS_KEY) === '1') {
        setVisible(false);
        return;
      }
    } catch {
      /* ignore */
    }
    setVisible(true);
  }, [user, loading]);

  if (!visible) return null;

  const signupHref = buildLoginUrl({
    mode: 'signup',
    next: '/',
    intent: 'claim_artist_home',
    referralCode,
  });

  const dismiss = () => {
    try {
      sessionStorage.setItem(DISMISS_KEY, '1');
    } catch {
      /* ignore */
    }
    setVisible(false);
  };

  return (
    <div
      role="region"
      aria-label="Claim your free Artist Home"
      className={cn(
        'fixed inset-x-0 bottom-0 z-40 border-t border-[var(--ph-border,rgba(255,255,255,0.12))]',
        'bg-[var(--ph-bg,hsl(216_28%_6%))]/92 backdrop-blur-md',
        'px-3 py-2.5 sm:px-5',
        className
      )}
    >
      <div className="mx-auto flex w-full max-w-[1200px] items-center gap-3">
        <span className="hidden h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[var(--ph-border,rgba(255,255,255,0.15))] bg-[var(--ph-accent,#7dd3fc)]/10 text-[var(--ph-accent,#7dd3fc)] sm:flex">
          <Globe className="h-3.5 w-3.5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--ph-text,#fff)] sm:text-xs">
            Claim your free Artist Home
          </p>
          <p className="truncate text-[10px] leading-snug text-[var(--ph-muted,rgba(255,255,255,0.55))] sm:text-[11px]">
            Make a page like {artistName.split(' ')[0] || 'this'} — free, private until you go live.
          </p>
        </div>
        <Button
          size="sm"
          className="h-8 shrink-0 gap-1.5 bg-[var(--ph-accent,#7dd3fc)] px-3 font-bold uppercase text-black hover:opacity-90"
          asChild
        >
          <Link
            href={signupHref}
            onClick={() => trackGuestSignupCta('artist_home_claim')}
          >
            Create free
          </Link>
        </Button>
        <button
          type="button"
          onClick={dismiss}
          aria-label="Dismiss"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-[var(--ph-muted,rgba(255,255,255,0.5))] transition-colors hover:bg-white/5 hover:text-[var(--ph-text,#fff)]"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
