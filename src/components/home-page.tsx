'use client';

import React, { Suspense } from 'react';
import { AlbumList } from '@/components/album-list';
import { SceneHome } from '@/components/scene/scene-home';
import { GuestPressingLanding } from '@/components/marketing/guest-pressing-landing';
import { GuestPressingClaimBootstrap } from '@/components/profile/guest-pressing-claim-bootstrap';
import { useAuth } from '@/hooks/use-auth';
import { SCENE_HOME_ENABLED } from '@/lib/scene-home';

type HomePageProps = {
  /** Kept for callers; finish-the-bar / try sheet no longer steal guest `/`. */
  lockEnabled?: boolean;
};

export function HomePage(_props: HomePageProps = {}) {
  const { user } = useAuth();
  if (user) {
    return (
      <>
        {!SCENE_HOME_ENABLED ? <GuestPressingClaimBootstrap /> : null}
        {SCENE_HOME_ENABLED ? <SceneHome /> : <AlbumList />}
      </>
    );
  }
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-background text-muted-foreground text-sm">
          Loading…
        </div>
      }
    >
      <GuestPressingLanding />
    </Suspense>
  );
}
