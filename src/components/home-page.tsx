'use client';

import React, { Suspense } from 'react';
import { AlbumList } from '@/components/album-list';
import { SceneHome } from '@/components/scene/scene-home';
import { GuestPressingLanding } from '@/components/marketing/guest-pressing-landing';
import { GuestPressingClaimBootstrap } from '@/components/profile/guest-pressing-claim-bootstrap';
import { ArtistHomeProspectClaimBootstrap } from '@/components/profile/artist-home-prospect-claim-bootstrap';
import { useAuth } from '@/hooks/use-auth';
import { SCENE_HOME_ENABLED } from '@/lib/scene-home';

type HomePageProps = {
  /** Kept for callers; finish-the-bar / try sheet no longer steal guest `/`. */
  lockEnabled?: boolean;
};

export function HomePage(_props: HomePageProps = {}) {
  const { user, loading } = useAuth();
  if (user) {
    return (
      <>
        {!SCENE_HOME_ENABLED ? <GuestPressingClaimBootstrap /> : null}
        <ArtistHomeProspectClaimBootstrap />
        {SCENE_HOME_ENABLED ? (
          <Suspense fallback={<div className="min-h-screen bg-background" aria-busy="true" />}>
            <SceneHome />
          </Suspense>
        ) : (
          <AlbumList />
        )}
      </>
    );
  }
  if (loading) {
    return <div className="min-h-screen bg-background" aria-busy="true" />;
  }
  return (
    <Suspense
      fallback={<div className="min-h-screen bg-background" aria-busy="true" />}
    >
      <GuestPressingLanding />
    </Suspense>
  );
}
