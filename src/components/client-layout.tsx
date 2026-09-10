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
import { isPublicArtistHomePath } from '@/lib/profile/profile-slug';
import { isTrackLyricSheetPath } from '@/lib/studio-theme';
import { StudioTips } from './studio-tips';
import { FloatingInkSpent } from './floating-ink-spent';
import { WhatsNewDialog } from './whats-new-dialog';
import { WelcomeInkDialog } from './welcome-ink-dialog';
import { StudioPrivacyIntroDialog } from './studio-privacy-intro-dialog';
import { ActivityPushIntroDialog } from './activity/activity-push-intro-dialog';
import { ActivityPushDeviceSync } from './activity/activity-push-device-sync';
import { ActivityBadgeSync } from './activity/activity-badge-sync';
import { FoldInboxProvider } from '@/components/folds/fold-inbox-provider';
import { ActivityAlertsProvider } from '@/context/activity-alerts-context';
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
import { DropSaleAlertListener } from './drop-sale-alert-listener';
import { InviteGateGuard } from './invite-gate-guard';
import { DropPlayerProvider, useOptionalDropPlayer } from '@/context/drop-player-context';
import { DropCartProvider } from '@/context/drop-cart-context';
import { DropNowPlayingBar, shouldHideDropNowPlayingBar } from '@/components/library/drop-now-playing-bar';
import { FirstDropLatheHost } from '@/components/first-drop-lathe';
import { ManualPathCoach } from '@/components/manual-path-coach';
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
  const dropPlayer = useOptionalDropPlayer();
  const showDropNowPlaying =
    Boolean(user && dropPlayer?.current) && !shouldHideDropNowPlayingBar(pathname);
  const isLoginPage = pathname === '/login';
  const isWelcomePage = pathname === '/welcome';
  const isPublicHome = pathname === '/' && !user;
  const isMarketingShell = isLoginPage || isPublicHome || isWelcomePage;
  const isPerformPage = pathname.endsWith('/perform');
  const isSharePage = pathname.startsWith('/share/') || pathname.startsWith('/song/');
  const isPublicPostPage = pathname.startsWith('/p/');
  const isLibraryPage = pathname === '/library';
  const isEarningsPage = pathname === '/earnings';
  const isInsightsPage = pathname === '/insights';
  const isSupportersPage = pathname === '/supporters';
  const isMsgsPage = pathname === '/msgs' || pathname.startsWith('/msgs/');
  const isFriendsPage = pathname === '/friends';
  const isActivityPage = pathname === '/activity' || pathname.startsWith('/activity');
  const isAlbumPage = pathname.startsWith('/albums/');
  const isProfileCustomizePage = pathname === '/profile/customize';
  const isPublicProfilePage = isPublicArtistHomePath(pathname);
  const isMarketingCapture = pathname.startsWith('/marketing/capture');
  const isSettingsRoute = pathname === '/usage' || pathname.startsWith('/usage/') || pathname === '/admin';
  // Authenticated Scene / Vault need document scroll so sticky rails can bind
  // (same pattern as Edit Public Page). overflow-hidden on shell breaks sticky.
  const isStickyRailPage =
    Boolean(user) && (pathname === '/' || pathname === '/vault');
  const stickyDocumentScroll = isProfileCustomizePage || isStickyRailPage;
  const showAppHeader =
    !isMarketingShell &&
    !isPerformPage &&
    !isSharePage &&
    !isMarketingCapture &&
    (!isPublicProfilePage || Boolean(user));
  const showBottomNowPlaying = showDropNowPlaying && !showAppHeader;
  // Public home / login / profile / share need document scroll — overflow-hidden
  // traps the Pressing landing and makes the brand mark feel dead.
  const allowPageScroll =
    isMarketingShell || isPublicProfilePage || isProfileCustomizePage || isSharePage || isPublicPostPage || isMarketingCapture || isLibraryPage || isEarningsPage || isInsightsPage || isSupportersPage || isMsgsPage || isFriendsPage || isActivityPage || isAlbumPage;

  return (
    <InviteGateGuard>
      <DataProvider>
        <UsageProvider>
          <GamificationProvider>
            <UIStateProvider>
              <ActivityAlertsProvider>
              <FoldInboxProvider>
              <AdSenseRouteLoader />
              <FirebaseErrorListener />
              <MarketingAttributionCapture />
              <AdminAlertListener />
              <DropSaleAlertListener />
              <ProductAnalytics />
              <TikTokPixel />
              {isMarketingCapture || isMarketingShell || isPublicProfilePage || isPublicPostPage ? null : isSettingsRoute ? (
                <SettingsControlAtmosphere />
              ) : (
                <StudioPageBackground />
              )}
              <div
                className={cn(
                  'relative z-10 flex min-h-screen flex-col flex-1',
                  stickyDocumentScroll
                    ? 'overflow-x-clip overflow-y-visible'
                    : allowPageScroll
                      ? 'overflow-x-hidden overflow-y-auto'
                      : 'overflow-hidden',
                  showBottomNowPlaying && 'pb-[4.75rem]'
                )}
              >
                {showAppHeader && <Header />}
                {showAppHeader && <EmailVerificationBanner />}
                {showAppHeader && <ProFeaturePreviewBanner />}
                {showAppHeader && <ProTrialWinQuestStrip />}
                <main
                  className={cn(
                    'flex-1 flex flex-col',
                    stickyDocumentScroll
                      ? 'overflow-x-clip overflow-y-visible'
                      : allowPageScroll
                        ? 'overflow-x-hidden overflow-y-auto'
                        : 'overflow-hidden'
                  )}
                >
                  {children}
                </main>
                {!isSharePage && !isPublicProfilePage && !isMarketingCapture && <WhatsNewDialog />}
                {!isSharePage && !isPublicProfilePage && !isMarketingShell && !isMarketingCapture && <WelcomeInkDialog />}
                {!isSharePage && !isPublicProfilePage && !isMarketingShell && !isMarketingCapture && <ProPreviewEndedDialog />}
                {!isSharePage && !isPublicProfilePage && !isMarketingShell && !isMarketingCapture && <StudioPrivacyIntroDialog />}
                {!isSharePage && !isPublicProfilePage && !isMarketingShell && !isMarketingCapture && <ActivityPushIntroDialog />}
                {!isSharePage && !isPublicProfilePage && !isMarketingShell && !isMarketingCapture && <ActivityPushDeviceSync />}
                {!isSharePage && !isPublicProfilePage && !isMarketingShell && !isMarketingCapture && <ActivityBadgeSync />}
                {!isMarketingCapture && <CookieConsent />}
                {!isSharePage && !isPublicProfilePage && !isMarketingShell && !isMarketingCapture && <PwaInstallPrompt />}
                <OfflineBanner />
                <ServiceWorkerRegister />
              </div>
              {!isSharePage && !isPublicProfilePage && !isMarketingCapture && <StudioTips />}
              {!isSharePage && !isPublicProfilePage && <FloatingInkSpent />}
              {showBottomNowPlaying ? <DropNowPlayingBar /> : null}
              <FirstDropLatheHost />
              {!isSharePage && !isPublicProfilePage && !isMarketingShell && !isMarketingCapture && <ManualPathCoach />}
              <Toaster />
              <AchievementUnlockCelebration />
              <ProgressCelebration />
              </FoldInboxProvider>
              </ActivityAlertsProvider>
            </UIStateProvider>
          </GamificationProvider>
        </UsageProvider>
      </DataProvider>
    </InviteGateGuard>
  );
}

export function ClientLayout({ children }: { children: React.ReactNode }) {
  useChunkLoadRecovery();
  const pathname = usePathname();
  const onLyricSheet = isTrackLyricSheetPath(pathname);

  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="dark"
      enableSystem
      storageKey="b4b-theme"
      disableTransitionOnChange
      forcedTheme={onLyricSheet ? undefined : 'dark'}
    >
      <AuthProvider>
        <DropPlayerProvider>
          <DropCartProvider>
            <AppShell>{children}</AppShell>
          </DropCartProvider>
        </DropPlayerProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
