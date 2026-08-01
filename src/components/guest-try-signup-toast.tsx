'use client';

import { ToastAction } from '@/components/ui/toast';
import { toast } from '@/hooks/use-toast';
import { prepareGuestTrackForSignup } from '@/lib/guest-track-session';
import {
  getGuestSignupHref,
  trackGuestSignupCta,
} from '@/lib/guest-funnel-client';
import { SIGNUP_INK } from '@/lib/subscription';

function goSignup(source: string) {
  trackGuestSignupCta(source);
  prepareGuestTrackForSignup();
  window.location.assign(getGuestSignupHref());
}

/** Soft conversion prompt with a one-tap signup action. */
export function promptGuestSignup(options: {
  title: string;
  description: string;
  source: string;
  ctaLabel?: string;
}): void {
  const ctaLabel = options.ctaLabel || 'Sign up free';
  toast({
    title: options.title,
    description: options.description,
    duration: 14_000,
    action: (
      <ToastAction altText={ctaLabel} onClick={() => goSignup(options.source)}>
        {ctaLabel}
      </ToastAction>
    ),
  });
}

export function promptGuestSignupAfterAccept(remainingAssists: number | null): void {
  const left =
    typeof remainingAssists === 'number'
      ? `${remainingAssists} demo assist${remainingAssists === 1 ? '' : 's'} left · `
      : '';
  promptGuestSignup({
    title: 'Line locked in',
    description: `${left}Sign up free to save this sheet and unlock ${SIGNUP_INK} Ink for the full Co-Writer.`,
    source: 'accept_line',
    ctaLabel: 'Save & sign up',
  });
}

export function promptGuestSignupDemoExhausted(): void {
  // Prefer GuestDemoSignupRequiredDialog from the try sheet; toast is a fallback.
  promptGuestSignup({
    title: 'Demo assists used',
    description: `Your bars stay on this device until you leave. Sign up free to save them and get ${SIGNUP_INK} Ink (separate from the demo).`,
    source: 'demo_exhausted',
    ctaLabel: 'Save my bars',
  });
}

export function promptGuestSignupLockedFeature(featureLabel: string): void {
  promptGuestSignup({
    title: 'Sign up to unlock',
    description: `${featureLabel} uses real Ink after signup. Free account keeps your try-sheet bars and unlocks the full studio.`,
    source: `locked:${featureLabel}`,
    ctaLabel: 'Sign up free',
  });
}
