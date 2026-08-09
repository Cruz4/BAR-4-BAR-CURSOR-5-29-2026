'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { isLockEnabled, LOCK_HOUSE_ID } from '@/lib/lock-feature';
import type { LockDoc, LockEcho } from '@/lib/lock/types';
import { Star } from 'lucide-react';

type Filter = 'new' | 'score' | 'pick' | 'wild';

export default function LockBloodlinePage() {
  const params = useParams();
  const router = useRouter();
  const raw = typeof params?.lockId === 'string' ? params.lockId : LOCK_HOUSE_ID;
  const id = raw === 'house' ? LOCK_HOUSE_ID : raw;
  const enabled = isLockEnabled();

  const [lock, setLock] = useState<LockDoc | null>(null);
  const [echoes, setEchoes] = useState<LockEcho[]>([]);
  const [filter, setFilter] = useState<Filter>('score');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!enabled) router.replace('/');
  }, [enabled, router]);

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
    if (enabled) void load();
  }, [enabled, load]);

  const sorted = useMemo(() => {
    const list = [...echoes];
    if (filter === 'pick') return list.filter((e) => e.isPick || e.id === lock?.artistPickEchoId);
    if (filter === 'wild') return list.sort((a, b) => a.lockScore - b.lockScore);
    if (filter === 'new') return list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return list.sort((a, b) => b.lockScore - a.lockScore);
  }, [echoes, filter, lock?.artistPickEchoId]);

  if (!enabled || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center font-code text-sm text-muted-foreground">
        Loading bloodline…
      </div>
    );
  }

  if (!lock) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3">
        <p>Bloodline not found</p>
        <Button asChild>
          <Link href="/">Home</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background font-code">
      <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur px-4 py-3 flex items-center justify-between">
        <Button asChild variant="ghost" size="sm">
          <Link href={`/lock/${id}`}>← LOCK</Link>
        </Button>
        <span className="text-[10px] uppercase tracking-widest font-bold">Bloodline</span>
        <span className="text-[10px] text-muted-foreground">{lock.echoCount} echoes</span>
      </header>

      <main className="mx-auto max-w-lg px-4 py-8 space-y-6">
        <div>
          <h1 className="font-headline text-3xl">Bloodline</h1>
          <p className="text-sm text-muted-foreground mt-1">Started by {lock.ownerName}</p>
          <p className="text-sm mt-3 border-l-2 border-primary/40 pl-3">“{lock.seedBar}”</p>
        </div>

        <div className="flex flex-wrap gap-2">
          {(
            [
              ['score', 'Closest LOCK'],
              ['new', 'Newest'],
              ['pick', 'Artist Pick'],
              ['wild', 'Wild flips'],
            ] as const
          ).map(([key, label]) => (
            <Button
              key={key}
              type="button"
              size="sm"
              variant={filter === key ? 'default' : 'outline'}
              className="text-[10px] uppercase"
              onClick={() => setFilter(key)}
            >
              {label}
            </Button>
          ))}
        </div>

        <ul className="space-y-4">
          {sorted.map((e) => (
            <li key={e.id} className="border border-border/50 rounded-lg p-3 space-y-1">
              <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-muted-foreground">
                <span className="text-primary font-bold tabular-nums text-sm">{e.lockScore}</span>
                {e.isPick ? <Star className="h-3.5 w-3.5 text-amber-400" /> : null}
                <span>{e.authorName || 'anon'}</span>
                <span>· {e.lockLabel}</span>
              </div>
              <p className="text-sm leading-snug">“{e.text}”</p>
              {e.parentEchoId ? (
                <p className="text-[10px] text-muted-foreground">branched from {e.parentEchoId.slice(0, 8)}…</p>
              ) : null}
              <Button asChild variant="ghost" size="sm" className="h-7 px-0 text-[10px] uppercase">
                <Link href={`/lock/${id}?branch=${e.id}`}>Answer from here</Link>
              </Button>
            </li>
          ))}
          {sorted.length === 0 ? (
            <p className="text-sm text-muted-foreground">No echoes in this filter yet.</p>
          ) : null}
        </ul>
      </main>
    </div>
  );
}
