'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { LOCK_HOUSE_ID } from '@/lib/lock-feature';
import type { LockDoc, LockEcho } from '@/lib/lock/types';
import { LockKicker, LockShell } from '@/components/lock/lock-shell';
import { LockVersePath } from '@/components/lock/lock-verse-path';
import { LockVerseForks } from '@/components/lock/lock-verse-forks';
import { trackLockBloodline } from '@/lib/lock-funnel-client';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { auth } from '@/lib/firebase/client/firebase';
import {
  LOCK_SEED_NODE_ID,
  ancestryPath,
  appendFork,
  childrenOf,
  indexEchoes,
  sortEchoesForBrowse,
  tipEchoId,
  trimPathTo,
  type LockPathLine,
} from '@/lib/lock/bloodline-tree';
import { PenLine } from 'lucide-react';

type Filter = 'tree' | 'new' | 'score' | 'pick';

const FORK_PAGE = 8;

export default function LockBloodlinePageInner() {
  const params = useParams();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const { toast } = useToast();
  const raw = typeof params?.lockId === 'string' ? params.lockId : LOCK_HOUSE_ID;
  const id = raw === 'house' ? LOCK_HOUSE_ID : raw;

  const [lock, setLock] = useState<LockDoc | null>(null);
  const [echoes, setEchoes] = useState<LockEcho[]>([]);
  const [filter, setFilter] = useState<Filter>('tree');
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [path, setPath] = useState<LockPathLine[]>([]);
  const [forkLimit, setForkLimit] = useState(FORK_PAGE);
  const [pathReady, setPathReady] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/lock/${encodeURIComponent(id)}/bloodline`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      setLock(data.lock);
      setEchoes(data.echoes || []);
    } catch {
      setLock(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    setPathReady(false);
  }, [id]);

  useEffect(() => {
    if (lock) trackLockBloodline(id);
  }, [lock, id]);

  const index = useMemo(() => indexEchoes(echoes), [echoes]);

  // Seed path once when data is ready; honor ?branch=. Do not clobber after user walks forks.
  useEffect(() => {
    if (!lock || loading || pathReady) return;
    const branch = searchParams?.get('branch')?.trim() || null;
    if (branch && echoes.length === 0) return;
    setPath(
      ancestryPath(branch && index.byId.has(branch) ? branch : null, index, lock.seedBar)
    );
    setPathReady(true);
    setForkLimit(FORK_PAGE);
  }, [lock, loading, index, searchParams, pathReady, echoes.length]);

  const tipId = tipEchoId(path);
  const forksResult = useMemo(
    () => childrenOf(tipId, index, forkLimit),
    [tipId, index, forkLimit]
  );

  const browseList = useMemo(() => {
    if (filter === 'tree' || !lock) return [];
    return sortEchoesForBrowse(echoes, filter, lock.artistPickEchoId);
  }, [echoes, filter, lock]);

  const jumpToEcho = (echoId: string) => {
    if (!lock) return;
    setPath(ancestryPath(echoId, index, lock.seedBar));
    setFilter('tree');
    setForkLimit(FORK_PAGE);
  };

  const onSelectLine = (lineId: string) => {
    if (lineId === LOCK_SEED_NODE_ID) {
      if (!lock) return;
      setPath(ancestryPath(null, index, lock.seedBar));
      setForkLimit(FORK_PAGE);
      return;
    }
    setPath((prev) => trimPathTo(prev, lineId));
    setForkLimit(FORK_PAGE);
  };

  const onPickFork = (echo: LockEcho) => {
    setPath((prev) => appendFork(prev, echo));
    setForkLimit(FORK_PAGE);
  };

  const canDelete = (echo: LockEcho) => {
    if (!user || !lock) return false;
    if (echo.authorId && echo.authorId === user.id) return true;
    if (lock.ownerId === user.id && lock.ownerId !== 'system') return true;
    return false;
  };

  const deleteReply = async (echoId: string) => {
    if (!user || deletingId) return;
    setDeletingId(echoId);
    try {
      const token = await auth.currentUser?.getIdToken();
      if (!token) throw new Error('Sign in required');
      const res = await fetch(
        `/api/lock/${encodeURIComponent(id)}/echo/${encodeURIComponent(echoId)}`,
        { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } }
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Delete failed');
      toast({ title: 'Reply removed' });
      void load();
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

  const replyHref = tipId
    ? `/lock/${id}?branch=${encodeURIComponent(tipId)}`
    : `/lock/${id}`;

  if (loading) {
    return (
      <LockShell badge="Verse Tree">
        <div className="flex min-h-[50vh] items-center justify-center text-sm text-muted-foreground">
          Loading the strain…
        </div>
      </LockShell>
    );
  }

  if (!lock) {
    return (
      <LockShell badge="Verse Tree">
        <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3">
          <p>Cast not found</p>
          <Button asChild>
            <Link href="/">Home</Link>
          </Button>
        </div>
      </LockShell>
    );
  }

  return (
    <LockShell
      badge="Verse Tree"
      right={
        <Button asChild variant="ghost" size="sm" className="h-7 px-2 text-xs">
          <Link href={`/lock/${id}`}>← Write</Link>
        </Button>
      }
    >
      <main className="mx-auto max-w-lg space-y-6 px-4 py-8 pb-24">
        <div className="space-y-2">
          <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-primary/90">
            The Strain
          </p>
          <h1 className="font-headline text-3xl tracking-tight sm:text-4xl">Verse Tree</h1>
          <p className="max-w-md text-sm leading-relaxed text-zinc-400">
            Walk the branches people wrote after each other. Your path is the song so far — pick a
            fork to go deeper, then write the next bar from the tip.
          </p>
          <p className="text-xs text-zinc-600">Started by {lock.ownerName}</p>
        </div>

        <div className="flex flex-wrap gap-2">
          {(
            [
              ['tree', 'Tree'],
              ['new', 'Newest'],
              ['score', 'Best fit'],
              ['pick', 'Artist pick'],
            ] as const
          ).map(([key, label]) => (
            <Button
              key={key}
              type="button"
              size="sm"
              variant={filter === key ? 'default' : 'outline'}
              className="text-xs"
              onClick={() => setFilter(key)}
            >
              {label}
            </Button>
          ))}
        </div>

        {filter === 'tree' ? (
          <>
            <LockVersePath path={path} onSelectLine={onSelectLine} />

            <LockVerseForks
              forks={forksResult.children}
              hasMore={forksResult.hasMore}
              onPick={onPickFork}
              onShowMore={() => setForkLimit((n) => n + FORK_PAGE)}
            />

            {lock.status === 'open' ? (
              <div className="sticky bottom-4 z-20">
                <Button
                  asChild
                  size="lg"
                  className="w-full gap-2 font-bold shadow-lg shadow-black/40"
                >
                  <Link href={replyHref}>
                    <PenLine className="h-4 w-4" />
                    {tipId ? 'Write next from this tip' : 'Write the first reply'}
                  </Link>
                </Button>
              </div>
            ) : (
              <p className="text-center text-sm text-rose-400/80">This cast is closed.</p>
            )}
          </>
        ) : (
          <ul className="space-y-2.5">
            {browseList.map((e) => (
              <li key={e.id}>
                <button type="button" className="w-full text-left" onClick={() => jumpToEcho(e.id)}>
                  <div className="rounded-lg border border-white/[0.1] bg-white/[0.03] p-3.5 transition-colors hover:border-primary/40 hover:bg-primary/[0.05]">
                    <div className="mb-1.5 flex flex-wrap items-center gap-2 text-xs text-zinc-500">
                      <span className="font-semibold tabular-nums text-primary">
                        Fit {e.lockScore}
                      </span>
                      {e.isPick ? <span className="text-amber-300">Pick</span> : null}
                      <span>{e.authorName || 'Anonymous'}</span>
                    </div>
                    <p className="text-sm leading-snug text-zinc-100">{e.text}</p>
                    <p className="mt-2 text-[10px] font-bold uppercase tracking-wider text-primary/70">
                      Open in Verse Tree →
                    </p>
                  </div>
                </button>
                <div className="mt-1 flex flex-wrap gap-3 px-1">
                  {lock.status === 'open' ? (
                    <Link
                      href={`/lock/${id}?branch=${encodeURIComponent(e.id)}`}
                      className="text-xs text-primary hover:underline"
                    >
                      Reply from here
                    </Link>
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
            ))}
            {browseList.length === 0 ? (
              <p className="text-sm text-muted-foreground">No replies in this filter yet.</p>
            ) : null}
          </ul>
        )}

        <LockKicker className="pt-2">
          <Link href="/" className="text-primary hover:underline">
            Back home →
          </Link>
        </LockKicker>
      </main>
    </LockShell>
  );
}
