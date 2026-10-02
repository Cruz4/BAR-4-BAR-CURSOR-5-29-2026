'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { formatDistanceToNow } from 'date-fns';
import {
  Bell,
  Bookmark,
  ChevronRight,
  Droplets,
  FilePenLine,
  Flame,
  Heart,
  Import,
  Library,
  Lock,
  Mail,
  MailOpen,
  MessageCircle,
  Banknote,
  Repeat2,
  Star,
  UserPlus,
  Users,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { ArtistHomeLink } from '@/components/profile/artist-home-link';
import { LiveArtistStarAvatar } from '@/components/profile/artist-star-avatar';
import {
  fetchActivityFeed,
  FRIENDSHIP_CHANGED_EVENT,
  markActivityEventsRead,
  markActivityEventsUnread,
  markAllActivityEventsRead,
  markAllActivityEventsUnread,
  type FriendshipChangedDetail,
} from '@/lib/activity/client';
import { navigateActivityHref, resolveActivityOpenHref } from '@/lib/activity/href';
import {
  activityDefersReadOnOpen,
  activityShowsActor,
  activityVerb,
  isActivityUnread,
  type ActivityEvent,
  type ActivityType,
} from '@/lib/activity/types';
import { refreshActivityAlerts } from '@/hooks/use-activity-alerts';
import { useAuth } from '@/hooks/use-auth';
import { StudioLoader } from '@/components/studio-loader';
import { fetchFriendships } from '@/lib/profile/social-client';
import { fetchPendingContactRequesterIds } from '@/lib/profile/contact-client';
import { InboxBulkReadToggle } from '@/components/inbox-bulk-read-toggle';

function TypeIcon({ type }: { type: ActivityType }) {
  const className = 'h-3.5 w-3.5 shrink-0';
  switch (type) {
    case 'friend_request':
    case 'friend_accepted':
      return <UserPlus className={cn(className, 'text-emerald-400')} />;
    case 'profile_followed':
      return <Heart className={cn(className, 'text-fuchsia-400')} />;
    case 'inner_circle_joined':
      return <Star className={cn(className, 'fill-amber-300 text-amber-300')} />;
    case 'contact_request':
    case 'contact_accepted':
      return <Mail className={cn(className, 'text-sky-400')} />;
    case 'fold_pass':
      return <MessageCircle className={cn(className, 'text-amber-400')} />;
    case 'collab_invite':
    case 'collab_edit':
    case 'collab_message':
      return <Users className={cn(className, 'text-violet-400')} />;
    case 'post_love':
      return <Heart className={cn(className, 'text-rose-400')} />;
    case 'post_reply':
      return <MessageCircle className={cn(className, 'text-sky-400')} />;
    case 'post_reverb':
      return <Repeat2 className={cn(className, 'text-violet-400')} />;
    case 'post_imprint_saved':
    case 'profile_imprint_saved':
      return <Bookmark className={cn(className, 'text-fuchsia-400')} />;
    case 'dna_import':
      return <Import className={cn(className, 'text-amber-400')} />;
    case 'drop_loved':
      return <Heart className={cn(className, 'text-fuchsia-400')} />;
    case 'drop_reply':
      return <MessageCircle className={cn(className, 'text-fuchsia-400')} />;
    case 'drop_unlocked':
      return <Flame className={cn(className, 'text-fuchsia-400')} />;
    case 'drop_sold':
      return <Banknote className={cn(className, 'text-emerald-400')} />;
    case 'house_release':
      return <Library className={cn(className, 'text-amber-300')} />;
    case 'love_milestone':
      return <Droplets className={cn(className, 'text-violet-300')} />;
    case 'lock_answered':
    case 'lock_clear_offer':
      return <Lock className={cn(className, 'text-emerald-400')} />;
    case 'verse_open':
      return <FilePenLine className={cn(className, 'text-sky-400')} />;
    case 'streak_risk':
      return <Flame className={cn(className, 'text-amber-400')} />;
    default:
      return <Bell className={className} />;
  }
}

function timeAgo(iso: string): string {
  try {
    return formatDistanceToNow(new Date(iso), { addSuffix: true });
  } catch {
    return '';
  }
}

const PREVIEW_LIMIT = 5;

export function ActivityNavDropdown({
  unreadCount,
}: {
  unreadCount: number;
}) {
  const router = useRouter();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<ActivityEvent[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [hiddenNewCount, setHiddenNewCount] = useState(0);
  const sessionUnreadIdsRef = useRef<Set<string>>(new Set());

  const withSessionUnreadHighlight = useCallback((events: ActivityEvent[]) => {
    const sessionUnreadIds = sessionUnreadIdsRef.current;
    return events.map((event) =>
      sessionUnreadIds.has(event.id) ? { ...event, readAt: null } : event
    );
  }, []);

  const loadRecent = useCallback(async () => {
    if (!user?.id) {
      setItems([]);
      return;
    }
    setLoading(true);
    try {
      const uid = user.id;
      const [received, pendingFriends, pendingContactIds] = await Promise.all([
        fetchActivityFeed('received', 40),
        fetchFriendships(uid, 'pending').catch(() => []),
        fetchPendingContactRequesterIds().catch(() => []),
      ]);
      const pendingRequesters = new Set(
        pendingFriends
          .filter((f) => f.status === 'pending' && f.requestedBy !== uid)
          .map((f) => f.requestedBy)
      );
      const pendingContact = new Set(pendingContactIds);
      // Drop request rows already answered elsewhere; keep every other recent event, read or unread.
      const visibleActivity = received.filter((e) => {
          if (e.type === 'friend_request') {
            return e.direction === 'received' && pendingRequesters.has(e.actorId);
          }
          if (e.type === 'contact_request') {
            return e.direction === 'received' && pendingContact.has(e.actorId);
          }
          return true;
        });
      const recent = [...visibleActivity]
        .sort((a, b) => {
          const aUnread = a.readAt ? 0 : 1;
          const bUnread = b.readAt ? 0 : 1;
          if (aUnread !== bUnread) return bUnread - aUnread;
          return b.createdAt.localeCompare(a.createdAt);
        })
        .slice(0, PREVIEW_LIMIT);
      for (const event of recent) {
        if (!event.readAt) sessionUnreadIdsRef.current.add(event.id);
      }
      setHiddenNewCount(Math.max(0, unreadCount - recent.filter((event) => !event.readAt).length));
      const lookups = recent
        .filter((e) => !e.actorSlug && e.actorId)
        .map((e) => ({ userId: e.actorId }));
      if (lookups.length) {
        const { fetchPublicArtistMetas } = await import('@/lib/profile/social-client');
        const metas = await fetchPublicArtistMetas(lookups);
        const resolved = recent.map((e) => {
            if (e.actorSlug) return e;
            const slug = metas.get(e.actorId)?.slug;
            return slug ? { ...e, actorSlug: slug } : e;
          });
        setItems(withSessionUnreadHighlight(resolved));
      } else {
        setItems(withSessionUnreadHighlight(recent));
      }
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [unreadCount, user?.id, withSessionUnreadHighlight]);

  useEffect(() => {
    const onFriendshipChanged = (ev: Event) => {
      const detail = (ev as CustomEvent<FriendshipChangedDetail>).detail;
      if (!detail || (detail.action !== 'accepted' && detail.action !== 'removed')) return;
      setItems((prev) =>
        prev.filter((e) => {
          if (detail.clearedActivityIds?.includes(e.id)) return false;
          if (
            e.type === 'friend_request' &&
            detail.peerUserId &&
            e.actorId === detail.peerUserId
          ) {
            return false;
          }
          return true;
        })
      );
    };
    window.addEventListener(FRIENDSHIP_CHANGED_EVENT, onFriendshipChanged);
    return () => window.removeEventListener(FRIENDSHIP_CHANGED_EVENT, onFriendshipChanged);
  }, []);

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (!next) return;

    setHiddenNewCount(Math.max(0, unreadCount - PREVIEW_LIMIT));
    void loadRecent();
  };

  const markOneRead = async (event: ActivityEvent, e?: React.MouseEvent) => {
    e?.preventDefault();
    e?.stopPropagation();
    if (busyId || event.readAt) return;
    setBusyId(event.id);
    try {
      await markActivityEventsRead([event.id]);
      sessionUnreadIdsRef.current.delete(event.id);
      const readAt = new Date().toISOString();
      setItems((prev) =>
        prev.map((item) => (item.id === event.id ? { ...item, readAt } : item))
      );
      refreshActivityAlerts();
    } finally {
      setBusyId(null);
    }
  };

  const markOneUnread = async (event: ActivityEvent, e?: React.MouseEvent) => {
    e?.preventDefault();
    e?.stopPropagation();
    if (busyId || !event.readAt) return;
    setBusyId(event.id);
    try {
      await markActivityEventsUnread([event.id]);
      sessionUnreadIdsRef.current.add(event.id);
      setItems((prev) => prev.map((item) => (item.id === event.id ? { ...item, readAt: null } : item)));
      refreshActivityAlerts();
    } finally {
      setBusyId(null);
    }
  };

  const handleMarkAllRead = async () => {
    if (bulkBusy) return;
    setBulkBusy(true);
    try {
      await markAllActivityEventsRead();
      sessionUnreadIdsRef.current.clear();
      const readAt = new Date().toISOString();
      setItems((prev) => prev.map((event) => (event.readAt ? event : { ...event, readAt })));
      setHiddenNewCount(0);
      refreshActivityAlerts();
    } finally {
      setBulkBusy(false);
    }
  };

  const handleMarkAllUnread = async () => {
    if (bulkBusy) return;
    setBulkBusy(true);
    try {
      await markAllActivityEventsUnread();
      for (const event of items) sessionUnreadIdsRef.current.add(event.id);
      setItems((prev) => prev.map((event) => ({ ...event, readAt: null })));
      refreshActivityAlerts();
    } finally {
      setBulkBusy(false);
    }
  };

  const openEvent = async (event: ActivityEvent) => {
    setOpen(false);
    if (!event.readAt && !activityDefersReadOnOpen(event.type)) {
      try {
        const readAt = new Date().toISOString();
        await markActivityEventsRead([event.id]);
        sessionUnreadIdsRef.current.delete(event.id);
        setItems((prev) =>
          prev.map((item) => (item.id === event.id ? { ...item, readAt } : item))
        );
        refreshActivityAlerts();
      } catch {
        /* still navigate */
      }
    }
    const href = await resolveActivityOpenHref(event, { viewerUserId: user?.id });
    navigateActivityHref((h) => router.push(h), href);
  };

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            'relative h-8 w-8 shrink-0 overflow-visible text-emerald-400 hover:bg-emerald-500/10 md:h-9 md:w-9',
            unreadCount > 0 && 'z-20'
          )}
          aria-label={unreadCount > 0 ? `Activity, ${unreadCount} unread` : 'Activity'}
        >
          <Bell className="h-4 w-4 md:h-5 md:w-5" />
          {unreadCount > 0 && (
            <span className="pointer-events-none absolute right-0 top-0 z-30 flex h-4 min-w-4 translate-x-[30%] -translate-y-[30%] items-center justify-center rounded-full bg-emerald-500 px-1 text-[9px] font-bold leading-none text-black shadow">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        side="bottom"
        collisionPadding={8}
        className={cn(
          'header-nav-popover-content p-0 bg-card border-2 shadow-2xl overflow-hidden',
          'w-[min(22rem,calc(100vw-1.25rem))]'
        )}
      >
        <div className="flex items-center justify-between gap-2 border-b bg-muted/30 px-3 py-2.5">
          <h4 className="text-[10px] font-bold uppercase tracking-widest text-emerald-400 flex items-center gap-1.5">
            <Bell className="h-3 w-3" /> Recent activity
          </h4>
          <InboxBulkReadToggle
            unreadCount={unreadCount}
            onMarkAllRead={handleMarkAllRead}
            onMarkAllUnread={handleMarkAllUnread}
            busy={bulkBusy}
            variant="emerald"
            compact
          />
        </div>

        <div className="max-h-[min(22rem,50vh)] overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-10 text-muted-foreground">
              <StudioLoader size="sm" />
              <span className="text-[10px] font-code uppercase tracking-wider">Loading</span>
            </div>
          ) : items.length === 0 ? (
            <div className="px-4 py-10 text-center">
              <Bell className="mx-auto mb-2 h-7 w-7 text-muted-foreground/40" />
              <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                No activity yet
              </p>
              <p className="mt-1 text-[10px] text-muted-foreground/80">
                New notifications will show here.
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-border/60">
              {items.map((event) => {
                const unread = isActivityUnread(event);
                return (
                <li
                  key={event.id}
                  className={cn(
                    'group relative',
                    unread &&
                      'bg-emerald-500/[0.12] before:pointer-events-none before:absolute before:bottom-2 before:left-0 before:top-2 before:z-10 before:w-1 before:rounded-full before:bg-emerald-400 before:shadow-[0_0_10px_rgba(52,211,153,0.85)]'
                  )}
                >
                  <button
                    type="button"
                    className={cn(
                      'relative z-0 flex w-full gap-2.5 px-3 py-2.5 pr-11 text-left transition-colors',
                      unread ? 'hover:bg-emerald-500/10' : 'hover:bg-emerald-500/5'
                    )}
                    onClick={() => void openEvent(event)}
                  >
                    <span className="mt-0.5 shrink-0">
                      {activityShowsActor(event.type) ? (
                        <LiveArtistStarAvatar
                          name={event.actorName}
                          userId={event.actorId}
                          slug={event.actorSlug}
                          size={32}
                          link={false}
                        />
                      ) : (
                        <span className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-black/30">
                          <TypeIcon type={event.type} />
                        </span>
                      )}
                    </span>
                    <span className="min-w-0 flex-1 pr-7">
                      <span className="block text-[12px] leading-snug">
                        {activityShowsActor(event.type) ? (
                          <>
                            <ArtistHomeLink
                              userId={event.actorId}
                              slug={event.actorSlug}
                              className={cn(
                                'font-bold hover:underline',
                                unread ? 'text-emerald-50' : 'text-foreground'
                              )}
                              onNavigate={() => setOpen(false)}
                            >
                              {event.actorName}
                            </ArtistHomeLink>{' '}
                            <span className="text-muted-foreground">
                              {activityVerb(event.type, 'received')}
                            </span>
                          </>
                        ) : (
                          <span className="font-bold text-foreground">
                            {activityVerb(event.type, 'received')}
                          </span>
                        )}
                      </span>
                      {event.preview ? (
                        <span className="mt-0.5 line-clamp-1 block font-code text-[10px] text-muted-foreground/85">
                          “{event.preview}”
                        </span>
                      ) : null}
                      <span className="mt-1 flex flex-wrap items-center gap-2">
                        <span className="text-[9px] uppercase tracking-wider text-muted-foreground/70">
                          {timeAgo(event.createdAt)}
                        </span>
                        {unread ? (
                          <span className="rounded-full border border-emerald-500/45 bg-emerald-500/15 px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wider text-emerald-200">
                            Unread
                          </span>
                        ) : null}
                      </span>
                    </span>
                  </button>
                  {unread ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      title="Mark as read"
                      aria-label="Mark as read"
                      disabled={busyId === event.id}
                      className="absolute right-1.5 top-2 z-20 h-7 w-7 text-emerald-200 hover:bg-emerald-500/15 hover:text-emerald-100"
                      onClick={(e) => void markOneRead(event, e)}
                    >
                      <Mail className="h-3.5 w-3.5" />
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      title="Mark as unread"
                      aria-label="Mark as unread"
                      disabled={busyId === event.id}
                      className="absolute right-1.5 top-2 z-20 h-7 w-7 text-muted-foreground hover:bg-emerald-500/10 hover:text-emerald-300 opacity-80 group-hover:opacity-100"
                      onClick={(e) => void markOneUnread(event, e)}
                    >
                      <MailOpen className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </li>
              );
              })}
            </ul>
          )}
        </div>

        <div className="border-t bg-primary/5 p-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 w-full justify-between gap-2 px-2.5 text-[10px] font-bold uppercase tracking-widest"
            onClick={() => {
              setOpen(false);
              router.push('/activity');
            }}
          >
            {hiddenNewCount > 0 ? `View ${hiddenNewCount} more new…` : 'View all activity'}
            <ChevronRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
