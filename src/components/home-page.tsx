'use client';

import React from 'react';
import { AlbumList } from '@/components/album-list';
import { PublicHomeLanding } from '@/components/marketing/public-home-landing';
import { useAuth } from '@/hooks/use-auth';

export function HomePage() {
  const { user } = useAuth();
  return user ? <AlbumList /> : <PublicHomeLanding />;
}
