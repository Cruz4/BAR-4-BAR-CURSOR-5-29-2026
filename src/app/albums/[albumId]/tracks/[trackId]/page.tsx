
import { TrackEditorContent } from '@/components/track-editor';

export default async function TrackWorkspacePage({ params }: { params: Promise<{ albumId: string, trackId: string }> }) {
  const { albumId, trackId } = await params;
  return <TrackEditorContent trackId={trackId} albumId={albumId} />;
}
