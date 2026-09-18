'use client';

import { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, BarChart3, CalendarDays, Disc3, Download, Gift, Headphones, ReceiptText, ShoppingBag, Sparkles, Trophy, Unlink } from 'lucide-react';
import { auth } from '@/lib/firebase/client/firebase';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { DropListenPanel } from '@/components/drop-listen-panel';
import { DropSocialPanel } from '@/components/drop-social-panel';
import { ArtistStarAvatar } from '@/components/profile/artist-star-avatar';
import { centsToUsdLabel } from '@/lib/drop-commerce';
import { buildLoginUrl } from '@/lib/login-links';
import { profileHref } from '@/lib/profile/profile-slug';
import { albumHubHref, type PressedSongSummary, type PressedSongSupporter } from '@/lib/pressed-song';
import { LivingPressField } from '@/components/profile/living-press-field';
import { pressTokens, pressingCssVars } from '@/lib/profile/pressing';
import type { MusicChartsResponse } from '@/lib/music-charts';
import { manageRelease } from '@/lib/release-management-client';
import { DataContext } from '@/context/data-context';
import { MusicDiscoveryTags } from '@/components/music-discovery-tags';
import { openFirstDropLathe } from '@/lib/first-drop-lathe';
import { dnaDropSnapshotTrackPath, resolveDnaDropHref } from '@/lib/dna-drop-access';
import { LyricsDnaStatusBadge } from '@/components/song/lyrics-dna-status-badge';
import { isProOrTrial } from '@/lib/subscription';

