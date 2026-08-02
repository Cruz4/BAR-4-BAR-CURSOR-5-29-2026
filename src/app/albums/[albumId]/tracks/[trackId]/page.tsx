'use client';

import dynamic from 'next/dynamic';
import { useParams } from 'next/navigation';
import { StudioLoader } from '@/components/studio-loader';

const TrackEditorContent = dynamic(
  () => import('@/components/track-editor').then((m) => m.TrackEditorContent),
  {
    ssr: false,
    loading: () => <StudioLoader size="lg" fullscreen />,
  }
);

export default function TrackWorkspacePage() {
  const params = useParams();
  const albumId = params.albumId as string;
  const trackId = params.trackId as string;
  return <TrackEditorContent trackId={trackId} albumId={albumId} />;
}
