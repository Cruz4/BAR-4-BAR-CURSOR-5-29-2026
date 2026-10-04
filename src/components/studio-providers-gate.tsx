'use client';

import React, { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { needsStudioProviders } from '@/lib/studio-shell';
import { StudioLoader } from '@/components/studio-loader';
import type { StudioProviders as StudioProvidersComponent } from '@/components/studio-providers';

type StudioProvidersType = typeof StudioProvidersComponent;

export function StudioProvidersGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user } = useAuth();
  const needsStudio = needsStudioProviders(pathname, user);
  const [StudioProviders, setStudioProviders] = useState<StudioProvidersType | null>(null);

  useEffect(() => {
    if (!needsStudio) {
      setStudioProviders(null);
      return;
    }
    let cancelled = false;
    void import('@/components/studio-providers').then((mod) => {
      if (!cancelled) setStudioProviders(() => mod.StudioProviders);
    });
    return () => {
      cancelled = true;
    };
  }, [needsStudio]);

  useEffect(() => {
    if (!user?.id) return;
    void import('@/components/studio-providers');
  }, [user?.id]);

  if (!needsStudio) {
    return <>{children}</>;
  }

  if (!StudioProviders) {
    return <StudioLoader size="lg" fullscreen />;
  }

  return <StudioProviders>{children}</StudioProviders>;
}
