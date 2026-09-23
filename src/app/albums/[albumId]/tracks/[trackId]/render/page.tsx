'use client';

import { useContext, useEffect, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { DataContext } from '@/context/data-context';
import { StudioLoader } from '@/components/studio-loader';
import { RenderStudioClient } from '@/components/render-studio/render-studio-client';
import { useSongGenerationWorkbenchLive } from '@/hooks/use-song-generation-live';
import { useProductSurfaces } from '@/hooks/use-product-surfaces';

export default function RenderStudioPage() {
  const params = useParams();
  const router = useRouter();
  const albumId = params.albumId as string;
  const trackId = params.trackId as string;
  const { albums, loading } = useContext(DataContext);
  const songGenerationWorkbench = useSongGenerationWorkbenchLive();
  const { loading: surfacesLoading } = useProductSurfaces();

  const track = useMemo(() => {
    const album = albums.find((a) => a.id === albumId);
    return album?.tracks.find((t) => t.id === trackId) ?? null;
  }, [albums, albumId, trackId]);

  useEffect(() => {
    if (surfacesLoading || songGenerationWorkbench) return;
    router.replace(`/albums/${albumId}/tracks/${trackId}`);
  }, [surfacesLoading, songGenerationWorkbench, router, albumId, trackId]);

  if (surfacesLoading || loading || !track) {
    return <StudioLoader size="lg" fullscreen />;
  }

  if (!songGenerationWorkbench) {
    return <StudioLoader size="lg" fullscreen message="Returning to sheet…" />;
  }

  return <RenderStudioClient albumId={albumId} trackId={trackId} track={track} />;
}
