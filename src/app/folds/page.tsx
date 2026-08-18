'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { StudioLoader } from '@/components/studio-loader';
import { FoldStack } from '@/components/folds/fold-stack';
import { useAuth } from '@/hooks/use-auth';

export default function FoldsPage() {
  const { user, authReady } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!authReady) return;
    if (!user?.id) router.replace('/login?next=/folds');
  }, [authReady, user?.id, router]);

  if (!authReady || !user) {
    return <StudioLoader size="lg" fullscreen message="Opening messages…" />;
  }

  return <FoldStack />;
}
