'use client';

import React from 'react';
import { Toaster } from '@/components/ui/toaster';
import { Header } from '@/components/header';
import { AuthProvider } from '@/context/auth-context';
import { DataProvider } from '@/context/data-context';
import { ThemeProvider } from '@/context/theme-provider';
import { UIStateProvider } from '@/context/ui-state-context';
import { UsageProvider } from '@/context/usage-context';
import { GamificationProvider } from '@/context/gamification-context';
import { AchievementUnlockCelebration } from '@/components/gamification/achievement-unlock-celebration';
import { ProgressCelebration } from '@/components/gamification/progress-celebration';
import { FirebaseErrorListener } from '@/components/FirebaseErrorListener';
import { usePathname } from 'next/navigation';
import { StudioTips } from './studio-tips';
import { FloatingInkSpent } from './floating-ink-spent';
import { WhatsNewDialog } from './whats-new-dialog';
import { StudioPrivacyIntroDialog } from './studio-privacy-intro-dialog';
import { CookieConsent } from './cookie-consent';
import { OfflineBanner } from './offline-banner';
import { ServiceWorkerRegister } from './service-worker-register';
import { StudioPageBackground } from './studio-page-background';
import { SettingsControlAtmosphere } from './settings-control-atmosphere';
import { ProductAnalytics } from './product-analytics';
import { MarketingAttributionCapture } from './marketing-attribution-capture';
import { InviteGateGuard } from './invite-gate-guard';

export function ClientLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLoginPage = pathname === '/login';
  const isPerformPage = pathname.endsWith('/perform');
  const isSharePage = pathname.startsWith('/share/');
  const isSettingsRoute = pathname === '/usage' || pathname.startsWith('/usage/') || pathname === '/admin';

  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
      <AuthProvider>
        <InviteGateGuard>
        <DataProvider>
          <UsageProvider>
            <GamificationProvider>
            <UIStateProvider>
                <FirebaseErrorListener />
                <MarketingAttributionCapture />
                <ProductAnalytics />
                {isSettingsRoute ? <SettingsControlAtmosphere /> : <StudioPageBackground />}
                <div className="relative z-10 flex min-h-screen flex-col flex-1 overflow-hidden">
                  {!isLoginPage && !isPerformPage && !isSharePage && <Header />}
                  <main className="flex-1 overflow-hidden flex flex-col">{children}</main>
                  {!isSharePage && <WhatsNewDialog />}
                  {!isSharePage && !isLoginPage && <StudioPrivacyIntroDialog />}
                  <CookieConsent />
                  <OfflineBanner />
                  <ServiceWorkerRegister />
                </div>
                {/* Portaled overlays — must sit outside z-10 wrapper or they render behind Dialog greyout */}
                {!isSharePage && <StudioTips />}
                <FloatingInkSpent />
                <Toaster />
                <AchievementUnlockCelebration />
                <ProgressCelebration />
            </UIStateProvider>
            </GamificationProvider>
          </UsageProvider>
        </DataProvider>
        </InviteGateGuard>
      </AuthProvider>
    </ThemeProvider>
  );
}
