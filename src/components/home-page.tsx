'use client';

import React, { Suspense } from 'react';
import { AlbumList } from '@/components/album-list';
import { PublicHomeLanding } from '@/components/marketing/public-home-landing';
import { useAuth } from '@/hooks/use-auth';
import { StudioLoader } from '@/components/studio-loader';

export function HomePage() {
  const { user } = useAuth();
  return user ? (
    <AlbumList />
  ) : (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <StudioLoader size="lg" />
        </div>
      }
    >
      <PublicHomeLanding />
    </Suspense>
  );
}
