'use client';

/**
 * Scene-first house bar continue — stay on The Scene, write the next line in a popup.
 * Replies live on the shared house cast; studio admins can delete any reply.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { format } from 'date-fns';
import { Radio, Trash2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/hooks/use-auth';
import { useGamification } from '@/context/gamification-context';
import { useToast } from '@/hooks/use-toast';
import { auth } from '@/lib/firebase/client/firebase';
import { isMasterAdminEmail } from '@/lib/master-admin';
import { LOCK_HOUSE_ID } from '@/lib/lock-feature';
import type { LockDoc, LockEcho } from '@/lib/lock/types';
import { profileHref } from '@/lib/profile/profile-slug';
import { parseUserDate } from '@/lib/user-date';
import { markHouseBarSeen, notifyHouseBarThreadUpdated } from '@/lib/scene/house-bar-pin';
import { HouseBarMicLike } from '@/components/scene/house-bar-mic-like';
import { cn } from '@/lib/utils';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  seedBar: string;
  title: string;
};

function formatEchoStamp(iso: string): string {
  const d = parseUserDate(iso);
  if (!d) return '';
  return `${format(d, 'h:mm a')} · ${format(d, 'MMM d, yyyy')}`;
}

function sortByMicScore(echoes: LockEcho[]): LockEcho[] {
  return [...echoes].sort((a, b) => {
    const likes = (b.likeCount ?? 0) - (a.likeCount ?? 0);
    if (likes !== 0) return likes;
    return (b.createdAt || '').localeCompare(a.createdAt || '');
  });
}

export function SceneHouseBarDialog({ open, onOpenChange, seedBar, title }: Props) {
  const { user } = useAuth();
  const { summary } = useGamification();
  const { toast } = useToast();
  const [lock, setLock] = useState<LockDoc | null>(null);
  const [echoes, setEchoes] = useState<LockEcho[]>([]);
  const [bar, setBar] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const isAdmin =
    Boolean(user) &&
    (isMasterAdminEmail(user?.email) || user?.role === 'admin');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const headers: Record<string, string> = {};
      const token = await auth.currentUser?.getIdToken().catch(() => null);
      if (token) headers.Authorization = `Bearer ${token}`;
      const res = await fetch(`/api/lock/${LOCK_HOUSE_ID}`, { cache: 'no-store', headers });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Could not load house bar');
      setLock(data.lock as LockDoc);
      setEchoes(Array.isArray(data.echoes) ? (data.echoes as LockEcho[]) : []);
    } catch (e) {
      toast({
        variant: 'destructive',
        title: 'House bar unavailable',
        description: e instanceof Error ? e.message : 'Try again',
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    if (!open) return;
    void load();
  }, [open, load]);

  useEffect(() => {
    if (!open || !lock) return;
    markHouseBarSeen(lock.seedBar || seedBar, lock.echoCount);
  }, [open, lock, seedBar]);

  const rankedEchoes = useMemo(() => sortByMicScore(echoes), [echoes]);

  const canDelete = (echo: LockEcho) => {
    if (!user) return false;
    if (isAdmin) return true;
    if (echo.authorId && echo.authorId === user.id) return true;
    return false;
  };

  const onDrop = async () => {
    if (!bar.trim() || submitting) return;
    setSubmitting(true);
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      const token = await auth.currentUser?.getIdToken().catch(() => null);
      if (token) headers.Authorization = `Bearer ${token}`;
      const res = await fetch(`/api/lock/${LOCK_HOUSE_ID}/echo`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          text: bar,
          displayName: user?.displayName || undefined,
          authorSlug: summary.profileSlug || undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Could not save your bar');
      setBar('');
      toast({ title: 'Bar dropped', description: 'It’s on the house cypher now.' });
      notifyHouseBarThreadUpdated();
      void load();
    } catch (e) {
      toast({
        variant: 'destructive',
        title: 'Could not drop bar',
        description: e instanceof Error ? e.message : 'Try again',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const onDelete = async (echoId: string) => {
    if (!user || deletingId) return;
    if (!confirm('Remove this reply from the house bar?')) return;
    setDeletingId(echoId);
    try {
      const token = await auth.currentUser?.getIdToken();
      if (!token) throw new Error('Sign in required');
      const res = await fetch(`/api/lock/${LOCK_HOUSE_ID}/echo/${encodeURIComponent(echoId)}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Delete failed');
      toast({ title: 'Reply removed' });
      notifyHouseBarThreadUpdated();
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

  const displaySeed = lock?.seedBar || seedBar;
  const closed = lock?.status === 'closed';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[min(90dvh,40rem)] overflow-y-auto border-fuchsia-500/30 bg-card sm:max-w-lg">
        <DialogHeader className="text-center sm:text-center">
          <DialogTitle className="flex items-center justify-center gap-2 text-center font-headline text-lg uppercase tracking-tight">
            <Radio className="h-4 w-4 text-fuchsia-400" />
            {title || 'House bar of the day'}
          </DialogTitle>
          <DialogDescription className="text-center text-sm text-muted-foreground">
            Write the next line here on The Scene. Everyone answers the same opening bar.
          </DialogDescription>
        </DialogHeader>

        <p className="rounded-lg border border-fuchsia-500/25 bg-fuchsia-500/5 px-3 py-2.5 text-sm leading-snug text-foreground">
          “{displaySeed}”
        </p>

        {closed ? (
          <p className="text-sm text-rose-400">This house bar is closed — no new replies.</p>
        ) : (
          <div className="space-y-2">
            <Textarea
              value={bar}
              rows={3}
              disabled={submitting || loading}
              placeholder="Your next line…"
              className="resize-none bg-background/50 font-code text-sm"
              onChange={(e) => setBar(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                  e.preventDefault();
                  void onDrop();
                }
              }}
            />
            <div className="flex items-center justify-between gap-2">
              <p className="text-[10px] text-muted-foreground">Ctrl / ⌘ + Enter</p>
              <Button
                size="sm"
                disabled={!bar.trim() || submitting}
                className="font-bold uppercase tracking-wider"
                onClick={() => void onDrop()}
              >
                {submitting ? 'Saving…' : 'Drop it'}
              </Button>
            </div>
          </div>
        )}

        <div className="space-y-2 border-t border-border/60 pt-3">
          <p className="font-code text-[9px] font-bold uppercase tracking-[0.22em] text-muted-foreground">
            Top by mic{lock ? ` · ${lock.echoCount} replies` : ''}
          </p>
          {loading ? (
            <p className="text-xs text-muted-foreground">Loading…</p>
          ) : rankedEchoes.length === 0 ? (
            <p className="text-xs text-muted-foreground">No replies yet — be first.</p>
          ) : (
            <ul className="max-h-48 space-y-2 overflow-y-auto studio-scrollbar pr-1">
              {rankedEchoes.slice(0, 24).map((echo, index) => {
                const name = echo.authorName?.trim() || 'Guest';
                const href = echo.authorSlug ? profileHref(echo.authorSlug) : undefined;
                const stamp = formatEchoStamp(echo.createdAt);
                const micScore = echo.likeCount ?? 0;
                return (
                  <li
                    key={echo.id}
                    className="flex items-center gap-2 rounded-md border border-white/5 bg-black/20 px-2.5 py-2"
                  >
                    <span className="w-5 shrink-0 text-center font-code text-[10px] font-bold tabular-nums text-fuchsia-300">
                      {index + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm leading-snug text-foreground/95">{echo.text}</p>
                      <p className="mt-0.5 text-[10px] tracking-wide text-muted-foreground">
                        {href ? (
                          <Link
                            href={href}
                            className="font-semibold text-sky-300 hover:underline"
                            onClick={() => onOpenChange(false)}
                          >
                            {name}
                          </Link>
                        ) : (
                          <span className="font-semibold text-foreground/70">{name}</span>
                        )}
                        <span className="font-semibold text-fuchsia-300"> · {micScore} mic</span>
                        {stamp ? (
                          <span className="text-muted-foreground/80"> · {stamp}</span>
                        ) : null}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center">
                      <HouseBarMicLike echo={echo} compact />
                      {canDelete(echo) ? (
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className={cn(
                          'h-7 w-7 shrink-0 p-0 text-muted-foreground hover:text-rose-400',
                          deletingId === echo.id && 'opacity-50'
                        )}
                        disabled={deletingId === echo.id}
                        aria-label="Delete reply"
                        onClick={() => void onDelete(echo.id)}
                      >
                        <Trash2 className="block h-3.5 w-3.5" />
                      </Button>
                      ) : null}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
