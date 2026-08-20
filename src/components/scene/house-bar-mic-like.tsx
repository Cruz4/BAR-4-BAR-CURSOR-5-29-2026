'use client';

import React, { useEffect, useState } from 'react';
import { Mic } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { auth } from '@/lib/firebase/client/firebase';
import { LOCK_HOUSE_ID } from '@/lib/lock-feature';
import type { LockEcho } from '@/lib/lock/types';
import { patchHouseBarEcho } from '@/hooks/use-house-bar-thread';
import { cn } from '@/lib/utils';

export function HouseBarMicLike({
  echo,
  compact = false,
  lockId = LOCK_HOUSE_ID,
}: {
  echo: LockEcho;
  compact?: boolean;
  lockId?: string;
}) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [liked, setLiked] = useState(Boolean(echo.likedByMe));
  const [count, setCount] = useState(echo.likeCount ?? 0);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setLiked(Boolean(echo.likedByMe));
    setCount(echo.likeCount ?? 0);
  }, [echo.id, echo.likedByMe, echo.likeCount]);

  const toggle = async () => {
    if (!user) {
      toast({ title: 'Sign in to mic this bar' });
      return;
    }
    if (busy) return;
    const next = !liked;
    const nextCount = Math.max(0, count + (next ? 1 : -1));
    setLiked(next);
    setCount(nextCount);
    patchHouseBarEcho(echo.id, { likedByMe: next, likeCount: nextCount });
    setBusy(true);
    try {
      const token = await auth.currentUser?.getIdToken();
      if (!token) throw new Error('Sign in required');
      const res = await fetch(
        `/api/lock/${encodeURIComponent(lockId)}/echo/${encodeURIComponent(echo.id)}/like`,
        {
          method: next ? 'POST' : 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Could not mic this bar');
      if (typeof data.likeCount === 'number') {
        setCount(data.likeCount);
        patchHouseBarEcho(echo.id, { likedByMe: next, likeCount: data.likeCount });
      }
    } catch (e) {
      setLiked(!next);
      setCount(count);
      patchHouseBarEcho(echo.id, { likedByMe: !next, likeCount: count });
      toast({
        variant: 'destructive',
        title: 'Could not mic',
        description: e instanceof Error ? e.message : 'Try again',
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        void toggle();
      }}
      disabled={busy}
      className={cn(
        'inline-flex shrink-0 items-center gap-0.5 rounded-md px-1 py-0.5 text-[10px] font-bold tabular-nums transition-colors',
        liked
          ? 'text-fuchsia-300'
          : 'text-muted-foreground hover:text-fuchsia-200',
        busy && 'opacity-60'
      )}
      aria-pressed={liked}
      aria-label={liked ? 'Remove mic' : 'Mic this bar'}
      title={liked ? 'Un-mic' : 'Mic'}
    >
      <Mic className={cn('h-3.5 w-3.5', liked && 'fill-fuchsia-300/35')} />
      {count > 0 ? count : compact ? null : 'Mic'}
    </button>
  );
}
