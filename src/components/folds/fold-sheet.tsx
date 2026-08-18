'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, CornerUpLeft, Loader2, MoreHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { StudioLoader } from '@/components/studio-loader';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { useGamification } from '@/context/gamification-context';
import { cn } from '@/lib/utils';
import { profileHref } from '@/lib/profile/profile-slug';
import {
  acceptFoldClient,
  deleteFoldFromInboxClient,
  declineFoldClient,
  foldBackClient,
  markFoldReadClient,
  passBarClient,
  subscribeFoldBars,
  subscribeFoldDoc,
  subscribePeerPresence,
  writeFoldPresence,
} from '@/lib/folds/client';
import {
  FOLD_BAR_MAX_CHARS,
  peerIdOf,
  unreadFor,
  type FoldBar,
  type FoldBarReply,
  type FoldDoc,
  type FoldPresence,
} from '@/lib/folds/types';

function stampTime(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  } catch {
    return '';
  }
}

function BarStanza({
  bar,
  mine,
  onAnswer,
  seen,
}: {
  bar: FoldBar;
  mine: boolean;
  onAnswer: (bar: FoldBar) => void;
  seen?: boolean;
}) {
  return (
    <div
      className={cn(
        'group relative animate-in fade-in slide-in-from-bottom-2 duration-300',
        mine ? 'ml-8 sm:ml-16' : 'mr-8 sm:mr-16'
      )}
    >
      <div className={cn('flex items-baseline gap-2', mine ? 'justify-end' : 'justify-start')}>
        <span className="font-code text-[9px] font-bold uppercase tracking-[0.22em] text-amber-200/70">
          {mine ? 'You' : 'Them'}
        </span>
        <span className="font-code text-[9px] text-muted-foreground/80">{stampTime(bar.createdAt)}</span>
      </div>
      {bar.replyTo ? (
        <p
          className={cn(
            'mt-1 font-serif text-[12px] italic text-amber-100/40',
            mine ? 'text-right' : 'text-left'
          )}
        >
          replying to “{bar.replyTo.text}”
        </p>
      ) : null}
      <div
        className={cn(
          'mt-1 border-amber-200/25 py-1',
          mine ? 'border-r-2 pr-3 text-right' : 'border-l-2 pl-3 text-left'
        )}
      >
        <p className="whitespace-pre-wrap font-serif text-[17px] leading-relaxed text-amber-50">{bar.text}</p>
      </div>
      <button
        type="button"
        onClick={() => onAnswer(bar)}
        className={cn(
          'mt-1 inline-flex items-center gap-1 font-code text-[9px] font-bold uppercase tracking-widest text-amber-200/50 opacity-0 transition-opacity hover:text-amber-100 group-hover:opacity-100',
          mine && 'ml-auto'
        )}
      >
        <CornerUpLeft className="h-3 w-3" />
        Reply
      </button>
      {seen ? (
        <p className="mt-0.5 text-right font-code text-[9px] uppercase tracking-[0.2em] text-amber-200/45">
          Seen
        </p>
      ) : null}
    </div>
  );
}

