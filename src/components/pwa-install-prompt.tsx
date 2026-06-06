'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { X, Share, Smartphone, Download } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import {
  dismissPwaInstallPrompt,
  getMobileInstallPlatform,
  isMobileInstallPlatform,
  isStandalonePwa,
  markPwaInstalled,
  PWA_INSTALL_SHOW_EVENT,
  requestPwaInstallPrompt,
  shouldAutoShowPwaInstallPrompt,
  type MobileInstallPlatform,
} from '@/lib/pwa-install';

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

function InstallSteps({ platform }: { platform: MobileInstallPlatform }) {
  if (platform === 'ios') {
    return (
      <ol className="list-decimal list-inside space-y-1.5 text-[11px] text-muted-foreground font-code leading-relaxed">
        <li>
          Tap <Share className="inline h-3.5 w-3.5 align-[-2px] text-primary" aria-hidden />{' '}
          <strong className="text-foreground">Share</strong> in Safari&apos;s bottom bar
        </li>
        <li>
          Scroll and choose <strong className="text-foreground">Add to Home Screen</strong>
        </li>
        <li>Tap <strong className="text-foreground">Add</strong> — open from your home screen for full-screen studio</li>
      </ol>
    );
  }

  return (
    <ol className="list-decimal list-inside space-y-1.5 text-[11px] text-muted-foreground font-code leading-relaxed">
      <li>
        Tap <strong className="text-foreground">Install app</strong> below if Chrome offers it
      </li>
      <li>
        Or open the <strong className="text-foreground">⋮ menu</strong> → Install app / Add to Home screen
      </li>
      <li>Launch from your home screen for the full-screen Bar 4 Bar experience</li>
    </ol>
  );
}

export function PwaInstallGuideCard() {
  const [platform, setPlatform] = useState<MobileInstallPlatform | null>(null);
  const [installed, setInstalled] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    setPlatform(getMobileInstallPlatform());
    setInstalled(isStandalonePwa());
    setIsMobile(isMobileInstallPlatform());
  }, []);

  if (installed) {
    return (
      <Card className="border-emerald-500/25 bg-emerald-500/5">
        <CardHeader className="pb-3">
          <CardTitle className="font-headline text-xl flex items-center gap-2 text-emerald-400">
            <Smartphone className="h-5 w-5" /> Installed on Home Screen
          </CardTitle>
          <CardDescription className="text-sm normal-case tracking-normal">
            You&apos;re running Bar 4 Bar as an installed app. Open it from your home screen icon anytime.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="border-primary/20">
      <CardHeader className="pb-3">
        <CardTitle className="font-headline text-xl flex items-center gap-2">
          <Smartphone className="h-5 w-5 text-primary" /> Add to Home Screen
        </CardTitle>
        <CardDescription className="text-sm normal-case tracking-normal">
          Install Bar 4 Bar on your phone for a full-screen studio — no App Store download required.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {platform ? (
          <InstallSteps platform={platform} />
        ) : (
          <p className="text-sm text-muted-foreground font-code leading-relaxed">
            Open <strong className="text-foreground">bar4bar.ink</strong> in Safari (iPhone) or Chrome (Android), then use the steps below from your profile menu → Add to Home Screen.
          </p>
        )}
        {isMobile && (
          <Button
            type="button"
            className="w-full h-11 font-bold uppercase text-[10px] tracking-widest gap-2"
            onClick={() => requestPwaInstallPrompt()}
          >
            <Download className="h-4 w-4" /> Show Install Guide
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

export function PwaInstallPrompt() {
  const { user } = useAuth();
  const [visible, setVisible] = useState(false);
  const [forced, setForced] = useState(false);
  const [platform, setPlatform] = useState<MobileInstallPlatform | null>(null);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);

  const hide = useCallback((dismiss: boolean) => {
    if (dismiss) dismissPwaInstallPrompt();
    setVisible(false);
    setForced(false);
  }, []);

  const evaluateAutoShow = useCallback(() => {
    if (!user) return;
    if (isStandalonePwa()) {
      markPwaInstalled();
      setVisible(false);
      return;
    }
    setPlatform(getMobileInstallPlatform());
    if (shouldAutoShowPwaInstallPrompt()) {
      setForced(false);
      setVisible(true);
    }
  }, [user]);

  useEffect(() => {
    evaluateAutoShow();
  }, [evaluateAutoShow]);

  useEffect(() => {
    if (isStandalonePwa()) {
      markPwaInstalled();
      setVisible(false);
    }
  }, []);

  useEffect(() => {
    const onShow = () => {
      if (!user || isStandalonePwa()) return;
      setPlatform(getMobileInstallPlatform());
      if (!isMobileInstallPlatform()) return;
      setForced(true);
      setVisible(true);
    };
    window.addEventListener(PWA_INSTALL_SHOW_EVENT, onShow);
    return () => window.removeEventListener(PWA_INSTALL_SHOW_EVENT, onShow);
  }, [user]);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleAndroidInstall = async () => {
    if (!deferredPrompt) return;
    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') markPwaInstalled();
      hide(outcome === 'accepted');
    } catch {
      /* ignore */
    } finally {
      setDeferredPrompt(null);
    }
  };

  if (!user || !visible || !platform) return null;

  return (
    <div
      className="fixed bottom-24 left-3 right-3 z-[480] md:left-auto md:right-4 md:max-w-sm animate-in slide-in-from-bottom-4 fade-in duration-300"
      role="dialog"
      aria-labelledby="pwa-install-title"
    >
      <div className="rounded-xl border border-primary/25 bg-[#0c121d]/95 backdrop-blur-xl shadow-2xl p-4 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <div className="p-1.5 rounded-lg bg-primary/15 border border-primary/25 shrink-0">
              <Smartphone className="h-4 w-4 text-primary" />
            </div>
            <div className="min-w-0">
              <p id="pwa-install-title" className="text-[10px] font-bold uppercase tracking-widest text-primary">
                Add to Home Screen
              </p>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                {forced ? 'Install guide' : 'Full-screen studio on your phone'}
              </p>
            </div>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7 shrink-0 text-muted-foreground hover:text-foreground"
            onClick={() => hide(true)}
            aria-label="Dismiss install guide"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <InstallSteps platform={platform} />

        <div className="flex flex-col gap-2 pt-1">
          {platform === 'android' && deferredPrompt && (
            <Button
              type="button"
              size="sm"
              className="w-full font-bold uppercase text-[10px] tracking-widest gap-2"
              onClick={handleAndroidInstall}
            >
              <Download className="h-3.5 w-3.5" /> Install App
            </Button>
          )}
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-full font-bold uppercase text-[10px] tracking-widest border-white/10"
            onClick={() => hide(true)}
          >
            Not now
          </Button>
        </div>
      </div>
    </div>
  );
}
