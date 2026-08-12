'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { useLockFeature } from '@/hooks/use-lock-feature';
import { lockPath } from '@/lib/lock-feature';
import { auth } from '@/lib/firebase/client/firebase';
import { useGamification } from '@/context/gamification-context';

type PublishOpenLockPanelProps = {
  /** Called with new lock id so Press Desk can store featured.openLockId */
  onPublished?: (lockId: string) => void;
  currentLockId?: string;
};

export function PublishOpenLockPanel({ onPublished, currentLockId }: PublishOpenLockPanelProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const { summary } = useGamification();
  const { enabled: lockOn, loading: lockLoading } = useLockFeature();
  const [seedBar, setSeedBar] = useState('');
  const [embedUrl, setEmbedUrl] = useState('');
  const [busy, setBusy] = useState(false);
  const [liveSeedBar, setLiveSeedBar] = useState('');

  useEffect(() => {
    if (!currentLockId) {
      setLiveSeedBar('');
      return;
    }
    let cancelled = false;
    void fetch(`/api/lock/${encodeURIComponent(currentLockId)}`)
      .then(async (res) => {
        if (!res.ok) return;
        const data = await res.json();
        const bar =
          typeof data?.lock?.seedBar === 'string' ? data.lock.seedBar.trim() : '';
        if (!cancelled) setLiveSeedBar(bar);
      })
      .catch(() => {
        if (!cancelled) setLiveSeedBar('');
      });
    return () => {
      cancelled = true;
    };
  }, [currentLockId]);

  if (lockLoading) {
    return <p className="text-xs text-muted-foreground">Checking finish-the-bar…</p>;
  }

  if (!lockOn) {
    return (
      <p className="text-xs text-muted-foreground">
        Finish this bar is off right now.
      </p>
    );
  }

  const publish = async () => {
    if (!user || !seedBar.trim()) return;
    setBusy(true);
    try {
      const token = await auth.currentUser?.getIdToken();
      const res = await fetch('/api/lock', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          userId: user.id,
          ownerName: user.displayName || 'Artist',
          ownerSlug: summary?.profileSlug,
          seedBar,
          embedUrl: embedUrl.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Publish failed');
      onPublished?.(data.lock.id);
      toast({
        title: 'Unfinished bar is live',
        description: lockPath(data.lock.id),
      });
      setLiveSeedBar(seedBar.trim());
      setSeedBar('');
    } catch (e) {
      toast({
        variant: 'destructive',
        title: 'Publish failed',
        description: e instanceof Error ? e.message : 'Try again',
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-3">
      {currentLockId ? (
        <div className="space-y-1.5 rounded-lg border border-emerald-500/25 bg-emerald-500/5 px-3 py-2.5">
          <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">
            Live on your page
          </p>
          {liveSeedBar ? (
            <p className="font-headline text-sm font-bold leading-snug text-foreground">
              &ldquo;{liveSeedBar}&rdquo;
            </p>
          ) : (
            <p className="text-xs text-muted-foreground">Loading bar…</p>
          )}
          <a className="text-xs text-emerald-400 underline" href={lockPath(currentLockId)}>
            Open cast →
          </a>
        </div>
      ) : null}
      <Textarea
        value={seedBar}
        onChange={(e) => setSeedBar(e.target.value)}
        placeholder="The unfinished line visitors will rhyme with…"
        rows={2}
        className="text-sm"
      />
      <Input
        value={embedUrl}
        onChange={(e) => setEmbedUrl(e.target.value)}
        placeholder="Optional Spotify / YouTube embed URL"
        className="text-sm"
      />
      <Button type="button" disabled={busy || !seedBar.trim()} onClick={() => void publish()}>
        Publish unfinished bar
      </Button>
    </div>
  );
}
