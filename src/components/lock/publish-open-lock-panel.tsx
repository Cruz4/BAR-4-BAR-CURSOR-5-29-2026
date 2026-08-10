'use client';

import { useState } from 'react';
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
        <p className="text-xs text-emerald-400">
          Live:{' '}
          <a className="underline" href={lockPath(currentLockId)}>
            {lockPath(currentLockId)}
          </a>
        </p>
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
