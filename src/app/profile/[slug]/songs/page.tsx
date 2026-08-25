'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ChevronLeft, Music2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { StudioLoader } from '@/components/studio-loader';
import { ProfileSectionTabs } from '@/components/profile/profile-section-tabs';
import { LiveDnaDropLinkCard, type LiveDnaDropItem } from '@/components/profile/live-dna-drop-card';
import { profileHref } from '@/lib/profile/profile-slug';
import { PublicProfileSectionShell } from '@/components/profile/public-profile-section-shell';

export default function ProfileSongsPage() {
  const params = useParams();
  const slug = typeof params?.slug === 'string' ? params.slug : '';
  const [displayName, setDisplayName] = useState('Artist');
  const [rawProfile, setRawProfile] = useState<unknown>({});
  const [songs, setSongs] = useState<LiveDnaDropItem[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [missing, setMissing] = useState(false);

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
        const songsData = (await songsResponse.json()) as { songs?: LiveDnaDropItem[]; nextCursor?: string | null };
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
    <main className="container mx-auto max-w-2xl space-y-6 px-4 py-8">
      <Button size="sm" variant="outline" asChild className="h-8 gap-1.5 font-bold uppercase">
        <Link href={profileHref(slug) || '/'}><ChevronLeft className="h-4 w-4" /> {displayName}</Link>
      </Button>
      <ProfileSectionTabs slug={slug} />
      <header>
        <h1 className="flex items-center gap-2 font-headline text-3xl font-bold uppercase"><Music2 className="h-7 w-7 text-fuchsia-400" /> Pressed Songs</h1>
        <p className="text-sm text-muted-foreground">Every live First Drop pressed by {displayName}.</p>
      </header>
      {songs.length ? <div className="grid gap-3 sm:grid-cols-2">{songs.map((song) => <LiveDnaDropLinkCard key={song.shareId} drop={song} />)}</div> : <div className="rounded-2xl border border-dashed border-white/15 px-6 py-16 text-center text-sm text-muted-foreground">No live pressed songs yet.</div>}
      {cursor ? <Button variant="outline" className="w-full font-bold uppercase" disabled={loadingMore} onClick={() => {
        setLoadingMore(true);
        void fetch(`/api/profile/${encodeURIComponent(slug)}/songs?cursor=${encodeURIComponent(cursor)}`)
          .then(async (response) => {
            if (!response.ok) throw new Error('Songs unavailable');
            const data = (await response.json()) as { songs?: LiveDnaDropItem[]; nextCursor?: string | null };
            setSongs((current) => [...current, ...(data.songs || [])]);
            setCursor(data.nextCursor || null);
          })
          .finally(() => setLoadingMore(false));
      }}>{loadingMore ? 'Loading…' : 'Load more songs'}</Button> : null}
    </main>
    </PublicProfileSectionShell>
  );
}
