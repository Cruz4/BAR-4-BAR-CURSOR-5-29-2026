'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ChevronLeft, Dna } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { StudioLoader } from '@/components/studio-loader';
import { ProfileSectionTabs } from '@/components/profile/profile-section-tabs';
import { LiveDnaDropsGroupedList, lyricDnaItems, type LiveDnaDropItem } from '@/components/profile/live-dna-drop-card';
import { profileHref } from '@/lib/profile/profile-slug';
import { PublicProfileSectionShell } from '@/components/profile/public-profile-section-shell';

export default function ProfileDnaDropsPage() {
  const params = useParams();
  const slug = typeof params?.slug === 'string' ? params.slug : '';
  const [displayName, setDisplayName] = useState('Artist');
  const [rawProfile, setRawProfile] = useState<unknown>({});
  const [drops, setDrops] = useState<LiveDnaDropItem[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    if (!slug) return;
    let cancelled = false;
    void fetch(`/api/profile/${encodeURIComponent(slug)}`)
      .then(async (response) => {
        if (!response.ok) throw new Error('Profile unavailable');
        const data = (await response.json()) as {
          displayName?: string;
          liveDnaDrops?: LiveDnaDropItem[];
        };
        if (cancelled) return;
        setDisplayName(data.displayName?.trim() || slug);
        setRawProfile(data);
        setDrops(Array.isArray(data.liveDnaDrops) ? data.liveDnaDrops : []);
      })
      .catch(() => {
        if (!cancelled) setMissing(true);
      })
      .finally(() => {
        if (!cancelled) setLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, [slug]);

  const dnaDrops = useMemo(() => lyricDnaItems(drops), [drops]);

  if (!loaded) return <StudioLoader size="lg" fullscreen />;
  if (missing) return <div className="mx-auto max-w-lg px-4 py-20 text-center">Artist page not found.</div>;

  return (
    <PublicProfileSectionShell rawProfile={rawProfile} slug={slug}>
      <main className="container mx-auto max-w-4xl space-y-6 px-4 py-8">
        <Button size="sm" variant="outline" asChild className="h-8 gap-1.5 font-bold uppercase">
          <Link href={profileHref(slug) || '/'} replace>
            <ChevronLeft className="h-4 w-4" /> {displayName}
          </Link>
        </Button>
        <ProfileSectionTabs slug={slug} />
        <header>
          <h1 className="flex items-center gap-2 font-headline text-3xl font-bold uppercase">
            <Dna className="h-7 w-7 text-emerald-400" /> DNA Drops
          </h1>
          <p className="text-sm text-muted-foreground">
            Live Lyrics DNA Drops from {displayName} — open a drop to read or play it.
          </p>
        </header>
        {dnaDrops.length ? (
          <LiveDnaDropsGroupedList drops={dnaDrops} layout="shelf" hideFirstDropStrip />
        ) : (
          <div className="rounded-2xl border border-dashed border-white/15 px-6 py-16 text-center text-sm text-muted-foreground">
            No live Lyrics DNA Drops yet.
          </div>
        )}
      </main>
    </PublicProfileSectionShell>
  );
}
