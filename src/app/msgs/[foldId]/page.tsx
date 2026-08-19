'use client';

import React, { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { StudioLoader } from '@/components/studio-loader';
import { FoldSheet } from '@/components/folds/fold-sheet';
import { useAuth } from '@/hooks/use-auth';

export default function MsgThreadPage() {
  const { user, authReady } = useAuth();
  const router = useRouter();
  const params = useParams();
  const foldId = typeof params?.foldId === 'string' ? params.foldId : '';

  useEffect(() => {
    if (!authReady) return;
    if (!user?.id) router.replace(`/login?next=/msgs/${encodeURIComponent(foldId)}`);
  }, [authReady, user?.id, router, foldId]);

  if (!authReady || !user || !foldId) {
    return <StudioLoader size="lg" fullscreen message="Opening…" />;
  }

  return <FoldSheet foldId={foldId} />;
}
