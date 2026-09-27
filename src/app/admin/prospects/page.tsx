'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { StudioLoader } from '@/components/studio-loader';
import { AdminArtistHomeProspectsCard } from '@/components/admin-artist-home-prospects-card';
import { Button } from '@/components/ui/button';

export default function AdminProspectsPage() {
  const { user, loading, authReady } = useAuth();
  const router = useRouter();

  if (loading || !authReady) return <StudioLoader size="lg" fullscreen />;
  if (!user || user.role !== 'admin') {
    router.replace('/');
    return null;
  }

  return (
    <div className="container mx-auto max-w-[88rem] py-10 px-4 space-y-6">
      <Button variant="ghost" size="sm" className="gap-2" asChild>
        <Link href="/admin">
          <ChevronLeft className="h-4 w-4" /> Master Control
        </Link>
      </Button>
      <AdminArtistHomeProspectsCard />
    </div>
  );
}
