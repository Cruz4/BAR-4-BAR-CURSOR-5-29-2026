'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { LOCK_HOUSE_ID } from '@/lib/lock-feature';
import type { LockDoc, LockEcho } from '@/lib/lock/types';
import { auth } from '@/lib/firebase/client/firebase';
import { Star } from 'lucide-react';

export default function LockManagePage() {
  const params = useParams();
  const { user } = useAuth();
  const { toast } = useToast();
  const raw = typeof params?.lockId === 'string' ? params.lockId : LOCK_HOUSE_ID;
  const id = raw === 'house' ? LOCK_HOUSE_ID : raw;

  const [lock, setLock] = useState<LockDoc | null>(null);
  const [echoes, setEchoes] = useState<LockEcho[]>([]);
  const [clearPercent, setClearPercent] = useState('5');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch(`/api/lock/${encodeURIComponent(id)}/bloodline`);
    const data = await res.json();
    if (res.ok) {
      setLock(data.lock);
      setEchoes(data.echoes || []);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  const pick = async (echoId: string) => {
    if (!user) return;
    setBusy(true);
    try {
      const token = await auth.currentUser?.getIdToken();
      const res = await fetch(`/api/lock/${encodeURIComponent(id)}/pick`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ userId: user.id, echoId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Pick failed');
      toast({ title: 'Artist Pick set' });
      void load();
    } catch (e) {
      toast({
        variant: 'destructive',
        title: 'Pick failed',
        description: e instanceof Error ? e.message : 'Try again',
      });
    } finally {
      setBusy(false);
    }
  };

  const clearRelease = async () => {
    if (!user || !lock?.artistPickEchoId) {
      toast({ variant: 'destructive', title: 'Pick an echo first' });
      return;
    }
    const picked = echoes.find((e) => e.id === lock.artistPickEchoId);
    if (!picked?.authorId) {
      toast({
        variant: 'destructive',
        title: 'Picked echo has no named author',
        description: 'They need to name their echo before clear-for-release.',
      });
      return;
    }
    setBusy(true);
    try {
      const token = await auth.currentUser?.getIdToken();
      const percent = Number.parseFloat(clearPercent);
      const res = await fetch(`/api/lock/${encodeURIComponent(id)}/clear`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          userId: user.id,
          note: 'Cleared for release',
          offers: [
            {
              userId: picked.authorId,
              echoId: picked.id,
              percent: Number.isFinite(percent) ? percent : null,
            },
          ],
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Clear failed');
      toast({ title: 'Clear offer sent' });
      void load();
    } catch (e) {
      toast({
        variant: 'destructive',
        title: 'Clear failed',
        description: e instanceof Error ? e.message : 'Try again',
      });
    } finally {
      setBusy(false);
    }
  };

  if (!lock) {
    return (
      <div className="min-h-screen flex items-center justify-center text-sm text-muted-foreground">
        Loading…
      </div>
    );
  }

  if (user && user.id !== lock.ownerId) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 p-6">
        <p>Only the casting artist can manage this LOCK.</p>
        <Button asChild>
          <Link href={`/lock/${id}`}>Back</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background font-code">
      <header className="sticky top-0 border-b bg-background/80 backdrop-blur px-4 py-3 flex justify-between">
        <Button asChild variant="ghost" size="sm">
          <Link href={`/lock/${id}`}>← LOCK</Link>
        </Button>
        <span className="text-[10px] uppercase tracking-widest font-bold">Manage</span>
      </header>

      <main className="mx-auto max-w-lg px-4 py-8 space-y-6">
        <div>
          <h1 className="font-headline text-3xl">Your Open LOCK</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {lock.echoCount} echoes · {lock.watcherCount} watching
          </p>
          <p className="mt-3 text-sm border-l-2 border-primary/40 pl-3">“{lock.seedBar}”</p>
        </div>

        <ul className="space-y-3">
          {[...echoes]
            .sort((a, b) => b.lockScore - a.lockScore)
            .map((e) => (
              <li key={e.id} className="border rounded-lg p-3 flex gap-3 items-start justify-between">
                <div className="min-w-0">
                  <p className="text-[10px] uppercase text-muted-foreground">
                    <span className="text-primary font-bold">{e.lockScore}</span> ·{' '}
                    {e.authorName || 'anon'}
                    {e.isPick ? (
                      <Star className="inline h-3 w-3 text-amber-400 ml-1" />
                    ) : null}
                  </p>
                  <p className="text-sm mt-1">“{e.text}”</p>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant={e.isPick ? 'default' : 'outline'}
                  disabled={busy}
                  onClick={() => void pick(e.id)}
                >
                  {e.isPick ? 'Picked' : 'Pick'}
                </Button>
              </li>
            ))}
        </ul>

        <div className="border-t pt-6 space-y-3">
          <h2 className="text-[10px] uppercase tracking-widest font-bold">Clear for release</h2>
          <p className="text-xs text-muted-foreground">
            Sends the picked named author a credit/split offer. No ownership until they accept.
          </p>
          <div className="flex gap-2 items-center">
            <Input
              value={clearPercent}
              onChange={(e) => setClearPercent(e.target.value)}
              className="w-24"
              placeholder="%"
            />
            <span className="text-xs text-muted-foreground">% split (blank = credit only)</span>
          </div>
          <Button type="button" disabled={busy} onClick={() => void clearRelease()}>
            Send clear offer
          </Button>
          {lock.clearedAt ? (
            <p className="text-[10px] text-emerald-400">Cleared {lock.clearedAt.slice(0, 10)}</p>
          ) : null}
        </div>
      </main>
    </div>
  );
}
