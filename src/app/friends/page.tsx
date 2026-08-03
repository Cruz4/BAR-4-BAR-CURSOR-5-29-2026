'use client';

/**
 * Circle — your friends list + blocked artists.
 */

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Ban, Loader2, UserMinus, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { StudioLoader } from '@/components/studio-loader';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import {
  fetchBlockedUsers,
  fetchFriendships,
  friendProfilesOf,
  removeFriendship,
  unblockUser,
  type BlockedUser,
  type Friendship,
} from '@/lib/profile/social-client';
import { cn } from '@/lib/utils';

export default function FriendsPage() {
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [friendships, setFriendships] = useState<Friendship[]>([]);
  const [blocked, setBlocked] = useState<BlockedUser[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [tab, setTab] = useState<'friends' | 'blocked'>('friends');

  const reload = async () => {
    if (!user?.id) return;
    const [all, blocks] = await Promise.all([fetchFriendships(user.id), fetchBlockedUsers()]);
    setFriendships(all.filter((f) => f.status === 'accepted'));
    setBlocked(blocks);
  };

  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    void (async () => {
      try {
        await reload();
      } finally {
        if (!cancelled) setLoaded(true);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const friends = useMemo(
    () => (user?.id ? friendProfilesOf(friendships, user.id) : []),
    [friendships, user?.id]
  );

  if (authLoading) return <StudioLoader size="lg" fullscreen />;

  if (!user) {
    return (
      <div className="container mx-auto max-w-lg px-4 py-20 text-center space-y-4">
        <Users className="mx-auto h-10 w-10 text-primary" />
        <h1 className="font-headline text-2xl font-bold uppercase">Your circle</h1>
        <p className="text-sm text-muted-foreground">Sign in to see friends and manage blocks.</p>
        <Button className="font-bold uppercase" asChild>
          <Link href="/login">Sign in</Link>
        </Button>
      </div>
    );
  }

  const run = async (id: string, fn: () => Promise<void>, err: string) => {
    setBusyId(id);
    try {
      await fn();
      await reload();
    } catch (e) {
      toast({
        variant: 'destructive',
        title: err,
        description: e instanceof Error ? e.message : undefined,
      });
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="container mx-auto max-w-2xl space-y-6 px-4 py-8">
      <header className="space-y-1">
        <h1 className="font-headline text-3xl font-bold uppercase tracking-tight">Your circle</h1>
        <p className="text-sm text-muted-foreground">
          Friends on The Block · block anyone you don&apos;t want in your feed or requests.
        </p>
      </header>

      <div className="flex gap-2 border-b border-white/10 pb-2">
        <button
          type="button"
          onClick={() => setTab('friends')}
          className={cn(
            'rounded-lg px-3 py-1.5 text-xs font-bold uppercase tracking-widest transition-colors',
            tab === 'friends' ? 'bg-primary/15 text-primary' : 'text-muted-foreground hover:text-white'
          )}
        >
          Friends · {friends.length}
        </button>
        <button
          type="button"
          onClick={() => setTab('blocked')}
          className={cn(
            'rounded-lg px-3 py-1.5 text-xs font-bold uppercase tracking-widest transition-colors',
            tab === 'blocked' ? 'bg-primary/15 text-primary' : 'text-muted-foreground hover:text-white'
          )}
        >
          Blocked · {blocked.length}
        </button>
      </div>

      {!loaded ? (
        <div className="flex min-h-[30vh] items-center justify-center">
          <StudioLoader size="lg" />
        </div>
      ) : tab === 'friends' ? (
        friends.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/15 bg-black/20 px-6 py-14 text-center space-y-3">
            <p className="text-sm text-muted-foreground">
              No friends yet. Find artists on The Block or from their Artist Home.
            </p>
            <Button size="sm" variant="outline" className="h-9 font-bold uppercase" asChild>
              <Link href="/feed">Open The Block</Link>
            </Button>
          </div>
        ) : (
          <ul className="space-y-2">
            {friends.map((friend) => {
              const friendship = friendships.find((f) => f.uids.includes(friend.userId));
              return (
                <li
                  key={friend.userId}
                  className="flex items-center gap-3 rounded-xl border border-white/10 bg-black/25 px-3 py-2.5"
                >
                  <div className="min-w-0 flex-1">
                    {friend.slug ? (
                      <Link
                        href={`/profile/${friend.slug}`}
                        className="block truncate text-sm font-bold text-white hover:text-primary"
                      >
                        {friend.name}
                      </Link>
                    ) : (
                      <span className="block truncate text-sm font-bold text-white">{friend.name}</span>
                    )}
                  </div>
                  {friendship && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 gap-1 font-bold uppercase"
                      disabled={busyId === friend.userId}
                      onClick={() =>
                        void run(
                          friend.userId,
                          async () => {
                            await removeFriendship(friendship.id);
                            toast({ title: 'Removed from friends' });
                          },
                          'Could not remove friend'
                        )
                      }
                    >
                      {busyId === friend.userId ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <UserMinus className="h-3.5 w-3.5" />
                      )}
                      Unfriend
                    </Button>
                  )}
                </li>
              );
            })}
          </ul>
        )
      ) : blocked.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/15 bg-black/20 px-6 py-14 text-center">
          <p className="text-sm text-muted-foreground">Nobody blocked. You can block from an Artist Home.</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {blocked.map((entry) => (
            <li
              key={entry.blockedUserId}
              className="flex items-center gap-3 rounded-xl border border-white/10 bg-black/25 px-3 py-2.5"
            >
              <Ban className="h-4 w-4 shrink-0 text-muted-foreground" />
              <div className="min-w-0 flex-1">
                <span className="block truncate text-sm font-bold text-white">{entry.blockedName}</span>
              </div>
              <Button
                size="sm"
                variant="outline"
                className="h-8 font-bold uppercase"
                disabled={busyId === entry.blockedUserId}
                onClick={() =>
                  void run(
                    entry.blockedUserId,
                    async () => {
                      await unblockUser(entry.blockedUserId);
                      toast({ title: 'Unblocked' });
                    },
                    'Could not unblock'
                  )
                }
              >
                {busyId === entry.blockedUserId ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  'Unblock'
                )}
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
