import type { Metadata } from 'next';
import { ArtistHomeProspectPreviewClient } from '@/components/profile/artist-home-prospect-preview-client';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type PageProps = { params: Promise<{ viewToken: string }> };

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: 'Your Artist Home preview',
    robots: { index: false, follow: false },
  };
}

export default async function ArtistHomeProspectInvitePage({ params }: PageProps) {
  const { viewToken } = await params;
  return <ArtistHomeProspectPreviewClient viewToken={viewToken} />;
}
