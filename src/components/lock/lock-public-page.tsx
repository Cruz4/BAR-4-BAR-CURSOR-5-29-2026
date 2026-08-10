'use client';

import Link from 'next/link';
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { EmbedPlayer } from '@/components/profile/embed-player';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { isLockEnabled, LOCK_HOUSE_ID, lockPath } from '@/lib/lock-feature';
import { persistLockHandoff } from '@/lib/lock/session';
import { persistDemoLines } from '@/lib/demo-session';
import type { LockDoc, LockEcho } from '@/lib/lock/types';
import { buildLoginUrl } from '@/lib/login-links';
import { auth } from '@/lib/firebase/client/firebase';
import { LockPlate, LockShell } from '@/components/lock/lock-shell';
import { LockVersePath } from '@/components/lock/lock-verse-path';
import { cn } from '@/lib/utils';
import {
  ancestryPath,
  indexEchoes,
  tipEchoId,
  trimPathTo,
  LOCK_SEED_NODE_ID,
  type LockPathLine,
} from '@/lib/lock/bloodline-tree';
import { GitBranch, PenLine } from 'lucide-react';
import {
  trackLockBloodline,
  trackLockNameCta,
  trackLockOpen,
  trackLockShareCard,
  trackLockSignupCta,
  trackLockStudio,
  trackLockSubmit,
  trackLockTyped,
  trackLockWhereNext,
  trackLockWriteAnother,
} from '@/lib/lock-funnel-client';

type LockPublicPageProps = {
  lockId: string;
  /** Server-passed; when true, skip client bootstrap check. */
  lockEnabled?: boolean;
};

export function LockPublicPage({ lockId, lockEnabled }: LockPublicPageProps) {
  return (
    <Suspense
      fallback={
        <LockShell badge="Finish this bar">
          <div className="flex min-h-[70vh] items-center justify-center text-sm text-zinc-500">
            Loading…
          </div>
        </LockShell>
      }
    >
      <LockPublicPageInner lockId={lockId} lockEnabled={lockEnabled} />
    </Suspense>
  );
}

