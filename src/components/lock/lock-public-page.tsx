'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { EmbedPlayer } from '@/components/profile/embed-player';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { isLockEnabled, LOCK_HOUSE_ID, lockPath } from '@/lib/lock-feature';
import { persistLockHandoff } from '@/lib/lock/session';
import { persistDemoLines } from '@/lib/demo-session';
import type { LockDoc, LockEcho } from '@/lib/lock/types';
import { buildLoginUrl } from '@/lib/login-links';
import { Download, Lock, Star } from 'lucide-react';
import { auth } from '@/lib/firebase/client/firebase';

type LockPublicPageProps = {
  lockId: string;
  /** Server-passed; when true, skip client env check (Next often fails to inline NEXT_PUBLIC_LOCK). */
  lockEnabled?: boolean;
};

export function LockPublicPage({ lockId, lockEnabled }: LockPublicPageProps) {
  const router = useRouter();
  const { user } = useAuth();
  const { toast } = useToast();
  const enabled = lockEnabled === true || isLockEnabled();
  const id = lockId === 'house' ? LOCK_HOUSE_ID : lockId;

  const [lock, setLock] = useState<LockDoc | null>(null);
  const [topEchoes, setTopEchoes] = useState<LockEcho[]>([]);
  const [loading, setLoading] = useState(true);
  const [bar, setBar] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<LockEcho | null>(null);
  const [parentEchoId, setParentEchoId] = useState<string | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Prefer server-passed lockEnabled / lock layout gate. Only bounce if explicitly off.
    if (lockEnabled === true) return;
    if (!enabled) {
      router.replace('/');
    }
  }, [enabled, lockEnabled, router]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/lock/${encodeURIComponent(id)}`);
      if (!res.ok) throw new Error('Failed to load');
      const data = await res.json();
      setLock(data.lock);
      setTopEchoes(data.topEchoes || []);
    } catch {
      setLock(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (enabled) void load();
  }, [enabled, load]);

  const signupHref = useMemo(() => {
    return buildLoginUrl({
      mode: 'signup',
      next: lockPath(id),
      intent: 'lock',
    });
  }, [id]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const branch = new URLSearchParams(window.location.search).get('branch');
    if (branch) setParentEchoId(branch);
  }, []);

  const onLockIt = async () => {
    if (!bar.trim() || submitting) return;
    setSubmitting(true);
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      const token = await auth.currentUser?.getIdToken().catch(() => null);
      if (token) headers.Authorization = `Bearer ${token}`;

      const res = await fetch(`/api/lock/${encodeURIComponent(id)}/echo`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          text: bar,
          parentEchoId,
          displayName: user?.displayName || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Lock failed');
      setResult(data.echo);
      persistLockHandoff({
        lockId: id,
        echoId: data.echo.id,
        text: data.echo.text,
        lockScore: data.echo.lockScore,
      });
      setBar('');
      void load();
    } catch (e) {
      toast({
        variant: 'destructive',
        title: 'Could not lock',
        description: e instanceof Error ? e.message : 'Try again',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const onWatch = async () => {
    if (!user || !result) {
      router.push(signupHref);
      return;
    }
    try {
      const token = await auth.currentUser?.getIdToken();
      if (!token) throw new Error('Sign in required');
      const res = await fetch(`/api/lock/${encodeURIComponent(id)}/watch`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          userId: user.id,
          echoId: result.id,
          displayName: user.displayName || 'Artist',
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Watch failed');
      toast({
        title: 'Watching this LOCK',
        description: 'You’ll get Activity when someone locks after you or you get picked.',
      });
    } catch (e) {
      toast({
        variant: 'destructive',
        title: 'Watch failed',
        description: e instanceof Error ? e.message : 'Try again',
      });
    }
  };

  const downloadCard = async () => {
    if (!cardRef.current || !result || !lock) return;
    try {
      const { downloadCanvasPng, captureFoilNodeToCanvas } = await import(
        '@/lib/gamification/capture-foil-node'
      );
      const canvas = await captureFoilNodeToCanvas(cardRef.current);
      downloadCanvasPng(canvas, `lock-${id}-${result.id}.png`);
      toast({ title: 'LOCK card downloaded' });
    } catch {
      try {
        await navigator.clipboard.writeText(
          `LOCK ${result.lockScore} on ${lock.ownerName}'s cast\n“${result.text}”\n${typeof window !== 'undefined' ? window.location.origin : ''}${lockPath(id)}`
        );
        toast({ title: 'Copied LOCK text' });
      } catch {
        toast({ variant: 'destructive', title: 'Share failed' });
      }
    }
  };

  if (!enabled) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-muted-foreground font-code text-sm">
        Redirecting…
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background font-code text-sm text-muted-foreground">
        Opening LOCK…
      </div>
    );
  }

  if (!lock) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-background p-6">
        <p className="font-headline text-2xl">LOCK closed</p>
        <Button asChild>
          <Link href="/">Back</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground font-code selection:bg-primary/30">
      <header className="sticky top-0 z-50 border-b border-border/60 bg-background/80 backdrop-blur-md px-4 py-3 flex items-center justify-between gap-3">
        <Link
          href="/"
          className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground hover:text-foreground"
        >
          bar4bar
        </Link>
        <span className="text-[9px] uppercase tracking-[0.2em] font-bold text-primary/90 flex items-center gap-1">
          <Lock className="h-3 w-3" />
          {lock.isHouse ? 'HOUSE LOCK' : 'OPEN LOCK'}
        </span>
        <div className="flex items-center gap-2">
          <Button asChild variant="ghost" size="sm" className="h-7 px-2 text-[9px] uppercase font-bold">
            <Link href={`/lock/${id}/bloodline`}>Bloodline</Link>
          </Button>
          <Button asChild variant="ghost" size="sm" className="h-7 px-2 text-[9px] uppercase font-bold">
            <Link href="/try">Full sheet</Link>
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-lg px-4 py-10 sm:py-14 space-y-8">
        <div className="space-y-2">
          <p className="text-[10px] uppercase tracking-[0.25em] font-bold text-muted-foreground">
            @{lock.ownerSlug || lock.ownerName} · {lock.echoCount} echoes · {lock.watcherCount} watching
          </p>
          <h1 className="font-headline text-3xl sm:text-4xl tracking-tight">Finish this bar</h1>
        </div>

        {lock.embedUrl ? (
          <div className="rounded-lg overflow-hidden border border-border/60">
            <EmbedPlayer url={lock.embedUrl} title="Reference bed" />
          </div>
        ) : null}

        <section className="space-y-3">
          <p className="text-[10px] uppercase tracking-widest font-bold text-primary">Started this</p>
          <blockquote className="border-l-2 border-primary/50 pl-4 text-lg sm:text-xl leading-snug font-medium">
            “{lock.seedBar}”
          </blockquote>
        </section>

        {result ? (
          <section className="space-y-4 rounded-xl border border-primary/30 bg-primary/5 p-4">
            <div
              ref={cardRef}
              className="rounded-lg bg-zinc-950 text-zinc-50 p-5 space-y-3 border border-zinc-800"
            >
              <p className="text-[9px] uppercase tracking-[0.2em] text-zinc-400">
                LOCK card · @{lock.ownerName}
              </p>
              <p className="text-sm text-zinc-400 line-through decoration-zinc-600">“{lock.seedBar}”</p>
              <p className="text-lg font-medium leading-snug">“{result.text}”</p>
              <div className="flex items-end justify-between gap-3 pt-2">
                <div>
                  <p className="text-4xl font-headline text-emerald-400">LOCK {result.lockScore}</p>
                  <p className="text-[10px] uppercase tracking-widest text-emerald-200/80">
                    {result.lockLabel}
                  </p>
                </div>
                <p className="text-[9px] text-zinc-500">bar4bar.ink</p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2">
              <Button type="button" variant="outline" className="gap-2" onClick={() => void downloadCard()}>
                <Download className="h-4 w-4" /> Share LOCK card
              </Button>
              <Button type="button" onClick={() => void onWatch()}>
                {user ? 'Name echo & watch' : 'Name your echo — free'}
              </Button>
            </div>
            {user && result ? (
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  persistDemoLines([lock.seedBar, result.text]);
                  router.push('/try');
                }}
              >
                Open in studio
              </Button>
            ) : null}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setResult(null);
                setParentEchoId(null);
              }}
            >
              Write another
            </Button>
          </section>
        ) : (
          <section className="space-y-3">
            <label htmlFor="lock-bar" className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground">
              Your turn{parentEchoId ? ' · branching' : ''}
            </label>
            <Textarea
              id="lock-bar"
              value={bar}
              onChange={(e) => setBar(e.target.value)}
              placeholder="Type one bar…"
              rows={3}
              className="resize-none text-base leading-relaxed"
              disabled={lock.status !== 'open'}
            />
            <Button
              type="button"
              className="w-full h-11 font-bold uppercase tracking-wide"
              disabled={!bar.trim() || submitting || lock.status !== 'open'}
              onClick={() => void onLockIt()}
            >
              {submitting ? 'Locking…' : 'Lock it'}
            </Button>
          </section>
        )}

        {topEchoes.length > 0 && (
          <section className="space-y-3 border-t border-border/50 pt-6">
            <p className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground">
              Top locks
            </p>
            <ul className="space-y-3">
              {topEchoes.map((e) => (
                <li key={e.id} className="text-sm leading-snug">
                  <span className="text-primary font-bold tabular-nums mr-2">{e.lockScore}</span>
                  {e.isPick ? <Star className="inline h-3 w-3 text-amber-400 mr-1" /> : null}
                  <span className="text-muted-foreground">
                    {e.authorName || 'anon'} · {e.lockLabel}
                  </span>
                  <p className="mt-0.5">“{e.text}”</p>
                  <button
                    type="button"
                    className="text-[10px] uppercase tracking-widest text-primary/80 mt-1"
                    onClick={() => {
                      setParentEchoId(e.id);
                      setResult(null);
                      toast({ title: 'Branching from this echo' });
                    }}
                  >
                    Answer from here
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}

        <p className="text-[10px] text-muted-foreground leading-relaxed border-t border-border/50 pt-6">
          No ownership by submitting. Display only until Artist Pick (credit) or Clear for release (optional
          split). No music gen. No audio stored on Bar 4 Bar — embeds are external links only.
        </p>

        {user?.id === lock.ownerId && (
          <Button asChild variant="outline" className="w-full">
            <Link href={`/lock/${id}/manage`}>Manage LOCK</Link>
          </Button>
        )}
      </main>
    </div>
  );
}
