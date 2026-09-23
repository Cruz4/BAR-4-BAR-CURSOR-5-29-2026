'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import {
  ArrowLeft,
  ChevronDown,
  MessageSquare,
  Plus,
  Search,
  Send,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/use-auth';
import { useFoldInbox } from '@/components/folds/fold-inbox-provider';
import { useFoldsFeature } from '@/hooks/use-folds-feature';
import { useCollabSheetSession } from '@/components/collab-sheet/collab-sheet-session';
import {
  acceptFoldClient,
  declineFoldClient,
  markFoldReadClient,
  passBarClient,
  subscribeFoldBars,
  subscribeFoldDoc,
} from '@/lib/folds/client';
import {
  FOLD_BAR_MAX_CHARS,
  foldIdFor,
  foldPreview,
  peerIdOf,
  unreadFor,
  type FoldBar,
  type FoldDoc,
} from '@/lib/folds/types';
import { outgoingReadStatus, peerReadLastOutgoing } from '@/lib/folds/read-receipts';
import { foldMessageTimestamp, isSameMessageDay } from '@/lib/folds/message-dates';
import { FoldDateSeparator } from '@/components/folds/fold-date-separator';
import { FoldReadReceipt } from '@/components/folds/fold-read-receipt';
import { friendProfilesOf, type Friendship } from '@/lib/profile/social-client';
import { useGamification } from '@/context/gamification-context';
import { useToast } from '@/hooks/use-toast';
import { EmojiPickerButton, useEmojiInserter } from '@/components/ui/emoji-picker-button';

type View = 'inbox' | 'compose' | 'thread';

function convoTime(iso: string): string {
  try {
    return formatDistanceToNow(new Date(iso), { addSuffix: true });
  } catch {
    return '';
  }
}

function sortByName<T extends { name: string }>(rows: T[]): T[] {
  return [...rows].sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
}

