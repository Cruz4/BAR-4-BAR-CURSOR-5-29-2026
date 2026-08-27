import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { getDb } from '@/lib/firebase/server';
import { getPressedSongSummary } from '@/lib/server/pressed-song';
import { PressedSongPageClient } from '@/components/song/pressed-song-page-client';
import { getPublicAppUrl } from '@/lib/app-url';
import { loadShare } from '@/lib/server/drop-entitlements';

type SongPageProps = {
  params: Promise<{ shareId: string }>;
  searchParams: Promise<{ trackId?: string }>;
};

export async function generateMetadata({ params, searchParams }: SongPageProps): Promise<Metadata> {
  const { shareId } = await params;
  const { trackId } = await searchParams;
  const song = await getPressedSongSummary(await getDb(), shareId, undefined, trackId);
  if (!song) return { title: 'Music Release | Bar4Bar' };
  const categories = [...song.metadata.genreStyles, ...song.metadata.moods];
  const description = `Listen to ${song.title} by ${song.artist.name} on Bar4Bar${categories.length ? ` · ${categories.join(' · ')}` : ''}.`;
  const url = `${getPublicAppUrl()}/song/${encodeURIComponent(shareId)}${trackId ? `?trackId=${encodeURIComponent(trackId)}` : ''}`;
  return {
    title: `${song.title} by ${song.artist.name} | Bar4Bar`,
    description,
    ...(categories.length ? { keywords: categories } : {}),
    alternates: { canonical: url },
    openGraph: { title: song.title, description, type: 'music.song', url },
  };
}

export default async function PressedSongPage({ params, searchParams }: SongPageProps) {
  const { shareId } = await params;
  const { trackId } = await searchParams;
  const db = await getDb();
  const share = await loadShare(db, shareId);
  if (share?.type === 'album' && !trackId) redirect(`/share/${encodeURIComponent(shareId)}`);
  const song = await getPressedSongSummary(db, shareId, undefined, trackId);
  if (!song) notFound();
  const songUrl = `${getPublicAppUrl()}/song/${encodeURIComponent(shareId)}${trackId ? `?trackId=${encodeURIComponent(trackId)}` : ''}`;
  const structured = {
    '@context': 'https://schema.org',
    '@type': 'MusicRecording',
    name: song.title,
    datePublished: song.releasedAt,
    ...(song.metadata.genreStyles.length ? { genre: song.metadata.genreStyles } : {}),
    byArtist: {
      '@type': 'MusicGroup',
      name: song.artist.name,
      ...(song.artist.slug ? { url: `${getPublicAppUrl()}/${song.artist.slug}` } : {}),
    },
    url: songUrl,
  };
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structured).replace(/</g, '\\u003c') }} />
      <PressedSongPageClient initial={song} />
    </>
  );
}
