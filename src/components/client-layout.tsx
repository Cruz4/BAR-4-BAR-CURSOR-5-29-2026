'use client';

import React from 'react';
import { Toaster } from '@/components/ui/toaster';
import { Header } from '@/components/header';
import { AuthProvider } from '@/context/auth-context';
import { DataProvider } from '@/context/data-context';
import { ThemeProvider } from '@/context/theme-provider';
import { UIStateProvider } from '@/context/ui-state-context';
import { UsageProvider } from '@/context/usage-context';
import { FirebaseErrorListener } from '@/components/FirebaseErrorListener';
import { usePathname } from 'next/navigation';
import { StudioTips } from './studio-tips';
import { FloatingInkSpent } from './floating-ink-spent';
import { WhatsNewDialog } from './whats-new-dialog';
import { CookieConsent } from './cookie-consent';
import { OfflineBanner } from './offline-banner';
import { ServiceWorkerRegister } from './service-worker-register';

export function ClientLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLoginPage = pathname === '/login';
  const isPerformPage = pathname.endsWith('/perform');

  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
      <AuthProvider>
        <DataProvider>
          <UsageProvider>
            <UIStateProvider>
                <FirebaseErrorListener />
                <div className="relative flex min-h-screen flex-col flex-1 overflow-hidden bg-background">
                  {!isLoginPage && !isPerformPage && <Header />}
                  <main className="flex-1 overflow-hidden flex flex-col">{children}</main>
                  <StudioTips />
                  <FloatingInkSpent />
                  {!isLoginPage && <WhatsNewDialog />}
                  <CookieConsent />
                  <OfflineBanner />
                  <ServiceWorkerRegister />
                </div>
                <Toaster />
            </UIStateProvider>
          </UsageProvider>
        </DataProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