function LockPublicPageInner({ lockId, lockEnabled }: LockPublicPageProps) {
  const router = useRouter();
  const { user } = useAuth();
  const { toast } = useToast();
  const enabled = lockEnabled === true || isLockEnabled();
  const id = lockId === 'house' ? LOCK_HOUSE_ID : lockId;

  const [lock, setLock] = useState<LockDoc | null>(null);
  const [topEchoes, setTopEchoes] = useState<LockEcho[]>([]);
  const [allEchoes, setAllEchoes] = useState<LockEcho[]>([]);
  const [loading, setLoading] = useState(true);
  const [bar, setBar] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [result, setResult] = useState<LockEcho | null>(null);
  const [parentEchoId, setParentEchoId] = useState<string | null>(null);
  const [watching, setWatching] = useState(false);
  const [path, setPath] = useState<LockPathLine[]>([]);
  const cardRef = useRef<HTMLDivElement>(null);
  const composerRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
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

  const loadBloodline = useCallback(async () => {
    try {
      const res = await fetch(`/api/lock/${encodeURIComponent(id)}/bloodline`);
      if (!res.ok) return;
      const data = await res.json();
      setAllEchoes(data.echoes || []);
    } catch {
      /* keep topEchoes-only fallback */
    }
  }, [id]);

  useEffect(() => {
    if (enabled) void load();
  }, [enabled, load]);

  useEffect(() => {
    if (enabled && lock) void loadBloodline();
  }, [enabled, lock, loadBloodline]);

  useEffect(() => {
    if (!enabled || !lock) return;
    trackLockOpen(id, Boolean(lock.isHouse));
  }, [enabled, lock, id]);

  useEffect(() => {
    if (loading || result || !lock || lock.status !== 'open') return;
    const t = window.setTimeout(() => composerRef.current?.focus(), 120);
    return () => window.clearTimeout(t);
  }, [loading, result, lock]);

  const signupHref = useMemo(() => {
    return buildLoginUrl({
      mode: 'signup',
      next: '/',
      intent: 'lock',
    });
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const branch = new URLSearchParams(window.location.search).get('branch');
    if (branch) setParentEchoId(branch);
  }, []);

  const treeEchoes = allEchoes.length > 0 ? allEchoes : topEchoes;
  const index = useMemo(() => indexEchoes(treeEchoes), [treeEchoes]);

  // Keep path in sync with parentEchoId + lock seed
  useEffect(() => {
    if (!lock) return;
    setPath(ancestryPath(parentEchoId, index, lock.seedBar));
  }, [lock, parentEchoId, index]);

  const answerFrom = (echo: LockEcho) => {
    setParentEchoId(echo.id);
    setResult(null);
    toast({
      title: 'Replying on this strain',
      description: 'Your next line continues from their bar — prior lines stay above.',
    });
    requestAnimationFrame(() => {
      composerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      composerRef.current?.focus();
    });
  };

  const clearBranch = () => {
    setParentEchoId(null);
    toast({ title: 'Back to the unfinished bar' });
  };

  const onPathSelect = (lineId: string) => {
    if (lineId === LOCK_SEED_NODE_ID) {
      clearBranch();
      return;
    }
    setParentEchoId(lineId);
    setPath((prev) => trimPathTo(prev, lineId));
  };

  const onDropBar = async () => {
    if (!bar.trim() || submitting) return;
    setSubmitting(true);
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      const token = await auth.currentUser?.getIdToken().catch(() => null);
      if (token) headers.Authorization = `Bearer ${token}`;

      const branchTip = tipEchoId(path) || parentEchoId;

      const res = await fetch(`/api/lock/${encodeURIComponent(id)}/echo`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          text: bar,
          parentEchoId: branchTip,
          displayName: user?.displayName || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not save your bar');
      setResult(data.echo);
      persistLockHandoff({
        lockId: id,
        echoId: data.echo.id,
        text: data.echo.text,
        lockScore: data.echo.lockScore,
      });
      trackLockSubmit({
        lockId: id,
        lockScore: data.echo.lockScore,
        branched: Boolean(branchTip),
        echoCount: lock?.echoCount,
      });
      setBar('');
      void load();
      void loadBloodline();
    } catch (e) {
      toast({
        variant: 'destructive',
        title: 'Could not save',
        description: e instanceof Error ? e.message : 'Try again',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const onWatch = async () => {
    trackLockNameCta(id, user ? 'watch_named' : 'signup_name');
    if (!user || !result) {
      trackLockSignupCta(id, 'name_echo');
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
      setWatching(true);
      toast({
        title: 'Name saved',
        description: 'You’ll get Activity when someone replies after you or you get picked.',
      });
    } catch (e) {
      toast({
        variant: 'destructive',
        title: 'Could not save name',
        description: e instanceof Error ? e.message : 'Try again',
      });
    }
  };

  const deleteReply = async (echoId: string) => {
    if (!user || deletingId) return;
    setDeletingId(echoId);
    try {
      const token = await auth.currentUser?.getIdToken();
      if (!token) throw new Error('Sign in required');
      const res = await fetch(
        `/api/lock/${encodeURIComponent(id)}/echo/${encodeURIComponent(echoId)}`,
        {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Delete failed');
      if (result?.id === echoId) setResult(null);
      if (parentEchoId === echoId) setParentEchoId(null);
      toast({ title: 'Reply removed' });
      void load();
      void loadBloodline();
    } catch (e) {
      toast({
        variant: 'destructive',
        title: 'Could not delete',
        description: e instanceof Error ? e.message : 'Try again',
      });
    } finally {
      setDeletingId(null);
    }
  };

  const canDelete = (echo: LockEcho) => {
    if (!user) return false;
    if (echo.authorId && echo.authorId === user.id) return true;
    if (lock && lock.ownerId === user.id && lock.ownerId !== 'system') return true;
    return false;
  };

  const openStudio = () => {
    if (!lock || !result) return;
    trackLockStudio(id);
    const prior = path.filter((l) => !l.isSeed).map((l) => l.text);
    persistDemoLines([lock.seedBar, ...prior, result.text].slice(0, 16));
    router.push('/try');
  };

  const downloadCard = async () => {
    if (!cardRef.current || !result || !lock) return;
    try {
      const { downloadCanvasPng, captureFoilNodeToCanvas } = await import(
        '@/lib/gamification/capture-foil-node'
      );
      const canvas = await captureFoilNodeToCanvas(cardRef.current);
      downloadCanvasPng(canvas, `finish-bar-${id}-${result.id}.png`);
      trackLockShareCard(id, result.lockScore);
      toast({ title: 'Share card downloaded' });
    } catch {
      try {
        await navigator.clipboard.writeText(
          `Fit ${result.lockScore} — reply on ${lock.ownerName}'s unfinished bar\n“${result.text}”\n${typeof window !== 'undefined' ? window.location.origin : ''}${lockPath(id)}`
        );
        trackLockShareCard(id, result.lockScore);
        toast({ title: 'Copied share text' });
      } catch {
        toast({ variant: 'destructive', title: 'Share failed' });
      }
    }
  };

  if (!enabled) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0a0c10] text-sm text-zinc-500">
        This feature is off right now.
      </div>
    );
  }

  if (loading) {
    return (
      <LockShell badge="Finish this bar">
        <div className="flex min-h-[70vh] items-center justify-center text-sm text-zinc-500">
          Loading…
        </div>
      </LockShell>
    );
  }

  if (!lock) {
    return (
      <LockShell badge="Finish this bar">
        <div className="flex min-h-[70vh] flex-col items-center justify-center gap-4 p-6 text-center">
          <p className="text-sm text-zinc-400">This cast wasn’t found.</p>
          <Link href="/" className="text-sm text-primary hover:underline">
            Back home
          </Link>
        </div>
      </LockShell>
    );
  }

  const isClosed = lock.status !== 'open';
  const ownerHome = lock.ownerSlug ? `/profile/${lock.ownerSlug}` : null;
  const named = watching || Boolean(user && result?.authorName);
  const houseLabel = lock.isHouse ? 'House prompt · Bar 4 Bar' : `@${lock.ownerSlug || lock.ownerName}`;
  const branched = Boolean(parentEchoId && path.length > 1);

  return (
    <LockShell
      badge={isClosed ? 'Closed' : 'Finish this bar'}
      right={
        <Link
          href={`/lock/${id}/bloodline`}
          onClick={() => trackLockBloodline(id)}
          className="hidden items-center gap-1.5 text-zinc-400 transition-colors hover:text-primary sm:inline-flex"
        >
          <GitBranch className="h-3.5 w-3.5" />
          Verse Tree
        </Link>
      }
    >
      <main className="relative mx-auto max-w-xl px-4 pb-16 sm:px-6">
        {/* Atmosphere accent behind hero */}
        <div
          aria-hidden
          className="pointer-events-none absolute -top-8 left-1/2 h-56 w-[120%] -translate-x-1/2 bg-[radial-gradient(ellipse_at_center,hsl(var(--primary)/0.18),transparent_65%)]"
        />

        {!result ? (
          <div className="relative space-y-8 py-10 sm:py-14">
            <div className="space-y-4">
              <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-primary/90">
                {houseLabel}
                {lock.echoCount > 0 ? (
                  <span className="font-normal text-zinc-600"> · {lock.echoCount} replies</span>
                ) : null}
              </p>
              <h1 className="font-headline text-3xl font-bold leading-[1.05] tracking-tight text-zinc-50 sm:text-4xl md:text-[2.75rem]">
                Finish this bar.
              </h1>
              <p className="max-w-md text-sm leading-relaxed text-zinc-400">
                Drop the next line. It joins the Verse Tree with a Fit score. Explore every branch
                people wrote after each other — or answer from the tip of a strain.
              </p>
              {isClosed ? (
                <p className="text-sm text-rose-400/90">This cast is closed — no new replies.</p>
              ) : null}
            </div>

            {branched ? (
              <LockVersePath path={path} onSelectLine={onPathSelect} compact />
            ) : (
              <LockPlate tone="primary" className="relative overflow-hidden p-5 sm:p-6">
                <div
                  aria-hidden
                  className="pointer-events-none absolute -right-8 -top-10 h-32 w-32 rounded-full bg-primary/20 blur-3xl"
                />
                <p className="relative text-[10px] font-bold uppercase tracking-[0.22em] text-primary/80">
                  The unfinished bar
                </p>
                <p className="relative mt-3 font-headline text-xl leading-snug tracking-tight text-zinc-50 sm:text-2xl">
                  {lock.seedBar}
                </p>
              </LockPlate>
            )}

            {lock.embedUrl ? (
              <div className="overflow-hidden rounded-lg border border-white/[0.08] opacity-90">
                <EmbedPlayer url={lock.embedUrl} title="bed" />
              </div>
            ) : null}

            {!isClosed ? (
              <div className="space-y-3">
                <label
                  htmlFor="lock-bar"
                  className="flex items-center gap-2 text-sm font-medium text-zinc-200"
                >
                  <PenLine className="h-3.5 w-3.5 text-primary" />
                  {branched ? 'Your next bar on this strain' : 'Your next bar'}
                </label>
                <textarea
                  ref={composerRef}
                  id="lock-bar"
                  value={bar}
                  rows={3}
                  disabled={submitting}
                  placeholder="Go ahead — give it a shot…"
                  className="w-full resize-none rounded-lg border border-white/15 bg-black/50 px-3 py-3 text-base leading-relaxed text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-primary/40"
                  onChange={(e) => {
                    const next = e.target.value;
                    setBar(next);
                    if (next.trim()) trackLockTyped(id);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                      e.preventDefault();
                      void onDropBar();
                    }
                  }}
                />
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs text-zinc-600">Ctrl/⌘ + Enter to send</p>
                  <button
                    type="button"
                    disabled={!bar.trim() || submitting}
                    onClick={() => void onDropBar()}
                    className={cn(
                      'rounded-md px-5 py-2.5 text-sm font-bold transition-colors',
                      bar.trim() && !submitting
                        ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                        : 'pointer-events-none bg-zinc-800 text-zinc-500'
                    )}
                  >
                    {submitting ? 'Saving…' : 'Drop your bar'}
                  </button>
                </div>
                {branched ? (
                  <button
                    type="button"
                    onClick={clearBranch}
                    className="text-xs text-zinc-500 hover:text-zinc-300"
                  >
                    Answer the unfinished bar instead
                  </button>
                ) : null}
              </div>
            ) : null}

            <Link
              href={`/lock/${id}/bloodline`}
              onClick={() => trackLockBloodline(id)}
              className="flex items-center justify-between gap-3 rounded-lg border border-primary/30 bg-primary/[0.07] px-4 py-3 transition-colors hover:border-primary/50 hover:bg-primary/[0.12]"
            >
              <span className="flex items-center gap-2 text-sm font-medium text-zinc-100">
                <GitBranch className="h-4 w-4 text-primary" />
                Explore the Verse Tree
              </span>
              <span className="text-[10px] font-bold uppercase tracking-wider text-primary/80">
                Paths →
              </span>
            </Link>

            {topEchoes.length > 0 ? (
              <section className="space-y-4 border-t border-white/[0.08] pt-6">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="text-sm font-medium text-zinc-200">Recent replies</h2>
                  <Link
                    href={`/lock/${id}/bloodline`}
                    onClick={() => trackLockBloodline(id)}
                    className="text-xs text-primary hover:underline"
                  >
                    Open tree
                  </Link>
                </div>
                <ul className="space-y-4">
                  {topEchoes.map((e) => {
                    const selected = parentEchoId === e.id;
                    return (
                      <li key={e.id} className="space-y-1.5">
                        <p className="text-xs text-zinc-500">
                          <span className="tabular-nums text-primary/90">Fit {e.lockScore}</span>
                          {e.isPick ? ' · picked' : ''}
                          {' · '}
                          {e.authorName || 'Anonymous'}
                        </p>
                        <p
                          className={cn(
                            'text-sm leading-snug text-zinc-300',
                            selected && 'text-amber-100'
                          )}
                        >
                          {e.text}
                        </p>
                        <div className="flex flex-wrap gap-3">
                          {!isClosed ? (
                            <button
                              type="button"
                              className="text-xs text-zinc-500 hover:text-primary"
                              onClick={() => (selected ? clearBranch() : answerFrom(e))}
                            >
                              {selected ? 'Cancel reply' : 'Continue from here'}
                            </button>
                          ) : null}
                          {canDelete(e) ? (
                            <button
                              type="button"
                              disabled={deletingId === e.id}
                              className="text-xs text-rose-400/80 hover:text-rose-300"
                              onClick={() => void deleteReply(e.id)}
                            >
                              {deletingId === e.id ? 'Removing…' : 'Delete'}
                            </button>
                          ) : null}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </section>
            ) : (
              <p className="pt-2 text-sm text-zinc-600">No replies yet — be the first.</p>
            )}

            {user?.id === lock.ownerId ? (
              <Link
                href={`/lock/${id}/manage`}
                className="inline-block text-xs text-zinc-500 hover:text-zinc-300"
              >
                Manage this cast
              </Link>
            ) : null}
          </div>
        ) : (
          <div className="space-y-8 py-12 sm:py-16">
            <div
              ref={cardRef}
              className="space-y-4 rounded-lg border border-primary/30 bg-black/50 p-6"
            >
              <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">
                Your reply · {lock.ownerName}
              </p>
              {path.length > 1 ? (
                <div className="space-y-1 border-l border-white/10 pl-3">
                  {path.map((line) => (
                    <p
                      key={line.id}
                      className={cn(
                        'text-sm leading-snug',
                        line.isSeed ? 'text-zinc-600' : 'text-zinc-500'
                      )}
                    >
                      {line.text}
                    </p>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-zinc-600 line-through decoration-zinc-800">
                  {lock.seedBar}
                </p>
              )}
              <p className="text-lg leading-snug text-zinc-100">{result.text}</p>
              <div className="pt-2">
                <p className="font-headline text-5xl tracking-tight text-primary tabular-nums">
                  {result.lockScore}
                </p>
                <p className="mt-1 text-xs text-zinc-500">
                  Fit score — how close your rhyme sits to this bar
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <button
                type="button"
                onClick={openStudio}
                className="w-full rounded-md bg-primary px-4 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90"
              >
                Keep writing in Studio
              </button>
              <button
                type="button"
                onClick={() => void downloadCard()}
                className="w-full rounded-md border border-white/15 px-4 py-3 text-sm text-zinc-200 hover:border-primary/40 hover:text-primary"
              >
                Share your reply
              </button>
              {!named ? (
                <button
                  type="button"
                  onClick={() => void onWatch()}
                  className="w-full py-2 text-sm text-zinc-400 hover:text-zinc-200"
                >
                  {user ? 'Save your name on this reply' : 'Sign in to put your name on this reply'}
                </button>
              ) : (
                <p className="text-center text-xs text-primary/80">
                  Name saved · watching for Activity
                </p>
              )}
            </div>

            <div className="space-y-2 border-t border-white/[0.08] pt-6">
              <p className="mb-2 text-xs uppercase tracking-[0.18em] text-zinc-600">Also</p>
              <NavRow
                label="Verse Tree"
                href={`/lock/${id}/bloodline`}
                onNavigate={() => {
                  trackLockWhereNext(id, 'bloodline');
                  trackLockBloodline(id);
                }}
              />
              <NavRow label="The Scene" href="/" onNavigate={() => trackLockWhereNext(id, 'scene')} />
              {ownerHome ? (
                <NavRow
                  label="Artist Home"
                  href={ownerHome}
                  onNavigate={() => trackLockWhereNext(id, 'artist_home')}
                />
              ) : null}
              {canDelete(result) ? (
                <button
                  type="button"
                  disabled={deletingId === result.id}
                  onClick={() => void deleteReply(result.id)}
                  className="py-1 text-sm text-rose-400/80 hover:text-rose-300"
                >
                  Delete my reply
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => {
                  trackLockWriteAnother(id);
                  setResult(null);
                  setParentEchoId(null);
                  setWatching(false);
                }}
                className="py-1 text-sm text-zinc-500 hover:text-zinc-300"
              >
                Write another
              </button>
            </div>
          </div>
        )}
      </main>
    </LockShell>
  );
}

function NavRow({
  href,
  label,
  onNavigate,
}: {
  href: string;
  label: string;
  onNavigate?: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={() => onNavigate?.()}
      className="block py-1 text-sm text-zinc-300 transition-colors hover:text-primary"
    >
      {label}
    </Link>
  );
}
