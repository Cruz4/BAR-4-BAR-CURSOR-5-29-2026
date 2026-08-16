'use client';

import React from 'react';
import { cn } from '@/lib/utils';
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
import { WelcomeInkDialog } from './welcome-ink-dialog';
import { StudioPrivacyIntroDialog } from './studio-privacy-intro-dialog';
import { ActivityPushIntroDialog } from './activity/activity-push-intro-dialog';
import { CookieConsent } from './cookie-consent';
import { PwaInstallPrompt } from './pwa-install-prompt';
import { OfflineBanner } from './offline-banner';
import { ServiceWorkerRegister } from './service-worker-register';
import { StudioPageBackground } from './studio-page-background';
import { SettingsControlAtmosphere } from './settings-control-atmosphere';
import { ProductAnalytics } from './product-analytics';
import { TikTokPixel } from './tiktok-pixel';
import { MarketingAttributionCapture } from './marketing-attribution-capture';
import { AdminAlertListener } from './admin-alert-listener';
import { InviteGateGuard } from './invite-gate-guard';
import { ProFeaturePreviewBanner } from './pro-feature-preview-banner';
import { ProTrialWinQuestStrip } from './pro-trial-win-quest-strip';
import { ProPreviewEndedDialog } from './pro-preview-ended-dialog';
import { EmailVerificationBanner } from './email-verification-banner';
import { AdSenseRouteLoader } from './adsense-route-loader';
import { useAuth } from '@/hooks/use-auth';

const CHUNK_RELOAD_KEY = 'b4b_chunk_reload_at';

/** Recover once when webpack chunks time out after a dev rebuild or deploy. */
function useChunkLoadRecovery() {
  React.useEffect(() => {
    const reloadOnce = () => {
      const last = sessionStorage.getItem(CHUNK_RELOAD_KEY);
      const now = Date.now();
      if (last && now - Number(last) < 10_000) return;
      sessionStorage.setItem(CHUNK_RELOAD_KEY, String(now));
      window.location.reload();
    };

    const onRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason;
      if (reason instanceof Event) {
        const benignInstall =
          reason.type === 'beforeinstallprompt' || reason.type === 'appinstalled';
        if (benignInstall) {
          event.preventDefault();
          return;
        }
      }

      const message = String(
        (reason as { message?: string } | undefined)?.message ?? reason ?? ''
      );
      if (message.includes('ChunkLoadError') || message.includes('Loading chunk')) {
        event.preventDefault();
        reloadOnce();
      }
    };

    window.addEventListener('unhandledrejection', onRejection);
    return () => window.removeEventListener('unhandledrejection', onRejection);
  }, []);
}

function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user } = useAuth();
  const isLoginPage = pathname === '/login';
  const isWelcomePage = pathname === '/welcome';
  const isPublicHome = pathname === '/' && !user;
  const isMarketingShell = isLoginPage || isPublicHome || isWelcomePage;
  const isPerformPage = pathname.endsWith('/perform');
  const isSharePage = pathname.startsWith('/share/');
  const isLibraryPage = pathname === '/library';
  const isEarningsPage = pathname === '/earnings';
  // /profile/customize is Edit Public Page — an app page, not the public profile
  const isPublicProfilePage = pathname.startsWith('/profile/') && pathname !== '/profile/customize';
  const isMarketingCapture = pathname.startsWith('/marketing/capture');
  const isSettingsRoute = pathname === '/usage' || pathname.startsWith('/usage/') || pathname === '/admin';
  const showAppHeader =
    !isMarketingShell && !isPerformPage && !isSharePage && !isPublicProfilePage && !isMarketingCapture;
  // Public home / login / profile / share need document scroll — overflow-hidden
  // traps the Pressing landing and makes the brand mark feel dead.
  const allowPageScroll =
    isMarketingShell || isPublicProfilePage || isSharePage || isMarketingCapture || isLibraryPage || isEarningsPage;

  return (
    <InviteGateGuard>
      <DataProvider>
        <UsageProvider>
          <GamificationProvider>
            <UIStateProvider>
              <AdSenseRouteLoader />
              <FirebaseErrorListener />
              <MarketingAttributionCapture />
              <AdminAlertListener />
              <ProductAnalytics />
              <TikTokPixel />
              {isMarketingCapture || isMarketingShell || isPublicProfilePage ? null : isSettingsRoute ? (
                <SettingsControlAtmosphere />
              ) : (
                <StudioPageBackground />
              )}
              <div
                className={cn(
                  'relative z-10 flex min-h-screen flex-col flex-1',
                  allowPageScroll ? 'overflow-x-hidden overflow-y-auto' : 'overflow-hidden'
                )}
              >
                {showAppHeader && <Header />}
                {showAppHeader && <EmailVerificationBanner />}
                {showAppHeader && <ProFeaturePreviewBanner />}
                {showAppHeader && <ProTrialWinQuestStrip />}
                <main
                  className={cn(
                    'flex-1 flex flex-col',
                    allowPageScroll ? 'overflow-x-hidden overflow-y-auto' : 'overflow-hidden'
                  )}
                >
                  {children}
                </main>
                {!isSharePage && !isPublicProfilePage && !isMarketingCapture && <WhatsNewDialog />}
                {!isSharePage && !isPublicProfilePage && !isMarketingShell && !isMarketingCapture && <WelcomeInkDialog />}
                {!isSharePage && !isPublicProfilePage && !isMarketingShell && !isMarketingCapture && <ProPreviewEndedDialog />}
                {!isSharePage && !isPublicProfilePage && !isMarketingShell && !isMarketingCapture && <StudioPrivacyIntroDialog />}
                {!isSharePage && !isPublicProfilePage && !isMarketingShell && !isMarketingCapture && <ActivityPushIntroDialog />}
                {!isMarketingCapture && <CookieConsent />}
                {!isSharePage && !isPublicProfilePage && !isMarketingShell && !isMarketingCapture && <PwaInstallPrompt />}
                <OfflineBanner />
                <ServiceWorkerRegister />
              </div>
              {!isSharePage && !isPublicProfilePage && !isMarketingCapture && <StudioTips />}
              {!isSharePage && !isPublicProfilePage && <FloatingInkSpent />}
              <Toaster />
              <AchievementUnlockCelebration />
              <ProgressCelebration />
            </UIStateProvider>
          </GamificationProvider>
        </UsageProvider>
      </DataProvider>
    </InviteGateGuard>
  );
}

export function ClientLayout({ children }: { children: React.ReactNode }) {
  useChunkLoadRecovery();

  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="dark"
      enableSystem
      storageKey="b4b-theme"
      disableTransitionOnChange
    >
      <AuthProvider>
        <AppShell>{children}</AppShell>
      </AuthProvider>
    </ThemeProvider>
  );
}
