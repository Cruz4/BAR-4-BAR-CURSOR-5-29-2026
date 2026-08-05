'use client';

/**
 * Circle — your friends list + blocked artists.
 * Also: search/add artists and copy your referral invite from this page.
 */

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Ban, Loader2, UserMinus, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { StudioLoader } from '@/components/studio-loader';
import { FindArtistsPanel } from '@/components/profile/find-artists-panel';
import { useAuth } from '@/hooks/use-auth';
import { useGamification } from '@/context/gamification-context';
import { useToast } from '@/hooks/use-toast';
import {
  fetchBlockedUsers,
  fetchFriendships,
  fetchPublicArtistMetas,
  friendProfilesOf,
  removeFriendship,
  unblockUser,
  type BlockedUser,
  type Friendship,
} from '@/lib/profile/social-client';
import { cn } from '@/lib/utils';

type FriendRow = {
  userId: string;
  name: string;
  slug?: string;
  avatarUrl?: string;
};

export default function FriendsPage() {
  const { user, loading: authLoading } = useAuth();
  const { summary } = useGamification();
  const { toast } = useToast();
  const [friendships, setFriendships] = useState<Friendship[]>([]);
  const [blocked, setBlocked] = useState<BlockedUser[]>([]);
  const [friends, setFriends] = useState<FriendRow[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [tab, setTab] = useState<'friends' | 'blocked'>('friends');

  // Keep slug even when profile isn't live so friendship docs stay linkable later.
  const viewerSlug = summary.profileSlug || undefined;

  const reload = async () => {
    if (!user?.id) return;
    const [all, blocks] = await Promise.all([fetchFriendships(user.id), fetchBlockedUsers()]);
    const accepted = all.filter((f) => f.status === 'accepted');
    setFriendships(accepted);
    setBlocked(blocks);

    const base = friendProfilesOf(accepted, user.id);
    const metas = await fetchPublicArtistMetas(base);
    setFriends(
      base.map((f) => {
        const meta = metas.get(f.userId);
        return {
          userId: f.userId,
          name: meta?.displayName || f.name,
          slug: meta?.slug || f.slug,
          avatarUrl: meta?.avatarUrl,
        };
      })
    );
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
          Add artists, share your referral invite, manage friends, and unblock anyone you cut.
        </p>
      </header>

      <FindArtistsPanel viewerSlug={viewerSlug} />

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
              No friends yet. Search above to invite someone on the app, or copy your referral invite for
              artists who haven&apos;t joined.
            </p>
          </div>
        ) : (
          <ul className="space-y-2">
            {friends.map((friend) => {
              const friendship = friendships.find((f) => f.uids.includes(friend.userId));
              const initial = (friend.name.trim().charAt(0) || '?').toUpperCase();
              const profileInner = (
                <>
                  <Avatar className="h-9 w-9 border border-white/10">
                    {friend.avatarUrl ? <AvatarImage src={friend.avatarUrl} alt="" /> : null}
                    <AvatarFallback className="bg-primary/15 text-xs font-bold text-primary">
                      {initial}
                    </AvatarFallback>
                  </Avatar>
                  <span className="min-w-0 truncate text-sm font-bold text-white group-hover:text-primary">
                    {friend.name}
                  </span>
                </>
              );
              return (
                <li
                  key={friend.userId}
                  className="flex items-center gap-3 rounded-xl border border-white/10 bg-black/25 px-3 py-2.5"
                >
                  <div className="min-w-0 flex-1">
                    {friend.slug ? (
                      <Link
                        href={`/profile/${friend.slug}`}
                        className="group flex items-center gap-3"
                      >
                        {profileInner}
                      </Link>
                    ) : (
                      <div className="flex items-center gap-3">{profileInner}</div>
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
                {entry.blockedSlug ? (
                  <Link
                    href={`/profile/${entry.blockedSlug}`}
                    className="block truncate text-sm font-bold text-white hover:text-primary"
                  >
                    {entry.blockedName}
                  </Link>
                ) : (
                  <span className="block truncate text-sm font-bold text-white">{entry.blockedName}</span>
                )}
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
