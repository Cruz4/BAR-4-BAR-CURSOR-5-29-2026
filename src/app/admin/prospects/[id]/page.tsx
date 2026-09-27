'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { StudioLoader } from '@/components/studio-loader';
import { PressDesk } from '@/components/profile/press-desk';
import { AdminProspectDeskToolbar } from '@/components/admin-prospect-desk-toolbar';

export default function AdminProspectEditPage() {
  const { id } = useParams<{ id: string }>();
  const { user, loading, authReady } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!authReady || loading) return;
    if (!user || user.role !== 'admin') router.replace('/');
  }, [authReady, loading, user, router]);

  if (loading || !authReady || !user || user.role !== 'admin' || !id) {
    return <StudioLoader size="lg" fullscreen />;
  }

  return (
    <div className="min-h-screen">
      <AdminProspectDeskToolbar prospectId={id} />
      <PressDesk prospectId={id} />
    </div>
  );
}
