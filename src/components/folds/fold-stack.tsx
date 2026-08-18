'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { MessageSquare, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { StudioLoader } from '@/components/studio-loader';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { useFoldInbox } from '@/components/folds/fold-inbox-provider';
import { PassBarDialog } from '@/components/folds/pass-bar-dialog';
import {
  acceptFoldClient,
  declineFoldClient,
  deleteFoldFromInboxClient,
  foldBackClient,
} from '@/lib/folds/client';
import { peerIdOf, unreadFor, type FoldDoc } from '@/lib/folds/types';
import { cn } from '@/lib/utils';
import { fetchFriendships, friendProfilesOf } from '@/lib/profile/social-client';
import { useGamification } from '@/context/gamification-context';

function timeLabel(iso: string): string {
  try {
    return formatDistanceToNow(new Date(iso), { addSuffix: true });
  } catch {
    return '';
  }
}

function FoldCard({
  fold,
  me,
  onAccept,
  onDecline,
  onFoldBack,
  onDelete,
  busy,
}: {
  fold: FoldDoc;
  me: string;
  onAccept: (id: string) => void;
  onDecline: (id: string) => void;
  onFoldBack: (id: string) => void;
  onDelete: (id: string) => void;
  busy: boolean;
}) {
  const peerId = peerIdOf(fold.memberIds, me);
  const peer = fold.members[peerId];
  const wet = unreadFor(fold, me) > 0;
  const waiting = fold.status === 'pending' && fold.initiatedBy !== me;
  const sentPending = fold.status === 'pending' && fold.initiatedBy === me;

  return (
    <article
      className={cn(
        'relative overflow-hidden border transition-all',
        wet
          ? 'border-amber-400/50 bg-amber-500/[0.07] shadow-[0_0_28px_rgba(251,191,36,0.12)]'
          : 'border-white/10 bg-[#14110d]/80',
        fold.status === 'declined' && 'opacity-50'
      )}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-3 left-1/2 w-px bg-gradient-to-b from-transparent via-amber-200/25 to-transparent"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -right-6 -top-8 h-16 w-16 rotate-45 border-l border-amber-200/20 bg-amber-100/[0.04]"
      />
      <Link href={`/folds/${fold.id}`} className="block px-4 py-3.5 pr-10">
        <div className="flex items-baseline justify-between gap-3">
          <p className="truncate font-headline text-lg uppercase tracking-tight text-amber-50">
            {peer?.name || 'Artist'}
          </p>
          <span className="shrink-0 font-code text-[10px] uppercase tracking-widest text-muted-foreground">
            {timeLabel(fold.lastAt)}
          </span>
        </div>
        <p className="mt-2 font-serif text-[15px] leading-relaxed text-amber-50/85">
          {fold.lastBar || 'No messages yet'}
        </p>
        <p className="mt-2 font-code text-[9px] font-bold uppercase tracking-[0.22em] text-amber-200/70">
          {waiting
            ? 'New · accept to keep it'
            : sentPending
              ? 'Waiting · they haven’t opened it'
              : wet
                ? `Unread · ${unreadFor(fold, me)}`
                : 'Read'}
        </p>
      </Link>
      {waiting ? (
        <div className="flex gap-2 border-t border-amber-500/15 px-4 py-2">
          <Button
            size="sm"
            className="h-8 rounded-none bg-amber-700 px-3 text-[10px] font-bold uppercase tracking-widest hover:bg-amber-600"
            disabled={busy}
            onClick={() => onAccept(fold.id)}
          >
            Accept
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-8 rounded-none px-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground"
            disabled={busy}
            onClick={() => onDecline(fold.id)}
          >
            Decline
          </Button>
        </div>
      ) : fold.status !== 'declined' ? (
        <div className="flex items-center justify-between border-t border-white/5 px-4 py-1.5">
          <button
            type="button"
            disabled={busy}
            onClick={() => onDelete(fold.id)}
            className="inline-flex items-center gap-1 font-code text-[9px] font-bold uppercase tracking-widest text-muted-foreground hover:text-foreground"
          >
            <Trash2 className="h-3 w-3" />
            Delete
          </button>
          {!wet ? (
            <button
              type="button"
              disabled={busy}
              onClick={() => onFoldBack(fold.id)}
              className="font-code text-[9px] font-bold uppercase tracking-widest text-amber-200/55 hover:text-amber-100"
            >
              Mark unread
            </button>
          ) : <span />}
        </div>
      ) : null}
    </article>
  );
}

