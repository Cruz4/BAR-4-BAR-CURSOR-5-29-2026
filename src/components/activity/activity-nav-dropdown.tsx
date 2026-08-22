'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { formatDistanceToNow } from 'date-fns';
import {
  Bell,
  ChevronRight,
  Droplets,
  FilePenLine,
  Flame,
  Heart,
  Import,
  Lock,
  Mail,
  MailOpen,
  MessageCircle,
  Banknote,
  Repeat2,
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
  type FriendshipChangedDetail,
} from '@/lib/activity/client';
import { navigateActivityHref, resolveActivityOpenHref } from '@/lib/activity/href';
import { activityShowsActor, activityVerb, type ActivityEvent, type ActivityType } from '@/lib/activity/types';
import { refreshActivityAlerts } from '@/hooks/use-activity-alerts';
import { useAuth } from '@/hooks/use-auth';
import { StudioLoader } from '@/components/studio-loader';
import { fetchFriendships } from '@/lib/profile/social-client';
import { fetchPendingContactRequesterIds } from '@/lib/profile/contact-client';

function TypeIcon({ type }: { type: ActivityType }) {
  const className = 'h-3.5 w-3.5 shrink-0';
  switch (type) {
    case 'friend_request':
    case 'friend_accepted':
      return <UserPlus className={cn(className, 'text-emerald-400')} />;
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
  const [hiddenNewCount, setHiddenNewCount] = useState(0);

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
      const recent = received
        .filter((e) => {
          if (e.type === 'friend_request') {
            return e.direction === 'received' && pendingRequesters.has(e.actorId);
          }
          if (e.type === 'contact_request') {
            return e.direction === 'received' && pendingContact.has(e.actorId);
          }
          return true;
        })
        .slice(0, PREVIEW_LIMIT);
      const lookups = recent
        .filter((e) => !e.actorSlug && e.actorId)
        .map((e) => ({ userId: e.actorId }));
      if (lookups.length) {
        const { fetchPublicArtistMetas } = await import('@/lib/profile/social-client');
        const metas = await fetchPublicArtistMetas(lookups);
        setItems(
          recent.map((e) => {
            if (e.actorSlug) return e;
            const slug = metas.get(e.actorId)?.slug;
            return slug ? { ...e, actorSlug: slug } : e;
          })
        );
      } else {
        setItems(recent);
      }
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

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
    if (unreadCount <= 0) return;
    const readAt = new Date().toISOString();
    void markAllActivityEventsRead()
      .then(() => {
        setItems((prev) => prev.map((event) => event.readAt ? event : { ...event, readAt }));
        refreshActivityAlerts();
      })
      .catch(() => undefined);
  };

  const markOneUnread = async (event: ActivityEvent, e?: React.MouseEvent) => {
    e?.preventDefault();
    e?.stopPropagation();
    if (busyId || !event.readAt) return;
    setBusyId(event.id);
    try {
      await markActivityEventsUnread([event.id]);
      setItems((prev) => prev.map((item) => item.id === event.id ? { ...item, readAt: null } : item));
      refreshActivityAlerts();
    } finally {
      setBusyId(null);
    }
  };

  const openEvent = async (event: ActivityEvent) => {
    setOpen(false);
    try {
      await markActivityEventsRead([event.id]);
      refreshActivityAlerts();
    } catch {
      /* still navigate */
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
          className="relative h-8 w-8 md:h-9 md:w-9 text-emerald-400 hover:bg-emerald-500/10 shrink-0"
          aria-label={unreadCount > 0 ? `Activity, ${unreadCount} unread` : 'Activity'}
        >
          <Bell className="h-4 w-4 md:h-5 md:w-5" />
          {unreadCount > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-emerald-500 px-1 text-[9px] font-bold leading-none text-black">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="w-[min(22rem,calc(100vw-1.25rem))] p-0 bg-card border-2 shadow-2xl overflow-hidden"
      >
        <div className="flex items-center justify-between gap-2 border-b bg-muted/30 px-3 py-2.5">
          <h4 className="text-[10px] font-bold uppercase tracking-widest text-emerald-400 flex items-center gap-1.5">
            <Bell className="h-3 w-3" /> Recent activity
          </h4>
          <span className="text-[9px] font-code uppercase tracking-wider text-muted-foreground">
            Opened = read
          </span>
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
              {items.map((event) => (
                <li key={event.id} className={cn('group relative', !event.readAt && 'bg-emerald-500/5')}>
                  <button
                    type="button"
                    className="flex w-full gap-2.5 px-3 py-2.5 text-left transition-colors hover:bg-emerald-500/5"
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
                              className="font-bold text-foreground hover:underline"
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
                      <span className="mt-1 block text-[9px] uppercase tracking-wider text-muted-foreground/70">
                        {timeAgo(event.createdAt)}
                      </span>
                    </span>
                  </button>
                  {event.readAt ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      title="Mark as unread"
                      aria-label="Mark as unread"
                      disabled={busyId === event.id}
                      className="absolute right-1.5 top-2 h-7 w-7 text-muted-foreground hover:text-emerald-400 opacity-80 group-hover:opacity-100"
                      onClick={(e) => void markOneUnread(event, e)}
                    >
                      <MailOpen className="h-3.5 w-3.5" />
                    </Button>
                  ) : (
                    <span
                      className="absolute right-3 top-4 h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.7)]"
                      title="Unread"
                      aria-label="Unread"
                    />
                  )}
                </li>
              ))}
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
