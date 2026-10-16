'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { Toaster } from '@/components/ui/toaster';
import { Header } from '@/components/header';
import { AuthProvider } from '@/context/auth-context';
import { ThemeProvider } from '@/context/theme-provider';
import { GamificationProvider } from '@/context/gamification-context';
import { UIStateProvider } from '@/context/ui-state-context';
import { StudioProvidersGate } from '@/components/studio-providers-gate';
import { AchievementUnlockCelebration } from '@/components/gamification/achievement-unlock-celebration';
import { ProgressCelebration } from '@/components/gamification/progress-celebration';
import { FirebaseErrorListener } from '@/components/FirebaseErrorListener';
import { usePathname } from 'next/navigation';
import { isPublicArtistHomePath } from '@/lib/profile/profile-slug';
import { useIsMobile } from '@/hooks/use-mobile';
import { isTrackLyricSheetPath } from '@/lib/studio-theme';
import { StudioTips } from './studio-tips';
import { FloatingInkSpent } from './floating-ink-spent';
import { WhatsNewDialog } from './whats-new-dialog';
import { WelcomeInkDialog } from './welcome-ink-dialog';
import { StudioPrivacyIntroDialog } from './studio-privacy-intro-dialog';
import { ActivityPushIntroDialog } from './activity/activity-push-intro-dialog';
import { ActivityPushDeviceSync } from './activity/activity-push-device-sync';
import { ActivityBadgeSync } from './activity/activity-badge-sync';
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
import { Studio4000Link } from '@/components/studio-4000-link';
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
  const isMobile = useIsMobile();
  const dropPlayer = useOptionalDropPlayer();
  const showDropNowPlaying =
    Boolean(user && dropPlayer?.current) && !shouldHideDropNowPlayingBar(pathname);
  const isLoginPage = pathname === '/login';
  const isWelcomePage = pathname === '/welcome';
  const isPublicHome = pathname === '/' && !user;
  const isGuestPressingLanding = isPublicHome;
  const isMarketingShell = isLoginPage || isPublicHome || isWelcomePage;
  const isPerformPage = pathname.endsWith('/perform');
  const isSharePage = pathname.startsWith('/share/') || pathname.startsWith('/song/');
  const isPublicPostPage = pathname.startsWith('/p/');
  const isLibraryPage = pathname === '/library';
  const isEarningsPage = pathname === '/earnings';
  const isInsightsPage = pathname === '/insights';
  const isSupportersPage = pathname === '/supporters';
  const isMsgsPage = pathname === '/msgs' || pathname.startsWith('/msgs/');
  const isMsgsThreadPage = pathname.startsWith('/msgs/') && pathname !== '/msgs';
  const isFriendsPage = pathname === '/friends';
  const isActivityPage = pathname === '/activity' || pathname.startsWith('/activity');
  const isAlbumPage = pathname.startsWith('/albums/');
  const isProfileCustomizePage = pathname === '/profile/customize';
  const isPublicProfilePage = isPublicArtistHomePath(pathname);
  const isMarketingCapture = pathname.startsWith('/marketing/capture');
  const isSettingsRoute = pathname === '/usage' || pathname.startsWith('/usage/') || pathname === '/admin';
  // Scene, Vault, and Artist Home section rail need document scroll so sticky
  // binds to the viewport (nested overflow-y-auto on shell/main trails by a frame).
  const isStickyRailPage =
    Boolean(user) && (pathname === '/' || pathname === '/vault');
  const stickyDocumentScroll =
    isProfileCustomizePage ||
    isStickyRailPage ||
    isPublicProfilePage ||
    (isGuestPressingLanding && !isMobile);
  const showAppHeader =
    !isMarketingShell &&
    !isPerformPage &&
    !isSharePage &&
    !isMarketingCapture &&
    (!isPublicProfilePage || Boolean(user));
  const showBottomNowPlaying = showDropNowPlaying && !showAppHeader;
  // Guest pressing landing: phone scrolls inside its preview pane; desktop uses document scroll for sticky rail.
  const allowPageScroll =
    isLoginPage ||
    isWelcomePage ||
    isPublicProfilePage ||
    isProfileCustomizePage ||
    isSharePage ||
    isPublicPostPage ||
    isMarketingCapture ||
    isLibraryPage ||
    isEarningsPage ||
    isInsightsPage ||
    isSupportersPage ||
    (isMsgsPage && !isMsgsThreadPage) ||
    isFriendsPage ||
    isActivityPage ||
    isAlbumPage;

  return (
    <InviteGateGuard>
      <GamificationProvider>
        <UIStateProvider>
        <StudioProvidersGate>
              <AdSenseRouteLoader />
              <FirebaseErrorListener />
              <MarketingAttributionCapture />
              <AdminAlertListener />
              <DropSaleAlertListener />
              <ProductAnalytics />
              <TikTokPixel />
              {isMarketingCapture || isMarketingShell || isPublicProfilePage || isPublicPostPage ? null : isSettingsRoute ? (
                <SettingsControlAtmosphere />
              ) : isMsgsPage ? null : (
                <StudioPageBackground />
              )}
              <div
                className={cn(
                  'relative z-10 flex min-h-screen flex-col flex-1',
                  stickyDocumentScroll
                    ? 'overflow-x-clip overflow-y-visible'
                    : allowPageScroll
                      ? 'overflow-x-hidden overflow-y-auto'
                      : isGuestPressingLanding
                        ? 'overflow-hidden max-sm:h-[100dvh] max-sm:max-h-[100dvh]'
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
                        : isGuestPressingLanding
                          ? 'min-h-0 flex-1 overflow-hidden max-sm:h-full'
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
              <Studio4000Link />
              <FirstDropLatheHost />
              {!isSharePage && !isPublicProfilePage && !isMarketingShell && !isMarketingCapture && <ManualPathCoach />}
              <Toaster />
              <AchievementUnlockCelebration />
              <ProgressCelebration />
        </StudioProvidersGate>
        </UIStateProvider>
      </GamificationProvider>
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
