'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { LockShell } from '@/components/lock/lock-shell';
import { PublishOpenLockPanel } from '@/components/lock/publish-open-lock-panel';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { auth } from '@/lib/firebase/client/firebase';
import { buildLoginUrl } from '@/lib/login-links';
import type { LockContribution, LockDoc } from '@/lib/lock/types';
import { cn } from '@/lib/utils';

export default function LockDeskPage() {
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [owned, setOwned] = useState<LockDoc[]>([]);
  const [contributed, setContributed] = useState<LockContribution[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user?.id) {
      setOwned([]);
      setContributed([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const token = await auth.currentUser?.getIdToken();
      const res = await fetch(`/api/lock/mine?userId=${encodeURIComponent(user.id)}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        cache: 'no-store',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not load');
      setOwned(Array.isArray(data.owned) ? data.owned : []);
      setContributed(Array.isArray(data.contributed) ? data.contributed : []);
    } catch (e) {
      toast({
        variant: 'destructive',
        title: 'Could not load your desk',
        description: e instanceof Error ? e.message : 'Try again',
      });
    } finally {
      setLoading(false);
    }
  }, [user?.id, toast]);

  useEffect(() => {
    if (authLoading) return;
    void load();
  }, [authLoading, load]);

  const deleteReply = async (lockId: string, echoId: string) => {
    if (!user || deleting) return;
    const key = `${lockId}_${echoId}`;
    setDeleting(key);
    try {
      const token = await auth.currentUser?.getIdToken();
      if (!token) throw new Error('Sign in required');
      const res = await fetch(
        `/api/lock/${encodeURIComponent(lockId)}/echo/${encodeURIComponent(echoId)}`,
        { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } }
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Delete failed');
      setContributed((prev) => prev.filter((c) => !(c.lockId === lockId && c.echoId === echoId)));
      toast({ title: 'Reply removed' });
    } catch (e) {
      toast({
        variant: 'destructive',
        title: 'Could not delete',
        description: e instanceof Error ? e.message : 'Try again',
      });
    } finally {
      setDeleting(null);
    }
  };

  const signInHref = buildLoginUrl({
    mode: 'signin',
    next: '/lock/desk',
    intent: 'lock',
  });

  return (
    <LockShell
      badge="Your desk"
      right={
        <Link href="/" className="text-zinc-500 transition-colors hover:text-zinc-300">
          The Scene
        </Link>
      }
    >
      <main className="mx-auto max-w-xl px-4 py-10 sm:px-6 sm:py-14">
        <div className="mb-8 space-y-2">
          <h1 className="font-headline text-3xl font-bold tracking-tight text-zinc-50 sm:text-4xl">
            Finish this bar
          </h1>
          <p className="text-sm text-zinc-400">
            Lines you published, and lines you put your name on.
          </p>
        </div>

        {authLoading ? (
          <p className="text-sm text-zinc-500">Loading…</p>
        ) : !user ? (
          <div className="space-y-4 rounded-xl border border-white/10 bg-black/40 p-5">
            <p className="text-sm text-zinc-300">Sign in to manage your unfinished lines and replies.</p>
            <Button asChild className="font-bold">
              <Link href={signInHref}>Sign in</Link>
            </Button>
          </div>
        ) : (
          <div className="space-y-8">
            <section className="space-y-3 rounded-xl border border-primary/25 bg-primary/[0.06] p-4">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">
                Publish another
              </p>
              <PublishOpenLockPanel
                onPublished={() => {
                  void load();
                }}
              />
              <p className="text-[11px] text-zinc-500">
                Pin which line shows first on your page in{' '}
                <Link href="/profile/customize" className="text-primary hover:underline">
                  Edit Public Page
                </Link>
                .
              </p>
            </section>

            <Tabs defaultValue="mine" className="w-full">
              <TabsList className="grid w-full grid-cols-2 bg-white/5">
                <TabsTrigger value="mine">Mine ({owned.length})</TabsTrigger>
                <TabsTrigger value="replied">I replied ({contributed.length})</TabsTrigger>
              </TabsList>

              <TabsContent value="mine" className="mt-4 space-y-3">
                {loading ? (
                  <p className="text-sm text-zinc-500">Loading…</p>
                ) : owned.length === 0 ? (
                  <p className="text-sm text-zinc-500">No casts yet — publish one above.</p>
                ) : (
                  owned.map((lock) => (
                    <article
                      key={lock.id}
                      className="space-y-2 rounded-xl border border-white/10 bg-black/40 p-4"
                    >
                      <p
                        className={cn(
                          'text-[9px] font-bold uppercase tracking-[0.18em]',
                          lock.status === 'open' ? 'text-emerald-400/90' : 'text-zinc-500'
                        )}
                      >
                        {lock.status === 'open' ? 'Open' : 'Closed'}
                        {' · '}
                        {lock.echoCount} {lock.echoCount === 1 ? 'reply' : 'replies'}
                      </p>
                      <p className="font-headline text-base font-bold leading-snug text-zinc-50">
                        {lock.seedBar}
                      </p>
                      <div className="flex flex-wrap gap-3 pt-1 text-xs">
                        <Link href={`/lock/${lock.id}`} className="font-bold text-primary hover:underline">
                          Open
                        </Link>
                        <Link
                          href={`/lock/${lock.id}/manage`}
                          className="font-bold text-zinc-300 hover:text-white hover:underline"
                        >
                          Manage
                        </Link>
                        <Link
                          href={`/lock/${lock.id}/bloodline`}
                          className="text-zinc-500 hover:text-zinc-300 hover:underline"
                        >
                          All paths
                        </Link>
                      </div>
                    </article>
                  ))
                )}
              </TabsContent>

              <TabsContent value="replied" className="mt-4 space-y-3">
                {loading ? (
                  <p className="text-sm text-zinc-500">Loading…</p>
                ) : contributed.length === 0 ? (
                  <p className="text-sm text-zinc-500">
                    No named replies yet. Drop a line on someone’s unfinished bar and put your name
                    on it.
                  </p>
                ) : (
                  contributed.map((c) => {
                    const key = `${c.lockId}_${c.echoId}`;
                    return (
                      <article
                        key={key}
                        className="space-y-2 rounded-xl border border-white/10 bg-black/40 p-4"
                      >
                        <p className="text-[10px] text-zinc-500">
                          On {c.ownerName}
                          {c.ownerSlug ? (
                            <>
                              {' · '}
                              <Link
                                href={`/profile/${c.ownerSlug}`}
                                className="hover:text-primary hover:underline"
                              >
                                @{c.ownerSlug}
                              </Link>
                            </>
                          ) : null}
                        </p>
                        <p className="text-sm text-zinc-500 line-through decoration-zinc-700">
                          {c.seedBar}
                        </p>
                        <p className="text-sm leading-snug text-zinc-100">{c.text}</p>
                        <p className="text-xs tabular-nums text-primary">Fit {c.lockScore}</p>
                        <div className="flex flex-wrap gap-3 pt-1 text-xs">
                          <Link
                            href={`/lock/${c.lockId}`}
                            className="font-bold text-primary hover:underline"
                          >
                            Open
                          </Link>
                          <button
                            type="button"
                            disabled={deleting === key}
                            onClick={() => void deleteReply(c.lockId, c.echoId)}
                            className="text-rose-400/90 hover:text-rose-300 disabled:opacity-50"
                          >
                            {deleting === key ? 'Removing…' : 'Delete my reply'}
                          </button>
                        </div>
                      </article>
                    );
                  })
                )}
              </TabsContent>
            </Tabs>
          </div>
        )}
      </main>
    </LockShell>
  );
}
