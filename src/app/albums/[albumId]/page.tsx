
import { AlbumDetailContent } from '@/components/album-detail-content';

export default async function AlbumDetailPage({ params }: { params: Promise<{ albumId: string }> }) {
  const { albumId } = await params;
  return <AlbumDetailContent albumId={albumId} />;
}
