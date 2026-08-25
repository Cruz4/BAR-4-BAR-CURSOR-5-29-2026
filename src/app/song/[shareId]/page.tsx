import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getDb } from '@/lib/firebase/server';
import { getPressedSongSummary } from '@/lib/server/pressed-song';
import { PressedSongPageClient } from '@/components/song/pressed-song-page-client';
import { getPublicAppUrl } from '@/lib/app-url';

export async function generateMetadata({ params }: { params: Promise<{ shareId: string }> }): Promise<Metadata> {
  const { shareId } = await params;
  const song = await getPressedSongSummary(await getDb(), shareId);
  if (!song) return { title: 'Pressed Song | Bar4Bar' };
  const description = `Listen to ${song.title} by ${song.artist.name} on Bar4Bar.`;
  const url = `${getPublicAppUrl()}/song/${encodeURIComponent(shareId)}`;
  return {
    title: `${song.title} by ${song.artist.name} | Bar4Bar`,
    description,
    alternates: { canonical: url },
    openGraph: { title: song.title, description, type: 'music.song', url },
  };
}

export default async function PressedSongPage({ params }: { params: Promise<{ shareId: string }> }) {
  const { shareId } = await params;
  const song = await getPressedSongSummary(await getDb(), shareId);
  if (!song) notFound();
  const structured = {
    '@context': 'https://schema.org',
    '@type': 'MusicRecording',
    name: song.title,
    datePublished: song.releasedAt,
    byArtist: {
      '@type': 'MusicGroup',
      name: song.artist.name,
      ...(song.artist.slug ? { url: `${getPublicAppUrl()}/${song.artist.slug}` } : {}),
    },
    url: `${getPublicAppUrl()}/song/${encodeURIComponent(shareId)}`,
  };
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structured).replace(/</g, '\\u003c') }} />
      <PressedSongPageClient initial={song} />
    </>
  );
}