export function FoldSheet({ foldId }: { foldId: string }) {
  const { user } = useAuth();
  const { summary } = useGamification();
  const { toast } = useToast();
  const router = useRouter();
  const [fold, setFold] = useState<FoldDoc | null>(null);
  const [bars, setBars] = useState<FoldBar[]>([]);
  const [localBars, setLocalBars] = useState<FoldBar[]>([]);
  const [presence, setPresence] = useState<FoldPresence | null>(null);
  const [text, setText] = useState('');
  const [replyTo, setReplyTo] = useState<FoldBarReply | undefined>(undefined);
  const [busy, setBusy] = useState(false);
  const [missing, setMissing] = useState(false);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const typingTimer = useRef<number | null>(null);
  const typingRef = useRef(false);
  const lastReadBarRef = useRef<string | null>(null);

  const me = user?.id || '';
  const peerId = fold ? peerIdOf(fold.memberIds, me) : '';
  const peer = fold && peerId ? fold.members[peerId] : undefined;
  const waitingOnThem = fold?.status === 'pending' && fold.initiatedBy === me;
  const sealedForMe = fold?.status === 'pending' && fold.initiatedBy !== me;
  const inkMoving =
    presence?.typing && presence.at && Date.now() - Date.parse(presence.at) < 6000;

  const shownBars = useMemo(() => {
    const ids = new Set(bars.map((b) => b.clientId).filter(Boolean));
    const extras = localBars.filter((b) => !ids.has(b.clientId) && !bars.some((x) => x.id === b.id));
    return [...bars, ...extras];
  }, [bars, localBars]);

  useEffect(() => {
    if (!user?.id) return;
    const unsubFold = subscribeFoldDoc(
      foldId,
      (next) => {
        if (!next || !next.memberIds.includes(user.id)) {
          setMissing(true);
          setFold(null);
          return;
        }
        setMissing(false);
        setFold(next);
      },
      () => setMissing(true)
    );
    const unsubBars = subscribeFoldBars(foldId, setBars);
    return () => {
      unsubFold();
      unsubBars();
    };
  }, [foldId, user?.id]);

  useEffect(() => {
    if (!peerId) return;
    return subscribePeerPresence(foldId, peerId, setPresence);
  }, [foldId, peerId]);

  useEffect(() => {
    if (!fold || !me) return;
    if (unreadFor(fold, me) <= 0) return;
    // Opening the sheet marks it read. Don't undo a Fold back on this same bar
    // while still sitting here — leaving and coming back still marks it Set.
    if (fold.foldedBack?.[me] && lastReadBarRef.current === fold.lastBarId) return;
    lastReadBarRef.current = fold.lastBarId || fold.id;
    void markFoldReadClient(foldId).catch(() => undefined);
  }, [fold, foldId, me, fold?.lastBarId]);

  useEffect(() => {
    if (!fold || fold.status === 'declined') return;
    const pulse = () => {
      void writeFoldPresence(foldId, { viewing: true, typing: typingRef.current }).catch(
        () => undefined
      );
    };
    pulse();
    const tick = window.setInterval(pulse, 7000);
    return () => {
      window.clearInterval(tick);
      typingRef.current = false;
      void writeFoldPresence(foldId, { viewing: false, typing: false }).catch(() => undefined);
    };
  }, [foldId, fold?.status]);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [shownBars.length, inkMoving]);

  const send = async () => {
    if (!user || !peerId || !text.trim() || busy) return;
    if (fold?.status === 'declined') return;
    const clientId = `local_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
    const optimistic: FoldBar = {
      id: clientId,
      senderId: user.id,
      text: text.trim(),
      createdAt: new Date().toISOString(),
      clientId,
      replyTo,
    };
    setLocalBars((prev) => [...prev, optimistic]);
    const outgoing = text;
    const quote = replyTo;
    setText('');
    setReplyTo(undefined);
    typingRef.current = false;
    setBusy(true);
    try {
      await passBarClient({
        peerId,
        text: outgoing,
        senderName: user.displayName || 'Artist',
        senderSlug: summary.profileSlug || undefined,
        clientId,
        replyTo: quote,
      });
      void writeFoldPresence(foldId, { viewing: true, typing: false }).catch(() => undefined);
    } catch (error) {
      setLocalBars((prev) => prev.filter((b) => b.clientId !== clientId));
      setText(outgoing);
      setReplyTo(quote);
      toast({
        variant: 'destructive',
        title: 'Bar didn’t land',
        description: error instanceof Error ? error.message : undefined,
      });
    } finally {
      setBusy(false);
    }
  };

  const onType = (value: string) => {
    setText(value.slice(0, FOLD_BAR_MAX_CHARS));
    const typing = value.trim().length > 0;
    typingRef.current = typing;
    if (typingTimer.current) window.clearTimeout(typingTimer.current);
    void writeFoldPresence(foldId, { viewing: true, typing }).catch(() => undefined);
    typingTimer.current = window.setTimeout(() => {
      typingRef.current = false;
      void writeFoldPresence(foldId, { viewing: true, typing: false }).catch(() => undefined);
    }, 1600);
  };

  if (!user) {
    return <StudioLoader size="lg" fullscreen message="Opening…" />;
  }
  if (missing) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <p className="font-headline text-2xl uppercase">Conversation not found</p>
        <Button asChild variant="outline" className="mt-4 rounded-none">
          <Link href="/folds">Back to Msgs</Link>
        </Button>
      </div>
    );
  }
  if (!fold) {
    return <StudioLoader size="lg" fullscreen message="Opening…" />;
  }

  const profileUrl = profileHref(peer?.slug);

  return (
    <div className="mx-auto flex h-[calc(100dvh-3.5rem)] w-full max-w-2xl flex-col">
      <header className="flex items-center gap-2 border-b border-amber-500/20 bg-[#100c09]/90 px-2 py-2 backdrop-blur-md">
        <Button variant="ghost" size="icon" className="h-9 w-9 text-amber-100" asChild>
          <Link href="/folds" aria-label="Back to Msgs">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="min-w-0 flex-1">
          <p className="truncate font-headline text-lg uppercase leading-none tracking-tight">
            {peer?.name || 'Artist'}
          </p>
          <p className="mt-1 font-code text-[9px] font-bold uppercase tracking-[0.2em] text-amber-200/60">
            {fold.status === 'declined'
              ? 'Closed'
              : sealedForMe
                ? 'New message'
                : waitingOnThem
                  ? 'Waiting on them'
                  : inkMoving
                    ? 'Typing…'
                    : presence?.viewing
                      ? 'Active'
                      : 'Messages'}
          </p>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-9 w-9 text-amber-100">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="rounded-none">
            {profileUrl ? (
              <DropdownMenuItem onClick={() => router.push(profileUrl)}>Artist Home</DropdownMenuItem>
            ) : null}
            <DropdownMenuItem
              onClick={() =>
                void foldBackClient(foldId)
                  .then(() => toast({ title: 'Marked unread' }))
                  .catch((e) =>
                    toast({
                      variant: 'destructive',
                      title: 'Could not mark unread',
                      description: e instanceof Error ? e.message : undefined,
                    })
                  )
              }
            >
              Mark unread
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-destructive"
              onClick={() =>
                void deleteFoldFromInboxClient(foldId)
                  .then(() => {
                    toast({ title: 'Deleted from inbox' });
                    router.push('/folds');
                  })
                  .catch((e) =>
                    toast({
                      variant: 'destructive',
                      title: 'Could not delete',
                      description: e instanceof Error ? e.message : undefined,
                    })
                  )
              }
            >
              Delete from inbox
            </DropdownMenuItem>
            {sealedForMe ? (
              <DropdownMenuItem onClick={() => void acceptFoldClient(foldId)}>Accept</DropdownMenuItem>
            ) : null}
            {fold.status !== 'declined' ? (
              <DropdownMenuItem
                className="text-destructive"
                onClick={() =>
                  void declineFoldClient(foldId)
                    .then(() => {
                      toast({ title: 'Conversation closed' });
                      router.push('/folds');
                    })
                    .catch((e) =>
                      toast({
                        variant: 'destructive',
                        title: 'Could not close',
                        description: e instanceof Error ? e.message : undefined,
                      })
                    )
                }
              >
                Close
              </DropdownMenuItem>
            ) : null}
          </DropdownMenuContent>
        </DropdownMenu>
      </header>

      <div
        ref={scrollerRef}
        className="relative min-h-0 flex-1 overflow-y-auto px-4 py-6"
        style={{
          backgroundImage:
            'linear-gradient(180deg, rgba(255,236,210,0.05), rgba(8,6,4,0.35)), repeating-linear-gradient(180deg, transparent 0, transparent 27px, rgba(251,191,36,0.05) 28px)',
        }}
      >
        {sealedForMe ? (
          <div className="mb-6 border border-amber-400/30 bg-amber-500/10 px-4 py-3">
            <p className="font-headline text-sm uppercase">New message</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Accept to keep this conversation, or decline.
            </p>
            <div className="mt-3 flex gap-2">
              <Button
                size="sm"
                className="h-8 rounded-none bg-amber-700 text-[10px] font-bold uppercase tracking-widest hover:bg-amber-600"
                onClick={() => void acceptFoldClient(foldId)}
              >
                Accept
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-8 rounded-none text-[10px] font-bold uppercase tracking-widest"
                onClick={() =>
                  void declineFoldClient(foldId).then(() => router.push('/folds'))
                }
              >
                Decline
              </Button>
            </div>
          </div>
        ) : null}

        <div className="space-y-6">
          {shownBars.map((bar, index) => {
            const lastMine =
              bar.senderId === me &&
              !shownBars.slice(index + 1).some((next) => next.senderId === me);
            const peerReadAt = peerId ? fold.lastReadAt?.[peerId] : '';
            const seen = Boolean(lastMine && peerReadAt && peerReadAt >= bar.createdAt);
            return (
              <BarStanza
                key={bar.id}
                bar={bar}
                mine={bar.senderId === me}
                seen={seen}
                onAnswer={(next) =>
                  setReplyTo({ barId: next.id, text: next.text, senderId: next.senderId })
                }
              />
            );
          })}
          {inkMoving ? (
            <p className="font-code text-[10px] uppercase tracking-[0.25em] text-amber-300/80">
              Typing…
            </p>
          ) : null}
        </div>
      </div>

      {fold.status === 'declined' ? (
        <div className="border-t border-white/10 px-4 py-3 text-center text-xs text-muted-foreground">
          This conversation is closed. Send a new message from their Artist Home to try again.
        </div>
      ) : (
        <form
          className="border-t border-amber-500/20 bg-[#100c09] px-3 py-2.5"
          onSubmit={(e) => {
            e.preventDefault();
            void send();
          }}
        >
          {replyTo ? (
            <div className="mb-2 flex items-center justify-between gap-2 border-l-2 border-amber-400/40 bg-amber-500/5 px-2 py-1.5">
              <p className="min-w-0 truncate font-serif text-xs italic text-amber-100/70">
                replying to “{replyTo.text}”
              </p>
              <button
                type="button"
                className="font-code text-[9px] uppercase tracking-widest text-muted-foreground"
                onClick={() => setReplyTo(undefined)}
              >
                Clear
              </button>
            </div>
          ) : null}
          <div className="flex items-end gap-2">
            <textarea
              value={text}
              onChange={(e) => onType(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  void send();
                }
              }}
              rows={2}
              placeholder={waitingOnThem ? 'Waiting — you can still send' : 'Write a message…'}
              className="min-h-[52px] flex-1 resize-none border-0 bg-transparent font-serif text-base leading-relaxed text-amber-50 outline-none placeholder:text-amber-100/30"
              maxLength={FOLD_BAR_MAX_CHARS}
            />
            <Button
              type="submit"
              disabled={busy || !text.trim()}
              className="h-10 rounded-none bg-amber-700 px-4 font-bold uppercase tracking-[0.22em] text-amber-50 hover:bg-amber-600"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Send'}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
