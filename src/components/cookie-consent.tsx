'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
  COOKIE_CONSENT_STORAGE_KEY,
  grantTikTokPixelConsent,
} from '@/lib/tiktok-pixel';

export function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      if (!localStorage.getItem(COOKIE_CONSENT_STORAGE_KEY)) setVisible(true);
    } catch {
      setVisible(true);
    }
  }, []);

  const accept = () => {
    try {
      localStorage.setItem(COOKIE_CONSENT_STORAGE_KEY, 'accepted');
    } catch {
      /* ignore */
    }
    grantTikTokPixelConsent();
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:max-w-md z-[500] p-4 rounded-xl border border-white/10 bg-[#0c121d]/95 backdrop-blur-xl shadow-2xl">
      <p className="text-xs text-muted-foreground leading-relaxed mb-3 font-code">
        We use essential cookies and local storage to keep you signed in and save your studio preferences. See our{' '}
        <Link href="/cookies" className="text-primary hover:underline">Cookie Policy</Link> and{' '}
        <Link href="/privacy" className="text-primary hover:underline">Privacy Policy</Link>.
      </p>
      <Button size="sm" className="w-full font-bold uppercase text-[10px]" onClick={accept}>
        Got it
      </Button>
    </div>
  );
}
