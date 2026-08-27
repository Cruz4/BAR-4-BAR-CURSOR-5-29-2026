'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ChevronLeft, ChevronRight, EyeOff, Gift, Music2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { StudioLoader } from '@/components/studio-loader';
import { ProfileSectionTabs } from '@/components/profile/profile-section-tabs';
import type { LiveDnaDropItem } from '@/components/profile/live-dna-drop-card';
import { DropListenPanel } from '@/components/drop-listen-panel';
import { profileHref } from '@/lib/profile/profile-slug';
import { PublicProfileSectionShell } from '@/components/profile/public-profile-section-shell';
import { formatDropPulseLine } from '@/lib/drop-pulse';
import type { DropPrice } from '@/lib/drop-commerce';
import { pressedSongHref } from '@/lib/pressed-song';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { manageRelease } from '@/lib/release-management-client';
import type { PublicMusicMetadata } from '@/lib/music-discovery-metadata';
import { MusicDiscoveryTags } from '@/components/music-discovery-tags';

type PressedProfileSong = LiveDnaDropItem & {
  ownerId: string;
  albumId: string;
  trackId: string;
  price: DropPrice;
  metadata: PublicMusicMetadata;
};

export default function ProfileSongsPage() {
  const params = useParams();
  const { user } = useAuth();
  const { toast } = useToast();
  const slug = typeof params?.slug === 'string' ? params.slug : '';
  const [displayName, setDisplayName] = useState('Artist');
  const [rawProfile, setRawProfile] = useState<unknown>({});
  const [songs, setSongs] = useState<PressedProfileSong[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [missing, setMissing] = useState(false);
  const [unpressingId, setUnpressingId] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) return;
    let cancelled = false;
    void Promise.all([
      fetch(`/api/profile/${encodeURIComponent(slug)}`),
      fetch(`/api/profile/${encodeURIComponent(slug)}/songs`),
    ])
      .then(async ([profileResponse, songsResponse]) => {
        if (!profileResponse.ok || !songsResponse.ok) throw new Error('Profile unavailable');
        const data = (await profileResponse.json()) as { displayName?: string };
        const songsData = (await songsResponse.json()) as { songs?: PressedProfileSong[]; nextCursor?: string | null };
        if (cancelled) return;
        setDisplayName(data.displayName?.trim() || slug);
        setRawProfile(data);
        setSongs(songsData.songs || []);
        setCursor(songsData.nextCursor || null);
      })
      .catch(() => { if (!cancelled) setMissing(true); })
      .finally(() => { if (!cancelled) setLoaded(true); });
    return () => { cancelled = true; };
  }, [slug]);

  if (!loaded) return <StudioLoader size="lg" fullscreen />;
  if (missing) return <div className="mx-auto max-w-lg px-4 py-20 text-center">Artist page not found.</div>;
  return (
    <PublicProfileSectionShell rawProfile={rawProfile} slug={slug}>
    <main className="container mx-auto max-w-4xl space-y-6 px-4 py-8">
      <Button size="sm" variant="outline" asChild className="h-8 gap-1.5 font-bold uppercase">
        <Link href={profileHref(slug) || '/'} replace><ChevronLeft className="h-4 w-4" /> {displayName}</Link>
      </Button>
      <ProfileSectionTabs slug={slug} />
      <header>
        <h1 className="flex items-center gap-2 font-headline text-3xl font-bold uppercase"><Music2 className="h-7 w-7 text-fuchsia-400" /> Releases</h1>
        <p className="text-sm text-muted-foreground">Play {displayName}&apos;s previews here like a playlist, or open any song for its full page.</p>
      </header>
      {songs.length ? (
        <div className="space-y-4">
          {songs.map((song, index) => (
            <article key={song.shareId} className="space-y-2">
              <div className="flex items-center gap-3 px-1 text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
                <span className="flex h-6 w-6 items-center justify-center rounded-full border border-fuchsia-400/30 bg-fuchsia-500/10 text-fuchsia-200">
                  {String(index + 1).padStart(2, '0')}
                </span>
                <span className="min-w-0 flex-1 truncate">{formatDropPulseLine(song)}</span>
                {song.houseRelease ? (
                  <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-cyan-300/40 bg-cyan-400/10 px-2 py-1 text-[8px] text-cyan-100">
                    <Gift className="h-2.5 w-2.5" /> House · free
                  </span>
                ) : null}
                <Link
                  href={pressedSongHref(song.shareId)}
                  className="flex shrink-0 items-center gap-1 text-fuchsia-200 transition-colors hover:text-fuchsia-100"
                >
                  Song page <ChevronRight className="h-3.5 w-3.5" />
                </Link>
                {user?.id === song.ownerId && song.albumId && song.trackId ? (
                  <button
                    type="button"
                    disabled={unpressingId === song.shareId}
                    className="flex shrink-0 items-center gap-1 text-red-300 transition-colors hover:text-red-200 disabled:opacity-50"
                    onClick={() => {
                      if (!window.confirm(`Take ${song.title} offline? Buyers keep access, but new discovery and checkout stop.`)) return;
                      setUnpressingId(song.shareId);
                      void manageRelease({ kind: 'track', action: 'unpublish', albumId: song.albumId, trackId: song.trackId })
                        .then(() => {
                          setSongs((current) => current.filter((item) => item.shareId !== song.shareId));
                          toast({ title: 'Release taken offline', description: 'It is hidden from discovery and new checkout. Existing buyers keep access.' });
                        })
                        .catch((error: unknown) => {
                          toast({ variant: 'destructive', title: 'Could not take release offline', description: error instanceof Error ? error.message : 'Try again.' });
                        })
                        .finally(() => setUnpressingId(null));
                    }}
                  >
                    <EyeOff className="h-3.5 w-3.5" /> {unpressingId === song.shareId ? 'Taking offline…' : 'Take offline'}
                  </button>
                ) : null}
              </div>
              <MusicDiscoveryTags metadata={song.metadata} compact className="px-1" />
              <Suspense fallback={<div className="h-40 animate-pulse rounded-2xl border border-fuchsia-400/20 bg-black/35" />}>
                <DropListenPanel
                  shareId={song.shareId}
                  title={song.title}
                  artistName={displayName}
                  ownerId={song.ownerId}
                  price={song.price}
                  hasAudio={Boolean(song.hasDropAudio)}
                  houseRelease={song.houseRelease}
                  source="artist_home"
                  presentation="playlist"
                  playbackGroup={`profile-pressed:${slug}`}
                />
              </Suspense>
            </article>
          ))}
        </div>
      ) : <div className="rounded-2xl border border-dashed border-white/15 px-6 py-16 text-center text-sm text-muted-foreground">No live music releases yet.</div>}
      {cursor ? <Button variant="outline" className="w-full font-bold uppercase" disabled={loadingMore} onClick={() => {
        setLoadingMore(true);
        void fetch(`/api/profile/${encodeURIComponent(slug)}/songs?cursor=${encodeURIComponent(cursor)}`)
          .then(async (response) => {
            if (!response.ok) throw new Error('Songs unavailable');
            const data = (await response.json()) as { songs?: PressedProfileSong[]; nextCursor?: string | null };
            setSongs((current) => [...current, ...(data.songs || [])]);
            setCursor(data.nextCursor || null);
          })
          .finally(() => setLoadingMore(false));
      }}>{loadingMore ? 'Loading…' : 'Load more songs'}</Button> : null}
    </main>
    </PublicProfileSectionShell>
  );
}
