'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Check, Loader2, LockKeyhole } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useAuth } from '@/hooks/use-auth';
import { useArtistHomeEngagementGate } from '@/context/artist-home-engagement-context';
import { useToast } from '@/hooks/use-toast';
import { auth } from '@/lib/firebase/client/firebase';
import type { PostPoll, PostPollViewerState } from '@/lib/profile/post-polls';
import { cn } from '@/lib/utils';

export function PostPollCard({
  postId,
  poll,
  commentId,
}: {
  postId: string;
  poll: PostPoll;
  commentId?: string;
}) {
  const { user, loading: authLoading } = useAuth();
  const { ensureEngagement } = useArtistHomeEngagementGate();
  const { toast } = useToast();
  const rootRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(false);
  const [state, setState] = useState<PostPollViewerState | null>(null);
  const [loading, setLoading] = useState(false);
  const [voting, setVoting] = useState(false);
  const [pendingOptionId, setPendingOptionId] = useState<string | null>(null);

  useEffect(() => {
    const node = rootRef.current;
    if (!node || active) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setActive(true);
          observer.disconnect();
        }
      },
      { rootMargin: '360px' }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [active]);

  const pollPath = useMemo(
    () =>
      commentId
        ? `/api/posts/${encodeURIComponent(postId)}/comments/${encodeURIComponent(commentId)}/poll`
        : `/api/posts/${encodeURIComponent(postId)}/poll`,
    [commentId, postId]
  );

  useEffect(() => {
    if (!active || authLoading) return;
    let cancelled = false;
    setLoading(true);
    void Promise.resolve(auth.currentUser ? auth.currentUser.getIdToken().catch(() => undefined) : undefined)
      .then((token) => fetch(pollPath, {
        cache: 'no-store',
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      }))
      .then(async (response) => {
        if (!response.ok) throw new Error('Poll unavailable');
        return response.json() as Promise<PostPollViewerState>;
      })
      .then((next) => { if (!cancelled) setState(next); })
      .catch(() => { if (!cancelled) setState({ hasVoted: false, resultsVisible: false }); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [active, authLoading, pollPath, user?.id]);

  const totalVotes = state?.totalVotes || 0;
  const selected = useMemo(
    () => poll.options.find((option) => option.id === pendingOptionId),
    [pendingOptionId, poll.options]
  );

  const vote = async () => {
    if (!pendingOptionId || voting) return;
    if (!ensureEngagement({ intent: 'poll' })) return;
    if (!auth.currentUser) return;
    setVoting(true);
    try {
      const token = await auth.currentUser.getIdToken();
      const response = await fetch(pollPath, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ optionId: pendingOptionId }),
      });
      const data = await response.json() as PostPollViewerState & { error?: string };
      if (!response.ok && response.status !== 409) throw new Error(data.error || 'Could not save vote.');
      setState(data);
      if (response.status === 409) toast({ title: 'Your vote was already locked in' });
    } catch (error) {
      toast({ variant: 'destructive', title: 'Could not vote', description: error instanceof Error ? error.message : undefined });
    } finally {
      setVoting(false);
      setPendingOptionId(null);
    }
  };

  return (
    <div ref={rootRef} className="mt-3 rounded-xl border border-cyan-400/25 bg-[linear-gradient(145deg,rgba(8,145,178,.10),rgba(168,85,247,.08),rgba(0,0,0,.32))] p-3" data-no-double-love>
      <div className="mb-2 flex items-center justify-between gap-3">
        <p className="font-code text-[10px] font-bold uppercase tracking-[0.2em] text-cyan-300">Poll</p>
        <p className="flex items-center gap-1 text-[9px] uppercase tracking-wider text-muted-foreground">
          <LockKeyhole className="h-3 w-3" /> One final vote
        </p>
      </div>
      <div className="space-y-2">
        {poll.options.map((option) => {
          const count = state?.counts?.[option.id] || 0;
          const percent = totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0;
          const chosen = state?.selectedOptionId === option.id;
          return (
            <button
              key={option.id}
              type="button"
              className={cn(
                'relative isolate flex w-full min-w-0 items-center gap-2 overflow-hidden rounded-lg border px-3 py-2.5 text-left text-sm transition-colors',
                chosen
                  ? 'border-cyan-300/70 text-white shadow-[0_0_18px_rgba(34,211,238,.12)]'
                  : 'border-white/10 text-white/90 hover:border-cyan-300/45 hover:bg-white/[0.04]',
                (state?.hasVoted || voting || !user) && 'cursor-default'
              )}
              disabled={Boolean(state?.hasVoted || voting || !user)}
              onClick={() => {
                if (!ensureEngagement({ intent: 'poll' })) return;
                setPendingOptionId(option.id);
              }}
            >
              {state?.resultsVisible ? (
                <span className="absolute inset-y-0 left-0 -z-10 bg-cyan-400/15 transition-[width] duration-500" style={{ width: `${percent}%` }} />
              ) : null}
              <span className="min-w-0 flex-1 break-words">{option.label}</span>
              {chosen ? <Check className="h-4 w-4 shrink-0 text-cyan-300" /> : null}
              {state?.resultsVisible ? <span className="shrink-0 font-code text-xs font-bold tabular-nums text-cyan-200">{percent}%</span> : null}
            </button>
          );
        })}
      </div>
      <div className="mt-2 min-h-4 text-[10px] text-muted-foreground">
        {loading ? <span className="inline-flex items-center gap-1"><Loader2 className="h-3 w-3 animate-spin" /> Loading poll...</span> : null}
        {!loading && !user ? 'Sign in to vote. Results appear after your vote unless the author made them visible.' : null}
        {!loading && user && state && !state.resultsVisible ? 'Vote to reveal the current totals. Your choice cannot be changed.' : null}
        {!loading && state?.resultsVisible ? `${totalVotes} ${totalVotes === 1 ? 'vote' : 'votes'} · individual choices stay private` : null}
      </div>

      <AlertDialog open={Boolean(pendingOptionId)} onOpenChange={(open) => { if (!open && !voting) setPendingOptionId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Lock in “{selected?.label || 'this choice'}”?</AlertDialogTitle>
            <AlertDialogDescription>
              Poll votes are final and cannot be changed. Other members will only see totals, not which choice you made.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={voting}>Cancel</AlertDialogCancel>
            <AlertDialogAction disabled={voting} onClick={(event) => { event.preventDefault(); void vote(); }}>
              {voting ? 'Saving...' : 'Vote once'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
