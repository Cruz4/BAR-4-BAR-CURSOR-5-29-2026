'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AlbumList } from '@/components/album-list';
import { SCENE_HOME_ENABLED } from '@/lib/scene-home';

export default function VaultPage() {
  const router = useRouter();

  useEffect(() => {
    if (!SCENE_HOME_ENABLED) router.replace('/');
  }, [router]);

  if (!SCENE_HOME_ENABLED) return null;

  return <AlbumList />;
}