export function SheetMsgsDock({
  isMinimized,
  friendships,
}: {
  isMinimized: boolean;
  friendships: Friendship[];
}) {
  const { user } = useAuth();
  const { enabled: foldsOn } = useFoldsFeature();
  const { folds, unread, waiting } = useFoldInbox();
  const { summary, loading: profileLoading } = useGamification();
  const { toast } = useToast();
  const collabSession = useCollabSheetSession();

  const [open, setOpen] = useState(false);
  const [view, setView] = useState<View>('inbox');
  const [inboxTab, setInboxTab] = useState<'open' | 'waiting'>('open');
  const [search, setSearch] = useState('');
  const [peerId, setPeerId] = useState<string | null>(null);
  const [peerName, setPeerName] = useState('');
  const [bars, setBars] = useState<FoldBar[]>([]);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const threadScrollRef = useRef<HTMLDivElement>(null);
  const composeRef = useRef<HTMLInputElement>(null);
  const markedThreadRef = useRef<string | null>(null);
  const insertEmoji = useEmojiInserter(text, setText, composeRef);

  const me = user?.id || '';

  const friends = useMemo(
    () =>
      me
        ? sortByName(
            friendProfilesOf(friendships, me, {
              displayName: user?.displayName,
              email: user?.email,
            }).filter((f) => f.userId !== me)
          )
        : [],
    [friendships, me, user?.displayName, user?.email]
  );

  const openFolds = useMemo(
    () =>
      folds
        .filter(
          (f) =>
            !f.deletedFor?.[me] &&
            f.status !== 'declined' &&
            !(f.status === 'pending' && f.initiatedBy !== me)
        )
        .sort((a, b) => Date.parse(b.lastAt) - Date.parse(a.lastAt)),
    [folds, me]
  );

  const waitingFolds = useMemo(
    () =>
      folds
        .filter((f) => !f.deletedFor?.[me] && f.status === 'pending' && f.initiatedBy !== me)
        .sort((a, b) => Date.parse(b.lastAt) - Date.parse(a.lastAt)),
    [folds, me]
  );

  const openWithPeer = useCallback((id: string, name: string) => {
    setPeerId(id);
    setPeerName(name);
    setView('thread');
    setSearch('');
    setOpen(true);
  }, []);

  useEffect(() => {
    collabSession?.registerMsgsOpen(openWithPeer);
  }, [collabSession, openWithPeer]);

  const activeFoldId = me && peerId ? foldIdFor(me, peerId) : null;
  const activeFold = useMemo(
    () => (activeFoldId ? folds.find((fold) => fold.id === activeFoldId) ?? null : null),
    [activeFoldId, folds]
  );
  const [threadFold, setThreadFold] = useState<FoldDoc | null>(null);
  const receiptFold = threadFold ?? activeFold;

  useEffect(() => {
    if (!open || view !== 'thread' || !activeFoldId) {
      setBars([]);
      setThreadFold(null);
      return;
    }
    const unsub = subscribeFoldBars(activeFoldId, setBars, () => setBars([]));
    const unsubFold = subscribeFoldDoc(activeFoldId, setThreadFold, () => setThreadFold(null));
    return () => {
      unsub();
      unsubFold();
    };
  }, [open, view, activeFoldId]);

  const lastReadBarRef = useRef<string | null>(null);

  useEffect(() => {
    if (!open || view !== 'thread' || !activeFoldId) {
      if (!open) {
        markedThreadRef.current = null;
        lastReadBarRef.current = null;
      }
      return;
    }
    markedThreadRef.current = activeFoldId;
  }, [open, view, activeFoldId]);

  useEffect(() => {
    if (!open || view !== 'thread' || !activeFoldId || !me) return;
    const fold = folds.find((f) => f.id === activeFoldId);
    if (!fold || fold.lastSenderId === me || !fold.lastBarId) return;
    if (lastReadBarRef.current === fold.lastBarId) return;
    lastReadBarRef.current = fold.lastBarId;
    void markFoldReadClient(activeFoldId).catch(() => undefined);
  }, [open, view, activeFoldId, folds, me]);

  useEffect(() => {
    if (!open || view !== 'thread') return;
    const el = threadScrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [open, view, bars.length, peerId]);

  const resetToInbox = () => {
    setView('inbox');
    setPeerId(null);
    setPeerName('');
    setSearch('');
    setText('');
  };

  const closeAll = () => {
    setOpen(false);
    resetToInbox();
  };

  const submit = async () => {
    const trimmed = text.trim();
    if (!trimmed || busy || !me || !peerId) return;
    setBusy(true);
    try {
      await passBarClient({
        peerId,
        text: trimmed,
        senderName: user?.displayName || 'Artist',
        senderSlug: summary.profileSlug,
        clientId: `sheet_${Date.now()}`,
      });
      setText('');
    } finally {
      setBusy(false);
    }
  };

  const respond = async (foldId: string, accept: boolean) => {
    setBusy(true);
    try {
      if (accept) await acceptFoldClient(foldId);
      else await declineFoldClient(foldId);
      toast({ title: accept ? 'Message accepted' : 'Message declined' });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: accept ? 'Could not accept' : 'Could not decline',
        description: error instanceof Error ? error.message : undefined,
      });
    } finally {
      setBusy(false);
    }
  };

  const filteredFriends = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return friends;
    return friends.filter((f) => f.name.toLowerCase().includes(q));
  }, [friends, search]);

  const filteredConversations = useMemo(() => {
    const rows = inboxTab === 'waiting' ? waitingFolds : openFolds;
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((fold) => {
      const peer = fold.members[peerIdOf(fold.memberIds, me)];
      return (peer?.name || '').toLowerCase().includes(q) || fold.lastBar.toLowerCase().includes(q);
    });
  }, [inboxTab, openFolds, waitingFolds, search, me]);

  if (!user || !foldsOn) return null;

  const profileLive = Boolean(summary.publicProfile && summary.profileSlug);
  if (profileLoading || !profileLive) return null;

  const panelHeight = isMinimized
    ? 'h-[min(calc(100dvh-5rem),32rem)]'
    : 'h-[min(calc(100dvh-14rem),28rem)]';

  return (
    <div className="absolute bottom-full right-3 z-[50] mb-1.5 flex flex-col items-end pointer-events-none max-md:right-2">
      {open ? (
        <div
          className={cn(
            'pointer-events-auto mb-2 flex w-[min(calc(100vw-1.5rem),22rem)] flex-col overflow-hidden rounded-xl border border-amber-500/30 bg-card/98 shadow-2xl backdrop-blur-md',
            panelHeight
          )}
        >
          {/* Header */}
          <div className="flex shrink-0 items-center gap-2 border-b border-white/10 px-3 py-2">
            {view === 'thread' ? (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7 shrink-0 text-muted-foreground"
                onClick={resetToInbox}
                aria-label="Back to inbox"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
            ) : view === 'compose' ? (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7 shrink-0 text-muted-foreground"
                onClick={resetToInbox}
                aria-label="Back to inbox"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
            ) : (
              <MessageSquare className="h-3.5 w-3.5 shrink-0 text-amber-300" />
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate font-code text-[9px] font-bold uppercase tracking-[0.18em] text-amber-200">
                {view === 'thread' ? peerName : view === 'compose' ? 'New message' : 'Msgs'}
              </p>
              {view === 'inbox' && unread > 0 ? (
                <p className="text-[9px] text-amber-400/80">{unread} unread</p>
              ) : null}
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-7 w-7 shrink-0 text-muted-foreground"
              onClick={closeAll}
              aria-label="Close messages"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Inbox */}
          {view === 'inbox' ? (
            <>
              <div className="shrink-0 space-y-2 border-b border-white/5 px-3 py-2">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search conversations…"
                    className="h-8 border-white/10 bg-background/60 pl-8 text-xs"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    size="sm"
                    className="h-7 flex-1 gap-1 rounded-md bg-amber-600/90 text-[9px] font-bold uppercase tracking-wider hover:bg-amber-600"
                    onClick={() => {
                      setView('compose');
                      setSearch('');
                    }}
                  >
                    <Plus className="h-3 w-3" />
                    New
                  </Button>
                  <div className="flex shrink-0 overflow-hidden rounded-md border border-white/10">
                    {(['open', 'waiting'] as const).map((tab) => (
                      <button
                        key={tab}
                        type="button"
                        onClick={() => setInboxTab(tab)}
                        className={cn(
                          'px-2.5 py-1 font-code text-[8px] font-bold uppercase tracking-wider',
                          inboxTab === tab
                            ? 'bg-amber-500/15 text-amber-100'
                            : 'text-muted-foreground hover:text-foreground'
                        )}
                      >
                        {tab === 'open' ? 'Inbox' : `Req${waiting ? ` ${waiting}` : ''}`}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto studio-scrollbar">
                {filteredConversations.length === 0 ? (
                  <p className="px-3 py-8 text-center text-[11px] text-muted-foreground italic">
                    {inboxTab === 'waiting'
                      ? 'No pending requests.'
                      : search
                        ? 'No conversations match your search.'
                        : 'No messages yet — tap New to start one.'}
                  </p>
                ) : (
                  filteredConversations.map((fold) => (
                    <ConvoRow
                      key={fold.id}
                      fold={fold}
                      me={me}
                      busy={busy}
                      onOpen={() => {
                        const id = peerIdOf(fold.memberIds, me);
                        openWithPeer(id, fold.members[id]?.name || 'Artist');
                      }}
                      onAccept={() => void respond(fold.id, true)}
                      onDecline={() => void respond(fold.id, false)}
                    />
                  ))
                )}
              </div>
            </>
          ) : null}

          {/* Compose — friend picker */}
          {view === 'compose' ? (
            <>
              <div className="shrink-0 border-b border-white/5 px-3 py-2">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search friends…"
                    className="h-8 border-white/10 bg-background/60 pl-8 text-xs"
                    autoFocus
                  />
                </div>
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto studio-scrollbar">
                {filteredFriends.length === 0 ? (
                  <p className="px-3 py-8 text-center text-[11px] text-muted-foreground italic">
                    {friends.length === 0
                      ? 'Add friends on The Block to message from the sheet.'
                      : 'No friends match your search.'}
                  </p>
                ) : (
                  filteredFriends.map((f) => {
                    const fold = folds.find((x) => x.id === foldIdFor(me, f.userId));
                    const wet = fold ? unreadFor(fold, me) > 0 : false;
                    return (
                      <button
                        key={f.userId}
                        type="button"
                        onClick={() => openWithPeer(f.userId, f.name)}
                        className="flex w-full items-center justify-between gap-2 border-b border-white/[0.04] px-3 py-2.5 text-left transition-colors hover:bg-amber-500/10"
                      >
                        <span className="truncate text-sm font-bold">{f.name}</span>
                        {wet ? (
                          <span className="h-2 w-2 shrink-0 rounded-full bg-amber-400 animate-pulse" />
                        ) : null}
                      </button>
                    );
                  })
                )}
              </div>
            </>
          ) : null}

          {/* Thread — full chat */}
          {view === 'thread' && peerId ? (
            <>
              <div
                ref={threadScrollRef}
                className="min-h-0 flex-1 overflow-y-auto studio-scrollbar px-3 py-3 space-y-3"
              >
                {bars.length === 0 ? (
                  <p className="py-6 text-center text-[11px] text-muted-foreground italic">
                    No messages yet — say hi.
                  </p>
                ) : (
                  bars.map((m, index) => {
                    const prev = bars[index - 1];
                    const firstOfDay = !prev || !isSameMessageDay(m.createdAt, prev.createdAt);
                    const mine = m.senderId === me;
                    const readStatus =
                      mine && receiptFold && peerId
                        ? outgoingReadStatus(receiptFold, peerId, bars, m, me)
                        : null;
                    return (
                      <React.Fragment key={m.id}>
                        {firstOfDay ? <FoldDateSeparator iso={m.createdAt} /> : null}
                      <div className={cn('flex flex-col', mine ? 'items-end' : 'items-start')}>
                        <span className="font-code text-[8px] uppercase tracking-wider text-muted-foreground/80">
                          {mine ? 'You' : peerName} · {foldMessageTimestamp(m.createdAt, firstOfDay)}
                        </span>
                        <p
                          className={cn(
                            'mt-0.5 max-w-[92%] whitespace-pre-wrap rounded-lg px-2.5 py-1.5 text-[13px] leading-snug',
                            mine ? 'bg-amber-500/20 text-amber-50' : 'bg-muted/50 text-foreground/90'
                          )}
                        >
                          {m.text}
                        </p>
                        {readStatus ? <FoldReadReceipt status={readStatus} compact /> : null}
                      </div>
                      </React.Fragment>
                    );
                  })
                )}
              </div>
              <div
                className="flex shrink-0 items-center gap-1.5 border-t border-white/10 p-2"
                data-composer-field
              >
                <EmojiPickerButton compact disabled={busy} onInsert={insertEmoji} />
                <Input
                  ref={composeRef}
                  value={text}
                  onChange={(e) => setText(e.target.value.slice(0, FOLD_BAR_MAX_CHARS))}
                  placeholder={`Message ${peerName}…`}
                  className="h-9 text-xs border-white/10 bg-background/60"
                  maxLength={FOLD_BAR_MAX_CHARS}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      void submit();
                    }
                  }}
                />
                <Button
                  type="button"
                  size="icon"
                  className="h-9 w-9 shrink-0"
                  disabled={busy || !text.trim()}
                  onClick={() => void submit()}
                >
                  <Send className="h-3.5 w-3.5" />
                </Button>
              </div>
            </>
          ) : null}
        </div>
      ) : null}

      <div className="pointer-events-auto relative">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => {
            if (open) closeAll();
            else setOpen(true);
          }}
          className={cn(
            'h-9 gap-1.5 border-amber-500/40 bg-card/95 text-amber-100 shadow-lg backdrop-blur-sm hover:bg-amber-500/15 font-code text-[9px] font-bold uppercase tracking-wider',
            open && 'border-amber-400/60 bg-amber-500/15'
          )}
          aria-expanded={open}
          aria-label="Sheet messages"
        >
          <MessageSquare className="h-4 w-4 shrink-0" />
          Msgs
          {open ? (
            <ChevronDown className="h-3 w-3 opacity-70" />
          ) : null}
        </Button>
        {unread > 0 && !open ? (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-500 px-1 text-[9px] font-bold text-black">
            {unread > 9 ? '9+' : unread}
          </span>
        ) : null}
      </div>
    </div>
  );
}

