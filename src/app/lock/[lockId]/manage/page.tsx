'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { LOCK_HOUSE_ID } from '@/lib/lock-feature';
import type { LockDoc, LockEcho } from '@/lib/lock/types';
import { auth } from '@/lib/firebase/client/firebase';
import { Lock as LockIcon, Star } from 'lucide-react';
import { LockKicker, LockPlate, LockShell } from '@/components/lock/lock-shell';

export default function LockManagePage() {
  const params = useParams();
  const router = useRouter();
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

  const closeCast = async () => {
    if (!user || !lock) return;
    if (lock.isHouse || lock.ownerId === 'system') {
      toast({
        variant: 'destructive',
        title: 'House prompt stays open',
        description: 'Publish your own unfinished bar from Press Desk to close one.',
      });
      return;
    }
    if (lock.status === 'closed') return;
    const ok = window.confirm(
      'Close this cast? No new replies. Existing replies and picks stay readable.'
    );
    if (!ok) return;
    setBusy(true);
    try {
      const token = await auth.currentUser?.getIdToken();
      const res = await fetch(`/api/lock/${encodeURIComponent(id)}/close`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ userId: user.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Close failed');
      toast({ title: 'Cast closed', description: 'No new replies. Thread stays readable.' });
      void load();
    } catch (e) {
      toast({
        variant: 'destructive',
        title: 'Close failed',
        description: e instanceof Error ? e.message : 'Try again',
      });
    } finally {
      setBusy(false);
    }
  };

  const deleteCast = async () => {
    if (!user || !lock) return;
    if (lock.isHouse || lock.ownerId === 'system') {
      toast({
        variant: 'destructive',
        title: 'House prompt cannot be deleted',
      });
      return;
    }
    const ok = window.confirm(
      lock.echoCount > 0
        ? `Delete this cast and all ${lock.echoCount} replies? This cannot be undone.`
        : 'Delete this cast? This cannot be undone.'
    );
    if (!ok) return;
    setBusy(true);
    try {
      const token = await auth.currentUser?.getIdToken();
      const res = await fetch(`/api/lock/${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ userId: user.id }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Delete failed');
      toast({ title: 'Cast deleted' });
      router.push('/lock/desk');
    } catch (e) {
      toast({
        variant: 'destructive',
        title: 'Could not delete',
        description: e instanceof Error ? e.message : 'Try again',
      });
      setBusy(false);
    }
  };

  const deleteReply = async (echoId: string) => {
    if (!user) return;
    setBusy(true);
    try {
      const token = await auth.currentUser?.getIdToken();
      const res = await fetch(
        `/api/lock/${encodeURIComponent(id)}/echo/${encodeURIComponent(echoId)}`,
        {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        }
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
      setBusy(false);
    }
  };

  const clearRelease = async () => {
    if (!user || !lock?.artistPickEchoId) {
      toast({ variant: 'destructive', title: 'Pick a reply first' });
      return;
    }
    const picked = echoes.find((e) => e.id === lock.artistPickEchoId);
    if (!picked?.authorId) {
      toast({
        variant: 'destructive',
        title: 'Picked reply has no named author',
        description: 'They need to sign in and save their name before clear-for-release.',
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
      <LockShell badge="MANAGE">
        <div className="min-h-[50vh] flex items-center justify-center text-sm text-muted-foreground">
          Loading…
        </div>
      </LockShell>
    );
  }

  if (user && user.id !== lock.ownerId) {
    return (
      <LockShell badge="MANAGE">
        <div className="min-h-[50vh] flex flex-col items-center justify-center gap-3 p-6">
          <p>Only the casting artist can manage this cast.</p>
          <Button asChild>
            <Link href={`/lock/${id}`}>Back</Link>
          </Button>
        </div>
      </LockShell>
    );
  }

  const isClosed = lock.status === 'closed';

  return (
    <LockShell
      badge="MANAGE"
      right={
        <Button asChild variant="ghost" size="sm" className="h-7 px-2 text-xs">
          <Link href={`/lock/${id}`}>← Back</Link>
        </Button>
      }
    >
      <main className="mx-auto max-w-lg px-4 py-8 space-y-6">
        <div className="space-y-2">
          <h1 className="font-headline text-3xl tracking-tight">Manage unfinished bar</h1>
          <p className="text-sm text-muted-foreground">
            {lock.echoCount} replies · {lock.watcherCount} watching
            {isClosed ? ' · closed' : ' · open'}
          </p>
          <LockPlate className="p-3 mt-3">
            <p className="text-sm border-l-2 border-primary/40 pl-3">“{lock.seedBar}”</p>
          </LockPlate>
        </div>

        {isClosed ? (
          <LockPlate tone="danger" className="px-4 py-3 text-sm flex items-center gap-2">
            <LockIcon className="h-4 w-4 shrink-0" />
            Closed — no new replies. You can still Pick and clear.
          </LockPlate>
        ) : (
          <LockPlate className="p-4 space-y-3">
            <LockKicker>Close cast</LockKicker>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Stop new bars when you&apos;re done. Replies stay readable; picks &amp; clear still work.
            </p>
            <Button
              type="button"
              variant="outline"
              className="border-rose-500/40 text-rose-300 hover:bg-rose-500/10"
              disabled={busy || lock.isHouse || lock.ownerId === 'system'}
              onClick={() => void closeCast()}
            >
              Close cast
            </Button>
          </LockPlate>
        )}

        {!lock.isHouse && lock.ownerId !== 'system' ? (
          <LockPlate tone="danger" className="p-4 space-y-3">
            <LockKicker>Delete cast</LockKicker>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Permanently remove this unfinished bar and every reply. Prefer Close if you only want to
              stop new lines.
            </p>
            <Button
              type="button"
              variant="outline"
              className="border-rose-500/40 text-rose-300 hover:bg-rose-500/10"
              disabled={busy}
              onClick={() => void deleteCast()}
            >
              Delete cast
            </Button>
          </LockPlate>
        ) : null}

        <div className="space-y-3">
          <LockKicker>Artist pick</LockKicker>
          <ul className="space-y-2.5">
            {[...echoes]
              .sort((a, b) => b.lockScore - a.lockScore)
              .map((e) => (
                <li key={e.id}>
                  <LockPlate className="p-3 flex gap-3 items-start justify-between">
                    <div className="min-w-0">
                      <p className="text-xs text-muted-foreground">
                        <span className="text-primary font-semibold">Fit {e.lockScore}</span> ·{' '}
                        {e.authorName || 'Anonymous'}
                        {e.isPick ? (
                          <Star className="inline h-3 w-3 text-amber-400 ml-1" />
                        ) : null}
                      </p>
                      <p className="text-sm mt-1">“{e.text}”</p>
                    </div>
                    <div className="flex flex-col gap-2 shrink-0">
                      <Button
                        type="button"
                        size="sm"
                        variant={e.isPick ? 'default' : 'outline'}
                        disabled={busy}
                        onClick={() => void pick(e.id)}
                      >
                        {e.isPick ? 'Picked' : 'Pick'}
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="text-rose-400 hover:text-rose-300"
                        disabled={busy}
                        onClick={() => void deleteReply(e.id)}
                      >
                        Delete
                      </Button>
                    </div>
                  </LockPlate>
                </li>
              ))}
          </ul>
        </div>

        <LockPlate className="p-4 space-y-3">
          <LockKicker>Clear for release</LockKicker>
          <p className="text-xs text-muted-foreground">
            Sends the picked <em>named</em> author a credit/split offer. Anonymous picks can&apos;t clear —
            they need to sign in and save their name first.
          </p>
          <div className="flex gap-2 items-center">
            <Input
              value={clearPercent}
              onChange={(e) => setClearPercent(e.target.value)}
              className="w-24 bg-card/50"
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
        </LockPlate>
      </main>
    </LockShell>
  );
}
