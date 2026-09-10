'use client';

/**
 * Circle — your friends list + blocked artists.
 * Also: search/add artists and copy your referral invite from this page.
 */

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { StudioLoader } from '@/components/studio-loader';
import { FindArtistsPanel } from '@/components/profile/find-artists-panel';
import { ArtistStarAvatar } from '@/components/profile/artist-star-avatar';
import { InboxPageAtmosphere } from '@/components/inbox/inbox-page-atmosphere';
import { useAuth } from '@/hooks/use-auth';
import { useGamification } from '@/context/gamification-context';
import { useToast } from '@/hooks/use-toast';
import {
  enrichFriendProfilesWithLiveSlugs,
  fetchBlockedUsers,
  fetchFriendships,
  friendProfilesOf,
  removeFriendship,
  resolveCircleFriends,
  unblockUser,
  type BlockedUser,
  type CircleFriendRow,
  type Friendship,
} from '@/lib/profile/social-client';
import {
  circleBlockedSortLabels,
  circleFriendSortLabels,
  sortBlockedUsers,
  sortCircleFriends,
  type CircleBlockedSort,
  type CircleFriendSort,
} from '@/lib/circle-sort';
import { cn } from '@/lib/utils';
import { parseStudioBadge, studioNameClass } from '@/lib/studio-tier-chrome';
import { profileHref } from '@/lib/profile/profile-slug';
import { PassBarButton } from '@/components/folds/pass-bar-dialog';
import {
  ArrowUpDown,
  Ban,
  Loader2,
  Radio,
  SortAsc,
  SortDesc,
  UserMinus,
  Users,
} from 'lucide-react';

