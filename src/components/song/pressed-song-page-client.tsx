'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { CalendarDays, Disc3, Headphones, Repeat2, ShoppingBag, Sparkles, Trophy } from 'lucide-react';
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
import type { PressedSongSummary, PressedSongSupporter } from '@/lib/pressed-song';

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
  const { user, authReady } = useAuth();
  const { toast } = useToast();
  const [summary, setSummary] = useState(initial);
  const [savingCredit, setSavingCredit] = useState(false);
  const refresh = useCallback(async () => {
    const response = await fetch(`/api/songs/${encodeURIComponent(initial.shareId)}`, {
      headers: await authorization(), cache: 'no-store',
    });
    if (response.ok) setSummary((await response.json()) as PressedSongSummary);
  }, [initial.shareId]);

  useEffect(() => {
    if (authReady) void refresh();
  }, [authReady, user?.id, refresh]);

  const setSupporterCredit = (checked: boolean) => {
    setSavingCredit(true);
    void (async () => {
      try {
        const response = await fetch(`/api/songs/${encodeURIComponent(summary.shareId)}`, {
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
  const viewer = summary.viewer;
  const stats = [
    { icon: Headphones, label: 'Plays', value: summary.publicTotals.plays },
    { icon: ShoppingBag, label: 'Buyers', value: summary.publicTotals.buyers },
    ...(summary.member ? [
      { icon: Sparkles, label: 'Qualified listens', value: summary.member.qualifiedListeningDays },
      { icon: Repeat2, label: 'Repeats', value: summary.member.repeats },
    ] : []),
  ];
  return (
    <main className="relative min-h-screen overflow-hidden bg-[#050914] px-4 py-10 text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_15%,rgba(236,72,153,.18),transparent_38%),radial-gradient(circle_at_80%_70%,rgba(59,130,246,.14),transparent_42%)]" />
      <div className="relative mx-auto max-w-4xl space-y-7">
        <div className="flex justify-between gap-3"><Button variant="outline" asChild className="font-bold uppercase"><Link href="/">The Scene</Link></Button><Button variant="outline" asChild className="font-bold uppercase"><Link href="/vault">The Vault</Link></Button></div>
        <section className="rounded-3xl border border-fuchsia-400/30 bg-black/45 p-5 shadow-[0_0_70px_rgba(236,72,153,.12)] sm:p-8">
          <div className="mb-5 flex items-center gap-3">
            <ArtistStarAvatar name={summary.artist.name} avatarUrl={summary.artist.avatarUrl} useStarMark={summary.artist.starMarkUseStar} starMarkSeed={summary.artist.starMarkSeed} studioChrome={summary.artist.studioBadge || 'free'} size={48} />
            <div className="min-w-0"><p className="text-[10px] font-bold uppercase tracking-[.22em] text-fuchsia-300">Original artist</p>{artistHref ? <Link href={artistHref} className="truncate text-lg font-bold hover:text-fuchsia-300">{summary.artist.name}</Link> : <p className="text-lg font-bold">{summary.artist.name}</p>}</div>
          </div>
          <div className="mb-5 flex items-start gap-4">
            <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-fuchsia-400/40 bg-fuchsia-500/15"><Disc3 className="h-8 w-8 text-fuchsia-300" /></span>
            <div><p className="text-[10px] font-bold uppercase tracking-[.25em] text-muted-foreground">Pressed song</p><h1 className="font-headline text-3xl font-black uppercase sm:text-5xl">{summary.title}</h1><p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground"><CalendarDays className="h-3.5 w-3.5" /> Released {new Date(summary.releasedAt).toLocaleDateString()}</p></div>
          </div>
          <DropListenPanel shareId={summary.shareId} title={summary.title} ownerId={summary.ownerId} price={summary.price} hasAudio source="direct" />
          <div className="mt-4">
            <DropSocialPanel
              shareId={summary.shareId}
              title={summary.title}
              ownerId={summary.ownerId}
              playCount={summary.publicTotals.plays}
              purchaseCount={summary.publicTotals.buyers}
              hasAudio
            />
          </div>
        </section>
        <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">{stats.map(({ icon: Icon, label, value }) => <div key={label} className="rounded-xl border border-white/10 bg-black/30 p-4"><Icon className="mb-2 h-4 w-4 text-sky-300" /><p className="font-headline text-2xl font-bold">{value.toLocaleString()}</p><p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">{label}</p></div>)}</section>
        {!user ? (
          <section className="rounded-2xl border border-sky-400/25 bg-sky-500/10 p-5 text-center"><p className="font-bold">Sign in to see verified listening, supporter ranks, and your purchase history.</p><Button asChild className="mt-3 font-bold uppercase"><Link href={buildLoginUrl({ mode: 'signup', next: `/song/${summary.shareId}`, intent: 'pressed_song' })}>Join and continue</Link></Button></section>
        ) : summary.member ? (
          <>
            <section className="grid gap-3 sm:grid-cols-3"><div className="rounded-xl border border-white/10 bg-black/30 p-4"><p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Completions</p><p className="font-headline text-2xl font-bold">{summary.member.completions.toLocaleString()}</p></div><div className="rounded-xl border border-white/10 bg-black/30 p-4"><p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Gross support</p><p className="font-headline text-2xl font-bold">{centsToUsdLabel(summary.member.grossSupportCents)}</p></div><div className="rounded-xl border border-white/10 bg-black/30 p-4"><p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">You paid</p><p className="font-headline text-2xl font-bold">{centsToUsdLabel(viewer?.amountPaidCents || 0)}</p></div></section>
            {viewer?.firstPressRank ? <div className="flex items-center gap-3 rounded-2xl border border-amber-400/35 bg-amber-500/10 p-4"><Trophy className="h-6 w-6 text-amber-300" /><div><p className="font-bold">First Press #{viewer.firstPressRank}</p><p className="text-xs text-muted-foreground">Your verified place among this song’s first 10 supporters.</p></div></div> : null}
            {viewer?.amountPaidCents ? <div className="flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-black/30 p-4"><div><p className="font-bold">Show my supporter credit</p><p className="text-xs text-muted-foreground">Per-song choice. Your name stays private by default.</p></div><Switch checked={viewer.supporterCreditPublic} disabled={savingCredit} onCheckedChange={setSupporterCredit} /></div> : null}
            <section className="grid gap-6 md:grid-cols-2"><div className="space-y-2"><h2 className="font-headline text-xl font-bold uppercase">Top supporters</h2>{summary.member.topSupporters.length ? summary.member.topSupporters.map((supporter) => <SupporterRow key={supporter.rank} supporter={supporter} showAmount />) : <p className="text-sm text-muted-foreground">No verified supporters yet.</p>}</div><div className="space-y-2"><h2 className="font-headline text-xl font-bold uppercase">First 10</h2>{summary.member.firstPress.length ? summary.member.firstPress.map((supporter) => <SupporterRow key={supporter.rank} supporter={supporter} />) : <p className="text-sm text-muted-foreground">The First Press is still open.</p>}</div></section>
          </>
        ) : null}
      </div>
    </main>
  );
}
