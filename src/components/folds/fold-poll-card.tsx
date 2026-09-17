'use client';

import { useMemo, useState } from 'react';
import { Check, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { voteFoldPollClient } from '@/lib/folds/client';
import type { FoldPoll } from '@/lib/folds/types';
import { cn } from '@/lib/utils';

export function FoldPollCard({
  foldId,
  barId,
  poll,
  viewerId,
}: {
  foldId: string;
  barId: string;
  poll: FoldPoll;
  viewerId: string;
}) {
  const { toast } = useToast();
  const [voting, setVoting] = useState(false);
  const selectedOptionId = poll.votes[viewerId];
  const hasVoted = Boolean(selectedOptionId);
  const counts = useMemo(() => {
    const next: Record<string, number> = {};
    for (const option of poll.options) next[option.id] = 0;
    for (const optionId of Object.values(poll.votes)) {
      if (optionId in next) next[optionId] += 1;
    }
    return next;
  }, [poll]);
  const totalVotes = Object.values(counts).reduce((sum, count) => sum + count, 0);
  const resultsVisible = poll.resultsVisibility === 'always' || hasVoted;

  const vote = async (optionId: string) => {
    if (hasVoted || voting) return;
    setVoting(true);
    try {
      await voteFoldPollClient({ foldId, barId, optionId });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Could not vote',
        description: error instanceof Error ? error.message : undefined,
      });
    } finally {
      setVoting(false);
    }
  };

  return (
    <div className="mt-2 min-w-[12rem] rounded-xl border border-amber-400/25 bg-amber-500/[0.06] p-2.5 text-left">
      <p className="mb-2 font-code text-[9px] font-bold uppercase tracking-[0.2em] text-amber-200/80">Poll</p>
      <div className="space-y-1.5">
        {poll.options.map((option) => {
          const count = counts[option.id] || 0;
          const percent = totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0;
          const chosen = selectedOptionId === option.id;
          return (
            <button
              key={option.id}
              type="button"
              disabled={hasVoted || voting}
              onClick={() => void vote(option.id)}
              className={cn(
                'relative isolate flex w-full min-w-0 items-center gap-2 overflow-hidden rounded-lg border px-2.5 py-2 text-left text-sm transition-colors',
                chosen
                  ? 'border-amber-300/70 text-amber-50'
                  : 'border-white/10 text-amber-50/90 hover:border-amber-300/40',
                (hasVoted || voting) && 'cursor-default'
              )}
            >
              {resultsVisible ? (
                <span
                  className="absolute inset-y-0 left-0 -z-10 bg-amber-400/15"
                  style={{ width: `${percent}%` }}
                />
              ) : null}
              <span className="min-w-0 flex-1 break-words">{option.label}</span>
              {chosen ? <Check className="h-3.5 w-3.5 shrink-0 text-amber-200" /> : null}
              {resultsVisible ? (
                <span className="shrink-0 font-code text-[10px] font-bold text-amber-200/80">{percent}%</span>
              ) : null}
            </button>
          );
        })}
      </div>
      <p className="mt-1.5 text-[9px] text-amber-100/45">
        {voting ? (
          <span className="inline-flex items-center gap-1">
            <Loader2 className="h-3 w-3 animate-spin" /> Saving
          </span>
        ) : hasVoted ? (
          `${totalVotes} ${totalVotes === 1 ? 'vote' : 'votes'}`
        ) : (
          'One vote. Final.'
        )}
      </p>
    </div>
  );
}
