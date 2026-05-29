
'use client';

import React from 'react';
import { AlbumList } from '@/components/album-list';
import { useAuth } from '@/hooks/use-auth';
import { StudioLoader } from '@/components/studio-loader';

export default function Home() {
  const { user, loading } = useAuth();

  // The AuthProvider shows a global loader and handles redirects.
  // We only need to check if there is a user to show the content.
  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <StudioLoader size="lg" />
      </div>
    );
  }

  // If there's a user, show the album list. If not, AuthProvider will redirect away from this page.
  return user ? <AlbumList /> : null;
}
