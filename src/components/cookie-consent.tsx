'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
  COOKIE_CONSENT_CHANGED_EVENT,
  COOKIE_CONSENT_STORAGE_KEY,
  dispatchCookieConsentChanged,
  grantTikTokPixelConsent,
} from '@/lib/tiktok-pixel';
import { isStudioOnboardingBusy } from '@/lib/studio-privacy-intro';

export function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const sync = () => {
      try {
        if (localStorage.getItem(COOKIE_CONSENT_STORAGE_KEY)) {
          setVisible(false);
          return;
        }
      } catch {
        /* still show when storage is blocked */
      }
      // Don't stack under guided tours / privacy intro — defer until onboarding is idle.
      setVisible(!isStudioOnboardingBusy());
    };

    sync();
    const onStorage = (e: StorageEvent) => {
      if (e.key === COOKIE_CONSENT_STORAGE_KEY) sync();
    };
    window.addEventListener('storage', onStorage);
    window.addEventListener(COOKIE_CONSENT_CHANGED_EVENT, sync);
    // Tours set session flags; poll briefly so we reappear after Skip/Done.
    const timer = window.setInterval(sync, 800);
    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener(COOKIE_CONSENT_CHANGED_EVENT, sync);
      window.clearInterval(timer);
    };
  }, []);

  const accept = () => {
    try {
      localStorage.setItem(COOKIE_CONSENT_STORAGE_KEY, 'accepted');
    } catch {
      /* ignore */
    }
    grantTikTokPixelConsent();
    setVisible(false);
    dispatchCookieConsentChanged();
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-[4.75rem] left-4 right-4 md:right-auto md:max-w-md z-[500] p-4 rounded-xl border border-white/10 bg-[#0c121d]/95 backdrop-blur-xl shadow-2xl">
      <p className="text-xs text-muted-foreground leading-relaxed mb-3 font-code">
        We use essential cookies and local storage to run the studio, plus optional analytics and advertising measurement (including TikTok and AdSense on public pages). See our{' '}
        <Link href="/cookies" className="text-primary hover:underline">Cookie Policy</Link> and{' '}
        <Link href="/privacy" className="text-primary hover:underline">Privacy Policy</Link>.
      </p>
      <Button size="sm" className="w-full font-bold uppercase text-[10px]" onClick={accept}>
        Got it
      </Button>
    </div>
  );
}