export default function FriendsPage() {
  const { user, loading: authLoading } = useAuth();
  const { summary } = useGamification();
  const { toast } = useToast();
  const [friendships, setFriendships] = useState<Friendship[]>([]);
  const [blocked, setBlocked] = useState<BlockedUser[]>([]);
  const [friends, setFriends] = useState<CircleFriendRow[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [tab, setTab] = useState<'friends' | 'blocked'>('friends');
  const [friendSort, setFriendSort] = useState<CircleFriendSort>('last-added');
  const [blockedSort, setBlockedSort] = useState<CircleBlockedSort>('recent');

  const viewerSlug = summary.profileSlug || undefined;

  const reload = async () => {
    if (!user?.id) return;
    try {
      const [all, blocks] = await Promise.all([fetchFriendships(user.id), fetchBlockedUsers()]);
      const accepted = all.filter((f) => f.status === 'accepted');
      setFriendships(accepted);
      setBlocked(blocks);

      const chips = friendProfilesOf(accepted, user.id, {
        email: user.email,
        displayName: user.displayName,
      });

      let base = chips;
      try {
        base = await enrichFriendProfilesWithLiveSlugs(chips);
      } catch (err) {
        console.warn('[friends] enrich failed', err);
      }

      try {
        setFriends(await resolveCircleFriends(base));
      } catch (err) {
        console.warn('[friends] resolve failed', err);
        setFriends(
          base.map((f) => ({
            userId: f.userId,
            name: f.name,
            isLivePublic: false,
          }))
        );
      }
    } catch (err) {
      console.warn('[friends] reload failed', err);
      toast({
        variant: 'destructive',
        title: 'Could not load friends',
        description: err instanceof Error ? err.message : 'Try refreshing',
      });
    }
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

  const sortedFriends = useMemo(
    () => (user?.id ? sortCircleFriends(friends, friendships, user.id, friendSort) : friends),
    [friends, friendships, friendSort, user?.id]
  );

  const sortedBlocked = useMemo(
    () => sortBlockedUsers(blocked, blockedSort),
    [blocked, blockedSort]
  );

  if (authLoading) return <StudioLoader size="lg" fullscreen />;

  if (!user) {
    return (
      <div className="relative min-h-[calc(100dvh-3.5rem)] overflow-hidden">
        <InboxPageAtmosphere variant="circle" />
        <div className="container relative z-10 mx-auto max-w-lg px-4 py-20 text-center space-y-4">
          <Users className="mx-auto h-10 w-10 text-sky-400" />
          <h1 className="font-headline text-2xl font-bold uppercase">Your circle</h1>
          <p className="text-sm text-muted-foreground">Sign in to see friends and manage blocks.</p>
          <Button className="font-bold uppercase" asChild>
            <Link href="/login">Sign in</Link>
          </Button>
        </div>
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

  const activeSortLabel =
    tab === 'friends' ? circleFriendSortLabels[friendSort] : circleBlockedSortLabels[blockedSort];

  return (
    <div className="relative min-h-[calc(100dvh-3.5rem)] overflow-hidden">
      <InboxPageAtmosphere variant="circle" />
      <div className="container relative z-10 mx-auto max-w-2xl space-y-6 px-4 py-8 font-code">
        <Card className="border-2 border-sky-500/25 bg-[#07111f]/75 shadow-[0_0_48px_rgba(56,189,248,0.1)] backdrop-blur-md">
          <CardHeader className="space-y-3">
            <CardTitle className="flex items-center gap-2 font-headline text-2xl uppercase tracking-tight">
              <Users className="h-6 w-6 text-sky-400" /> Your circle
            </CardTitle>
            <CardDescription className="text-sm leading-relaxed">
              Add artists, share your referral invite, manage friends, and unblock anyone you cut.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <FindArtistsPanel viewerSlug={viewerSlug} />

            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-2">
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setTab('friends')}
                  className={cn(
                    'rounded-lg px-3 py-1.5 text-xs font-bold uppercase tracking-widest transition-colors',
                    tab === 'friends'
                      ? 'bg-sky-500/15 text-sky-300'
                      : 'text-muted-foreground hover:text-white'
                  )}
                >
                  Friends · {friends.length}
                </button>
                <button
                  type="button"
                  onClick={() => setTab('blocked')}
                  className={cn(
                    'rounded-lg px-3 py-1.5 text-xs font-bold uppercase tracking-widest transition-colors',
                    tab === 'blocked'
                      ? 'bg-sky-500/15 text-sky-300'
                      : 'text-muted-foreground hover:text-white'
                  )}
                >
                  Blocked · {blocked.length}
                </button>
              </div>

              {(tab === 'friends' ? friends.length : blocked.length) > 0 ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      title={`Sort: ${activeSortLabel}`}
                      className="h-8 gap-1.5 border-sky-500/20 bg-black/30 text-[10px] font-bold uppercase tracking-widest"
                    >
                      <ArrowUpDown className="h-3.5 w-3.5" />
                      {activeSortLabel}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="bg-card border-border">
                    {tab === 'friends' ? (
                      <>
                        <DropdownMenuItem
                          onClick={() => setFriendSort('last-added')}
                          className="text-[10px] font-bold uppercase"
                        >
                          <SortDesc className="mr-2 h-4 w-4" /> Last added
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => setFriendSort('oldest')}
                          className="text-[10px] font-bold uppercase"
                        >
                          <SortAsc className="mr-2 h-4 w-4" /> Oldest first
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => setFriendSort('alphabetical')}
                          className="text-[10px] font-bold uppercase"
                        >
                          <SortAsc className="mr-2 h-4 w-4" /> A–Z
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => setFriendSort('live-first')}
                          className="text-[10px] font-bold uppercase"
                        >
                          <Radio className="mr-2 h-4 w-4" /> Live first
                        </DropdownMenuItem>
                      </>
                    ) : (
                      <>
                        <DropdownMenuItem
                          onClick={() => setBlockedSort('recent')}
                          className="text-[10px] font-bold uppercase"
                        >
                          <SortDesc className="mr-2 h-4 w-4" /> Recently blocked
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => setBlockedSort('oldest')}
                          className="text-[10px] font-bold uppercase"
                        >
                          <SortAsc className="mr-2 h-4 w-4" /> Oldest first
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => setBlockedSort('alphabetical')}
                          className="text-[10px] font-bold uppercase"
                        >
                          <SortAsc className="mr-2 h-4 w-4" /> A–Z
                        </DropdownMenuItem>
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : null}
            </div>

            {!loaded ? (
              <div className="flex min-h-[30vh] items-center justify-center">
                <StudioLoader size="lg" />
              </div>
            ) : tab === 'friends' ? (
              friends.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-sky-500/20 bg-black/25 px-6 py-14 text-center space-y-3">
                  <p className="text-sm text-muted-foreground">
                    No friends yet. Search above to invite someone on the app, or copy your referral
                    invite for artists who haven&apos;t joined.
                  </p>
                </div>
              ) : (
                <ul className="space-y-2">
                  {sortedFriends.map((friend) => {
                    const friendship = friendships.find((f) => f.uids.includes(friend.userId));
                    const href =
                      friend.isLivePublic && friend.slug ? profileHref(friend.slug) : undefined;
                    const profileInner = (
                      <>
                        <ArtistStarAvatar
                          name={friend.name}
                          avatarUrl={friend.avatarUrl}
                          useStarMark={friend.starMarkUseStar}
                          starMarkSeed={friend.starMarkSeed}
                          studioChrome={parseStudioBadge(friend.studioBadge) || 'free'}
                          size={36}
                        />
                        <span
                          className={cn(
                            'min-w-0 truncate text-sm font-bold group-hover:text-sky-300',
                            studioNameClass(parseStudioBadge(friend.studioBadge) || 'free')
                          )}
                        >
                          {friend.name}
                          {!friend.isLivePublic ? (
                            <span className="ml-1.5 font-medium text-muted-foreground group-hover:text-muted-foreground">
                              (offline)
                            </span>
                          ) : null}
                        </span>
                      </>
                    );
                    return (
                      <li
                        key={friend.userId}
                        className="flex items-center gap-3 rounded-xl border border-sky-500/15 bg-black/35 px-3 py-2.5 backdrop-blur-sm transition-colors hover:border-sky-400/30 hover:bg-sky-500/[0.06]"
                      >
                        <div className="min-w-0 flex-1">
                          {href ? (
                            <Link href={href} className="group flex items-center gap-3">
                              {profileInner}
                            </Link>
                          ) : (
                            <div className="flex items-center gap-3">{profileInner}</div>
                          )}
                        </div>
                        {friendship && (
                          <>
                            <PassBarButton
                              peerId={friend.userId}
                              peerName={friend.name}
                              senderSlug={viewerSlug}
                              size="xs"
                            />
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
                          </>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )
            ) : blocked.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-sky-500/20 bg-black/25 px-6 py-14 text-center">
                <p className="text-sm text-muted-foreground">
                  Nobody blocked. You can block from an Artist Home.
                </p>
              </div>
            ) : (
              <ul className="space-y-2">
                {sortedBlocked.map((entry) => (
                  <li
                    key={entry.blockedUserId}
                    className="flex items-center gap-3 rounded-xl border border-sky-500/15 bg-black/35 px-3 py-2.5 backdrop-blur-sm"
                  >
                    <Ban className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <div className="min-w-0 flex-1">
                      {entry.blockedSlug ? (
                        <Link
                          href={profileHref(entry.blockedSlug) || `/${entry.blockedSlug}`}
                          className="block truncate text-sm font-bold text-white hover:text-sky-300"
                        >
                          {entry.blockedName}
                        </Link>
                      ) : (
                        <span className="block truncate text-sm font-bold text-white">
                          {entry.blockedName}
                        </span>
                      )}
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 border-sky-500/20 font-bold uppercase"
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
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