async function authorization(): Promise<HeadersInit> {
  const token = await auth.currentUser?.getIdToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function SupporterRow({ supporter, showAmount }: { supporter: PressedSongSupporter; showAmount?: boolean }) {
  const row = (
    <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-black/25 px-3 py-2">
      <span className="w-7 font-code text-xs text-fuchsia-300">#{supporter.rank}</span>
      {supporter.anonymous ? (
        <span className="flex-1 text-sm text-muted-foreground">Anonymous supporter</span>
      ) : (
        <>
          <ArtistStarAvatar name={supporter.name || 'Music Fan'} avatarUrl={supporter.avatarUrl} studioChrome={supporter.studioBadge || 'free'} size={30} />
          <span className="min-w-0 flex-1 truncate text-sm font-bold">{supporter.name}</span>
        </>
      )}
      {showAmount && supporter.amountCents ? <span className="font-code text-xs">{centsToUsdLabel(supporter.amountCents)}</span> : null}
    </div>
  );
  return supporter.slug ? <Link href={profileHref(supporter.slug) || '/'}>{row}</Link> : row;
}

export function PressedSongPageClient({ initial }: { initial: PressedSongSummary }) {
  const router = useRouter();
  const { user, authReady } = useAuth();
  const { updateTrack, albums } = useContext(DataContext);
  const viewerIsPro = isProOrTrial(user);
  const { toast } = useToast();
  const [summary, setSummary] = useState(initial);
  const [savingCredit, setSavingCredit] = useState(false);
  const [chartRank, setChartRank] = useState<number | null>(null);
  const [playback, setPlayback] = useState({ playing: false, currentTime: 0, duration: 1 });
  const [pageVisible, setPageVisible] = useState(true);
  const [unpressing, setUnpressing] = useState(false);
  const pressingTokens = useMemo(
    () => summary.artist.pressing ? pressTokens(summary.artist.pressing) : null,
    [summary.artist.pressing]
  );
  const pressingStyle = useMemo(
    () => pressingTokens ? pressingCssVars(pressingTokens) : undefined,
    [pressingTokens]
  );
  const refresh = useCallback(async () => {
    const trackQuery = initial.trackId ? `?trackId=${encodeURIComponent(initial.trackId)}` : '';
    const response = await fetch(`/api/songs/${encodeURIComponent(initial.shareId)}${trackQuery}`, {
      headers: await authorization(), cache: 'no-store',
    });
    if (response.ok) setSummary((await response.json()) as PressedSongSummary);
  }, [initial.shareId, initial.trackId]);

  useEffect(() => {
    if (authReady) void refresh();
  }, [authReady, user?.id, refresh]);

  useEffect(() => {
    let cancelled = false;
    void fetch('/api/charts?trackLimit=100&artistLimit=1')
      .then((response) => response.ok ? response.json() : null)
      .then((data: MusicChartsResponse | null) => {
        if (cancelled || !data) return;
        const index = data.tracks.findIndex((track) => track.shareId === initial.shareId);
        setChartRank(index >= 0 ? index + 1 : null);
      })
      .catch(() => undefined);
    return () => { cancelled = true; };
  }, [initial.shareId]);

  useEffect(() => {
    const syncVisibility = () => setPageVisible(document.visibilityState === 'visible');
    syncVisibility();
    document.addEventListener('visibilitychange', syncVisibility);
    return () => document.removeEventListener('visibilitychange', syncVisibility);
  }, []);

  const setSupporterCredit = (checked: boolean) => {
    setSavingCredit(true);
    void (async () => {
      try {
        const trackQuery = summary.trackId ? `?trackId=${encodeURIComponent(summary.trackId)}` : '';
        const response = await fetch(`/api/songs/${encodeURIComponent(summary.shareId)}${trackQuery}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', ...(await authorization()) },
          body: JSON.stringify({ supporterCreditPublic: checked }),
        });
        if (!response.ok) throw new Error('Could not save supporter credit');
        setSummary((current) => current.viewer ? { ...current, viewer: { ...current.viewer, supporterCreditPublic: checked } } : current);
        await refresh();
        toast({ title: checked ? 'Supporter credit is visible' : 'Supporter credit is private' });
      } catch (error) {
        toast({ variant: 'destructive', title: error instanceof Error ? error.message : 'Could not save' });
      } finally {
        setSavingCredit(false);
      }
    })();
  };

  const artistHref = profileHref(summary.artist.slug);
  const currentReleaseHref = summary.currentRelease
    ? `/song/${encodeURIComponent(summary.currentRelease.shareId)}?trackId=${encodeURIComponent(summary.currentRelease.trackId)}`
    : undefined;
  const viewer = summary.viewer;
  const canPlayCurrentRelease = summary.releaseLive || Boolean(viewer?.owns) || Boolean(summary.ownerControls);
  const stats = [
    { icon: Headphones, label: 'Plays', value: summary.publicTotals.plays },
    { icon: ShoppingBag, label: 'Buyers', value: summary.publicTotals.buyers },
    ...(summary.member ? [
      { icon: Sparkles, label: 'Qualified listens', value: summary.member.qualifiedListeningDays },
      { icon: BarChart3, label: 'Current 7-day chart', value: chartRank ? `#${chartRank}` : '—' },
    ] : []),
  ];
  const albumHref = albumHubHref(summary.albumShareId || (summary.scope === 'album' ? summary.shareId : undefined));
  const albumTitle = summary.albumTitle || summary.metadata.albumTitle;
  const lyricsDnaHref = useMemo(() => {
    if (!summary.dnaShareId) return undefined;
    if (summary.trackId && summary.albumTitle && summary.dnaShareId === summary.shareId) {
      return dnaDropSnapshotTrackPath(summary.shareId, summary.trackId);
    }
    return resolveDnaDropHref(summary.dnaShareId, Boolean(user), viewerIsPro);
  }, [
    summary.dnaShareId,
    summary.trackId,
    summary.albumTitle,
    summary.shareId,
    user,
    viewerIsPro,
  ]);

  const unpressSong = async () => {
    const controls = summary.ownerControls;
    if (!controls || !window.confirm(`Take “${summary.title}” offline? New checkout and public discovery stop, while existing buyers keep access.`)) return;
    setUnpressing(true);
    try {
      await manageRelease({
        kind: 'track',
        action: 'unpublish',
        shareId: summary.shareId,
        ...(controls.albumId ? { albumId: controls.albumId, trackId: controls.trackId } : {}),
      });
      if (controls.albumId && albums.some((album) => album.id === controls.albumId)) {
        updateTrack(controls.albumId, controls.trackId, { releaseStatus: 'unlisted', releaseShareId: summary.shareId });
      }
      setSummary((current) => current.ownerControls ? { ...current, ownerControls: { ...current.ownerControls, releaseStatus: 'unlisted' } } : current);
      toast({ title: 'Release taken offline', description: 'It is off public surfaces. Republish from The Vault to restore this same URL.' });
    } catch (error) {
      toast({ variant: 'destructive', title: 'Could not take release offline', description: error instanceof Error ? error.message : undefined });
    } finally {
      setUnpressing(false);
    }
  };
  return (
    <main className="relative min-h-screen overflow-hidden bg-[#050914] px-4 py-10 text-white" style={pressingStyle as React.CSSProperties}>
      {summary.artist.pressing ? <LivingPressField config={summary.artist.pressing} /> : <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_20%_15%,rgba(236,72,153,.18),transparent_38%),radial-gradient(circle_at_80%_70%,rgba(59,130,246,.14),transparent_42%)]" />}
      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-0 flex h-[42vh] items-end justify-center gap-[clamp(3px,.8vw,12px)] overflow-hidden opacity-45 [mask-image:linear-gradient(to_top,black,transparent)] motion-reduce:hidden" aria-hidden>
        {Array.from({ length: 28 }, (_, index) => {
          const eqActive = playback.playing && pageVisible;
          const wave = eqActive ? 28 + Math.abs(Math.sin(playback.currentTime * (1.4 + index * .07) + index)) * 62 : 12 + (index % 5) * 3;
          return <span key={index} className="w-[clamp(4px,1.2vw,16px)] rounded-t-full bg-gradient-to-t from-fuchsia-500 via-sky-400 to-cyan-200 transition-[height,opacity] duration-150" style={{ height: `${wave}%`, opacity: eqActive ? .55 + (index % 4) * .1 : .25 }} />;
        })}
      </div>
      <div className="relative mx-auto max-w-4xl space-y-7">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              className="gap-1.5 font-bold uppercase"
              onClick={() => {
                if (window.history.length > 1) router.back();
                else router.push(artistHref || '/');
              }}
            >
              <ArrowLeft className="h-4 w-4" /> Back
            </Button>
            <Button variant="outline" asChild className="font-bold uppercase"><Link href="/">The Scene</Link></Button>
            {albumHref && albumTitle ? (
              <Button variant="outline" asChild className="font-bold uppercase">
                <Link href={albumHref}>
                  <Disc3 className="mr-1.5 h-4 w-4" /> Album hub
                </Link>
              </Button>
            ) : null}
          </div>
          <Button variant="outline" asChild className="font-bold uppercase"><Link href="/vault">The Vault</Link></Button>
        </div>
        <section className="rounded-3xl border border-fuchsia-400/35 bg-black/60 p-5 shadow-[0_0_70px_rgba(236,72,153,.16)] backdrop-blur-md sm:p-8">
          <div className="mb-5 flex items-center gap-3">
            <ArtistStarAvatar name={summary.artist.name} avatarUrl={summary.artist.avatarUrl} useStarMark={summary.artist.starMarkUseStar} starMarkSeed={summary.artist.starMarkSeed} studioChrome={summary.artist.studioBadge || 'free'} size={48} />
            <div className="min-w-0"><p className="text-[10px] font-bold uppercase tracking-[.22em] text-fuchsia-300">Original artist</p>{artistHref ? <Link href={artistHref} className="truncate text-lg font-bold hover:text-fuchsia-300">{summary.artist.name}</Link> : <p className="text-lg font-bold">{summary.artist.name}</p>}</div>
          </div>
          <div className="mb-5 flex items-start gap-4">
            <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-fuchsia-400/40 bg-fuchsia-500/15"><Disc3 className="h-8 w-8 text-fuchsia-300" /></span>
            <div>
              <div className="mb-2 flex flex-wrap items-center gap-1.5">
                <p className="text-[10px] font-bold uppercase tracking-[.25em] text-muted-foreground">Music release</p>
                {summary.houseRelease ? (
                  <span className="inline-flex items-center gap-1 rounded-full border border-cyan-300/40 bg-cyan-400/10 px-2 py-0.5 text-[8px] font-bold uppercase tracking-[.16em] text-cyan-100">
                    <Gift className="h-2.5 w-2.5" /> House · free
                  </span>
                ) : null}
                {albumHref && albumTitle ? (
                  <Link
                    href={albumHref}
                    className="inline-flex items-center gap-1 rounded-full border border-emerald-400/35 bg-emerald-500/10 px-2 py-0.5 text-[8px] font-bold uppercase tracking-[.16em] text-emerald-100 hover:border-emerald-300/55"
                  >
                    <Disc3 className="h-2.5 w-2.5" /> From the album · {albumTitle}
                  </Link>
                ) : null}
              </div>
              <div className="flex flex-wrap items-end justify-between gap-x-3 gap-y-2">
                <h1 className="min-w-0 flex-1 font-headline text-3xl font-black uppercase sm:text-5xl">{summary.title}</h1>
                <LyricsDnaStatusBadge
                  active={Boolean(lyricsDnaHref)}
                  href={lyricsDnaHref}
                  variant="title"
                  className="shrink-0"
                />
              </div>
              <p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground"><CalendarDays className="h-3.5 w-3.5" /> Released {new Date(summary.releasedAt).toLocaleDateString()}</p>
            </div>
          </div>
          <MusicDiscoveryTags metadata={summary.metadata} soundAsText hideAlbum={Boolean(albumHref && albumTitle)} className="mb-5" />
          {summary.ownerControls ? (
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/10 bg-black/30 px-3 py-2">
              <span className="font-code text-[10px] uppercase tracking-widest text-muted-foreground">
                Owner release status · {summary.ownerControls.releaseStatus}
              </span>
              {summary.ownerControls.releaseStatus === 'live' ? (
                <div className="flex flex-wrap gap-2">
                  <Button type="button" size="sm" variant="outline" className="h-8 text-[10px] font-bold uppercase" onClick={() => openFirstDropLathe({ shareId: summary.shareId, mode: 'song' })}>
                    Update
                  </Button>
                  <Button type="button" size="sm" variant="outline" className="h-8 border-red-400/30 text-[10px] font-bold uppercase text-red-300" disabled={unpressing} onClick={() => void unpressSong()}>
                    <Unlink className="mr-1.5 h-3.5 w-3.5" /> Take offline
                  </Button>
                </div>
              ) : (
                <Button asChild size="sm" variant="outline" className="h-8 text-[10px] font-bold uppercase"><Link href="/vault">Republish from Vault</Link></Button>
              )}
            </div>
          ) : null}
          {canPlayCurrentRelease ? (
            <DropListenPanel shareId={summary.shareId} trackId={summary.trackId} title={summary.title} artistName={summary.artist.name} ownerId={summary.ownerId} price={summary.price} hasAudio houseRelease={summary.houseRelease} source="direct" presentation="song" songMetadata={summary.metadata} firstPressRank={viewer?.firstPressRank} onPlaybackStateChange={setPlayback} pressing={summary.artist.pressing} albumTitle={albumTitle} albumHref={albumHref} />
          ) : (
            <div className="rounded-2xl border border-amber-300/25 bg-amber-300/[0.06] px-4 py-4">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-amber-200">Original release offline</p>
              <p className="mt-1 text-sm text-muted-foreground">This page remains as release history, but its old player and checkout are closed.</p>
              {currentReleaseHref || artistHref ? <Button asChild size="sm" variant="outline" className="mt-3 h-8 text-[10px] font-bold uppercase"><Link href={currentReleaseHref || `${artistHref}/songs`}>{currentReleaseHref ? `Play from ${summary.currentRelease?.albumTitle}` : 'See current releases'}</Link></Button> : null}
            </div>
          )}
          <div className="mt-4">
            <DropSocialPanel
              shareId={summary.shareId}
              title={summary.title}
              ownerId={summary.ownerId}
              playCount={summary.publicTotals.plays}
              purchaseCount={summary.publicTotals.buyers}
              hasAudio
              trackId={summary.scope === 'track' ? summary.trackId : undefined}
              ownerName={summary.artist.name}
              ownerSlug={summary.artist.slug}
              albumTitle={albumTitle}
              albumShareId={summary.albumShareId}
            />
          </div>
        </section>
        <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">{stats.map(({ icon: Icon, label, value }) => <div key={label} className="rounded-xl border border-white/10 bg-black/30 p-4"><Icon className="mb-2 h-4 w-4 text-sky-300" /><p className="font-headline text-2xl font-bold">{value.toLocaleString()}</p><p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">{label}</p></div>)}</section>
        {!user ? (
          <section className="rounded-2xl border border-sky-400/25 bg-sky-500/10 p-5 text-center"><p className="font-bold">Sign in to see verified listening, supporter ranks, and your purchase history.</p><Button asChild className="mt-3 font-bold uppercase"><Link href={buildLoginUrl({ mode: 'signup', next: `/song/${summary.shareId}`, intent: 'pressed_song' })}>Join and continue</Link></Button></section>
        ) : summary.member ? (
          <>
            <section className="grid gap-3 sm:grid-cols-2"><div className="rounded-xl border border-white/10 bg-black/30 p-4"><p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Verified supporters</p><p className="font-headline text-2xl font-bold">{summary.publicTotals.buyers.toLocaleString()}</p></div><div className="rounded-xl border border-white/10 bg-black/30 p-4"><p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Gross support</p><p className="font-headline text-2xl font-bold">{centsToUsdLabel(summary.member.grossSupportCents)}</p></div></section>
            {viewer?.firstPressRank ? <div className="flex items-center gap-3 rounded-2xl border border-amber-400/35 bg-amber-500/10 p-4"><Trophy className="h-6 w-6 text-amber-300" /><div><p className="font-bold">First Press #{viewer.firstPressRank}</p><p className="text-xs text-muted-foreground">Your verified place among this song’s first 10 supporters.</p></div></div> : null}
            {viewer?.amountPaidCents ? <div className="flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-black/30 p-4"><div><p className="font-bold">Show my supporter credit</p><p className="text-xs text-muted-foreground">Per-song choice. Your name stays private by default.</p></div><Switch checked={viewer.supporterCreditPublic} disabled={savingCredit} onCheckedChange={setSupporterCredit} /></div> : null}
            {viewer?.purchase ? (
              <section className="overflow-hidden rounded-2xl border border-amber-300/35 bg-[linear-gradient(135deg,rgba(68,43,5,.72),rgba(0,0,0,.58)_58%)] shadow-[0_16px_50px_rgba(245,158,11,.12)]">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-amber-200/15 px-5 py-4">
                  <div className="flex items-center gap-2"><ReceiptText className="h-5 w-5 text-amber-300" /><div><h2 className="font-headline text-lg font-black uppercase text-amber-50">Purchase receipt</h2><p className="text-[9px] font-bold uppercase tracking-widest text-amber-200/70">Permanent Library access</p></div></div>
                  <span className="rounded-full border border-amber-300/35 bg-amber-300/10 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-amber-100">{viewer.purchase.edition}</span>
                </div>
                <dl className="grid gap-x-6 gap-y-4 px-5 py-5 text-sm sm:grid-cols-2">
                  <div><dt className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Purchased</dt><dd className="mt-1 font-bold">{viewer.purchase.title}</dd></div>
                  <div><dt className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">From artist</dt><dd className="mt-1 font-bold">{viewer.purchase.artistName}</dd></div>
                  <div><dt className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Purchase date</dt><dd className="mt-1 font-code">{new Date(viewer.purchase.purchasedAt).toLocaleString()}</dd></div>
                  <div><dt className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Amount paid</dt><dd className="mt-1 font-headline text-xl font-black text-amber-100">{centsToUsdLabel(viewer.purchase.amountCents)}</dd></div>
                  <div><dt className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Item type</dt><dd className="mt-1 capitalize">{viewer.purchase.scope}</dd></div>
                  <div><dt className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Access</dt><dd className="mt-1">Full stream · offline device copy from Library</dd></div>
                </dl>
                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-amber-200/15 bg-black/20 px-5 py-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-2"><Download className="h-4 w-4 text-amber-300" /> Save it for offline play from the Library song menu.</span>
                  <Button asChild size="sm" variant="outline" className="border-amber-300/35 text-amber-100"><Link href="/library">Open Library</Link></Button>
                </div>
              </section>
            ) : null}
            <section className="grid gap-6 md:grid-cols-2"><div className="space-y-2"><h2 className="font-headline text-xl font-bold uppercase">Top supporters</h2>{summary.member.topSupporters.length ? summary.member.topSupporters.map((supporter) => <SupporterRow key={supporter.rank} supporter={supporter} showAmount />) : <p className="text-sm text-muted-foreground">No verified supporters yet.</p>}</div><div className="space-y-2"><h2 className="font-headline text-xl font-bold uppercase">First 10</h2>{summary.member.firstPress.length ? summary.member.firstPress.map((supporter) => <SupporterRow key={supporter.rank} supporter={supporter} />) : <p className="text-sm text-muted-foreground">The First Press is still open.</p>}</div></section>
          </>
        ) : null}
      </div>
    </main>
  );
}