function ConvoRow({
  fold,
  me,
  busy,
  onOpen,
  onAccept,
  onDecline,
}: {
  fold: FoldDoc;
  me: string;
  busy: boolean;
  onOpen: () => void;
  onAccept: () => void;
  onDecline: () => void;
}) {
  const peer = fold.members[peerIdOf(fold.memberIds, me)];
  const wet = unreadFor(fold, me) > 0;
  const waiting = fold.status === 'pending' && fold.initiatedBy !== me;

  if (waiting) {
    return (
      <div
        className={cn(
          'border-b border-white/[0.04] px-3 py-2.5',
          wet && 'bg-amber-500/[0.07]'
        )}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold">{peer?.name || 'Artist'}</p>
            <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
              {foldPreview(fold.lastBar) || 'New message request'}
            </p>
          </div>
          {wet ? (
            <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-amber-400 animate-pulse" />
          ) : null}
        </div>
        <div className="mt-2 flex gap-2">
          <Button
            size="sm"
            className="h-7 flex-1 text-[9px] font-bold uppercase"
            disabled={busy}
            onClick={onAccept}
          >
            Accept
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-7 flex-1 text-[9px] font-bold uppercase text-muted-foreground"
            disabled={busy}
            onClick={onDecline}
          >
            Decline
          </Button>
        </div>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={onOpen}
      className={cn(
        'flex w-full items-start gap-2 border-b border-white/[0.04] px-3 py-2.5 text-left transition-colors hover:bg-amber-500/10',
        wet && 'bg-amber-500/[0.07]'
      )}
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <p className="truncate text-sm font-bold">{peer?.name || 'Artist'}</p>
          <span className="shrink-0 font-code text-[8px] uppercase tracking-wider text-muted-foreground">
            {convoTime(fold.lastAt)}
          </span>
        </div>
        <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
          {fold.lastSenderId === me && peerReadLastOutgoing(fold, me)
            ? 'Read by them · '
            : ''}
          {foldPreview(fold.lastBar) || 'No messages yet'}
        </p>
      </div>
      {wet ? (
        <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-amber-400 animate-pulse" />
      ) : null}
    </button>
  );
}
