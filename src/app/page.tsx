
'use client';

import React from 'react';
import { AlbumList } from '@/components/album-list';
import { useAuth } from '@/hooks/use-auth';

export default function Home() {
  const { user } = useAuth();

  // AuthProvider handles the global loader and redirects.
  return user ? <AlbumList /> : null;
}
