'use client';

import React, { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { formatDistanceToNow } from 'date-fns';
import { ChevronRight, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { StudioLoader } from '@/components/studio-loader';
import { useFoldInbox } from '@/components/folds/fold-inbox-provider';
import { useFoldsFeature } from '@/hooks/use-folds-feature';
import { useAuth } from '@/hooks/use-auth';
import { peerIdOf, unreadFor, type FoldDoc } from '@/lib/folds/types';
import { cn } from '@/lib/utils';

const PREVIEW_LIMIT = 6;

function timeAgo(iso: string): string {
  try {
    return formatDistanceToNow(new Date(iso), { addSuffix: true });
  } catch {
    return '';
  }
}

export function getRecentFolds(folds: FoldDoc[], me: string, limit = PREVIEW_LIMIT): FoldDoc[] {
  return folds
    .filter((fold) => !fold.deletedFor?.[me] && fold.status !== 'declined')
    .sort((a, b) => new Date(b.lastAt).getTime() - new Date(a.lastAt).getTime())
    .slice(0, limit);
}

export function FoldNavButton() {
  const router = useRouter();
  const { user } = useAuth();
  const { folds, unread, waiting, ready } = useFoldInbox();
  const { enabled } = useFoldsFeature();
  const [open, setOpen] = useState(false);

  const me = user?.id || '';
  const previewFolds = useMemo(() => getRecentFolds(folds, me, PREVIEW_LIMIT), [folds, me]);

  if (!enabled) return null;

  const openThread = (foldId: string) => {
    setOpen(false);
    router.push(`/msgs/${foldId}`);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            'relative h-8 w-8 shrink-0 overflow-visible text-amber-300 hover:bg-amber-500/10 md:h-9 md:w-9',
            unread > 0 && 'z-20'
          )}
          aria-label={unread > 0 ? `Msgs, ${unread} unread` : 'Msgs'}
        >
          <MessageSquare className="h-4 w-4 md:h-5 md:w-5" />
          {unread > 0 && (
            <span className="pointer-events-none absolute right-0 top-0 z-30 flex h-4 min-w-4 translate-x-[30%] -translate-y-[30%] items-center justify-center rounded-full bg-amber-400 px-1 text-[9px] font-bold leading-none text-black shadow ring-2 ring-background">
              {unread > 99 ? '99+' : unread}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="w-[min(22rem,calc(100vw-1.25rem))] p-0 bg-[#120e0a] border-2 border-amber-500/25 shadow-2xl overflow-hidden"
      >
        <div className="flex items-center justify-between gap-2 border-b border-amber-500/15 bg-amber-500/5 px-3 py-2.5">
          <h4 className="text-[10px] font-bold uppercase tracking-widest text-amber-300 flex items-center gap-1.5">
            <MessageSquare className="h-3 w-3" /> Msgs
          </h4>
          {waiting > 0 ? (
            <span className="rounded-full bg-amber-400/15 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-amber-200">
              {waiting} request{waiting === 1 ? '' : 's'}
            </span>
          ) : null}
        </div>

        <div className="max-h-[min(22rem,50vh)] overflow-y-auto">
          {!ready ? (
            <div className="flex items-center justify-center gap-2 py-10 text-muted-foreground">
              <StudioLoader size="sm" />
              <span className="text-[10px] font-code uppercase tracking-wider">Loading</span>
            </div>
          ) : previewFolds.length === 0 ? (
            <div className="px-4 py-10 text-center">
              <MessageSquare className="mx-auto mb-2 h-7 w-7 text-amber-400/50" />
              <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                No messages yet
              </p>
              <p className="mt-1 text-[10px] text-muted-foreground/80">
                Start a conversation from Your circle or an Artist Home.
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-amber-500/10">
              {previewFolds.map((fold) => {
                const peer = fold.members[peerIdOf(fold.memberIds, me)];
                const wet = unreadFor(fold, me) > 0;
                const isRequest = fold.status === 'pending' && fold.initiatedBy !== me;
                return (
                  <li key={fold.id}>
                    <button
                      type="button"
                      className={cn(
                        'flex w-full gap-2.5 px-3 py-2.5 text-left transition-colors hover:bg-amber-500/10',
                        wet && 'bg-amber-500/[0.06]'
                      )}
                      onClick={() => openThread(fold.id)}
                    >
                      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-amber-500/25 bg-amber-500/10 text-[11px] font-bold uppercase text-amber-100">
                        {(peer?.name || 'A').slice(0, 1)}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-baseline justify-between gap-2">
                          <span className="truncate font-headline text-sm uppercase tracking-tight text-amber-50">
                            {peer?.name || 'Artist'}
                          </span>
                          <span className="shrink-0 font-code text-[9px] uppercase tracking-wider text-muted-foreground">
                            {timeAgo(fold.lastAt)}
                          </span>
                        </span>
                        <span className="mt-0.5 line-clamp-2 block font-serif text-[12px] leading-snug text-amber-50/80">
                          {fold.lastBar || 'No messages yet'}
                        </span>
                        {isRequest ? (
                          <span className="mt-1 inline-block text-[9px] font-bold uppercase tracking-wider text-amber-300">
                            New request · tap to open
                          </span>
                        ) : wet ? (
                          <span className="mt-1 inline-block text-[9px] font-bold uppercase tracking-wider text-amber-300">
                            Unread · {unreadFor(fold, me)}
                          </span>
                        ) : null}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="border-t border-amber-500/15 bg-amber-500/5 p-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 w-full justify-between gap-2 px-2.5 text-[10px] font-bold uppercase tracking-widest text-amber-100 hover:bg-amber-500/10 hover:text-amber-50"
            onClick={() => {
              setOpen(false);
              router.push('/msgs');
            }}
          >
            View all messages
            <ChevronRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