export function FoldStack() {
  const { user } = useAuth();
  const { summary } = useGamification();
  const { toast } = useToast();
  const { folds, ready, waiting } = useFoldInbox();
  const [tab, setTab] = useState<'open' | 'waiting'>('open');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [pickOpen, setPickOpen] = useState(false);
  const [friends, setFriends] = useState<Array<{ userId: string; name: string }>>([]);
  const [peer, setPeer] = useState<{ userId: string; name: string } | null>(null);

  const mine = user?.id || '';
  const openFolds = useMemo(
    () =>
      folds.filter(
        (f) =>
          !f.deletedFor?.[mine] &&
          f.status !== 'declined' &&
          !(f.status === 'pending' && f.initiatedBy !== mine)
      ),
    [folds, mine]
  );
  const waitingFolds = useMemo(
    () => folds.filter((f) => !f.deletedFor?.[mine] && f.status === 'pending' && f.initiatedBy !== mine),
    [folds, mine]
  );

  const openPicker = async () => {
    if (!user) return;
    try {
      const list = await fetchFriendships(user.id, 'accepted');
      setFriends(
        friendProfilesOf(list, user.id, { email: user.email, displayName: user.displayName }).map((f) => ({
          userId: f.userId,
          name: f.name,
        }))
      );
    } catch {
      setFriends([]);
    }
    setPickOpen(true);
  };

  const respond = async (id: string, accept: boolean) => {
    setBusyId(id);
    try {
      if (accept) await acceptFoldClient(id);
      else await declineFoldClient(id);
      toast({ title: accept ? 'Message accepted' : 'Message declined' });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: accept ? 'Could not accept' : 'Could not decline',
        description: error instanceof Error ? error.message : undefined,
      });
    } finally {
      setBusyId(null);
    }
  };

  const foldBack = async (id: string) => {
    setBusyId(id);
    try {
      await foldBackClient(id);
      toast({ title: 'Marked unread' });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Could not mark unread',
        description: error instanceof Error ? error.message : undefined,
      });
    } finally {
      setBusyId(null);
    }
  };

  const deleteFromInbox = async (id: string) => {
    setBusyId(id);
    try {
      await deleteFoldFromInboxClient(id);
      toast({ title: 'Deleted from inbox' });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Could not delete',
        description: error instanceof Error ? error.message : undefined,
      });
    } finally {
      setBusyId(null);
    }
  };

  if (!user) return null;

  const rows = tab === 'waiting' ? waitingFolds : openFolds;

  return (
    <div className="mx-auto w-full max-w-xl space-y-5 px-4 py-8">
      <header className="space-y-2">
        <h1 className="font-headline text-4xl font-bold uppercase tracking-tight">Msgs</h1>
      </header>

      <div className="flex flex-wrap items-center gap-2">
        <Button
          className="h-9 rounded-none bg-amber-700 font-bold uppercase tracking-[0.18em] text-amber-50 hover:bg-amber-600"
          onClick={() => void openPicker()}
        >
          <MessageSquare className="h-4 w-4" />
          New message
        </Button>
        <div className="ml-auto flex border border-white/10">
          {(['open', 'waiting'] as const).map((id) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={cn(
                'h-9 px-3 font-code text-[10px] font-bold uppercase tracking-widest',
                tab === id ? 'bg-amber-500/15 text-amber-100' : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {id === 'open' ? 'Inbox' : `Requests${waiting ? ` ${waiting}` : ''}`}
            </button>
          ))}
        </div>
      </div>

      {!ready ? (
        <div className="flex justify-center py-16">
          <StudioLoader size="md" message="Opening Msgs…" />
        </div>
      ) : rows.length === 0 ? (
        <div className="border border-dashed border-amber-500/20 bg-black/20 px-6 py-14 text-center">
          <MessageSquare className="mx-auto mb-3 h-7 w-7 text-amber-400/70" />
          <p className="font-headline text-lg uppercase">
            {tab === 'waiting' ? 'No requests' : 'No messages yet'}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {tab === 'waiting'
              ? 'Messages from people you aren’t friends with land here until you accept.'
              : 'Send a message from a friend’s Artist Home, or from Your circle.'}
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {rows.map((fold) => (
            <FoldCard
              key={fold.id}
              fold={fold}
              me={user.id}
              busy={busyId === fold.id}
              onAccept={(id) => void respond(id, true)}
              onDecline={(id) => void respond(id, false)}
              onFoldBack={(id) => void foldBack(id)}
              onDelete={(id) => void deleteFromInbox(id)}
            />
          ))}
        </div>
      )}

      {peer ? (
        <PassBarDialog
          open
          onOpenChange={(next) => {
            if (!next) setPeer(null);
          }}
          peerId={peer.userId}
          peerName={peer.name}
          senderSlug={summary.profileSlug || undefined}
        />
      ) : null}

      {pickOpen ? (
        <FriendPick
          friends={friends}
          onClose={() => setPickOpen(false)}
          onPick={(f) => {
            setPickOpen(false);
            setPeer(f);
          }}
        />
      ) : null}
    </div>
  );
}

function FriendPick({
  friends,
  onClose,
  onPick,
}: {
  friends: Array<{ userId: string; name: string }>;
  onClose: () => void;
  onPick: (friend: { userId: string; name: string }) => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-4 sm:items-center">
      <div className="w-full max-w-sm border border-amber-500/25 bg-[#120e0a] p-4 shadow-2xl">
        <p className="font-headline text-lg uppercase">Who do you want to message?</p>
        <p className="mt-1 text-xs text-muted-foreground">Friends first. You can also message from any Artist Home.</p>
        <ul className="mt-3 max-h-64 space-y-1 overflow-y-auto">
          {friends.length === 0 ? (
            <li className="px-2 py-6 text-center text-sm text-muted-foreground">No friends yet.</li>
          ) : (
            friends.map((friend) => (
              <li key={friend.userId}>
                <button
                  type="button"
                  onClick={() => onPick(friend)}
                  className="w-full truncate px-3 py-2 text-left text-sm font-bold hover:bg-amber-500/10"
                >
                  {friend.name}
                </button>
              </li>
            ))
          )}
        </ul>
        <Button variant="ghost" className="mt-3 h-9 w-full rounded-none text-[10px] font-bold uppercase" onClick={onClose}>
          Close
        </Button>
      </div>
    </div>
  );
}
