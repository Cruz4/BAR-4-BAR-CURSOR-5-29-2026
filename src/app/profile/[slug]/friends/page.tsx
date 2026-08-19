'use client';

/**
 * Public circle for an Artist Home — full friends list with search.
 * Only friends with a live public Artist Home appear here.
 * Private / offline friends are personal-circle only (`/friends`).
 */

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { StudioLoader } from '@/components/studio-loader';
import { ArtistStarAvatar } from '@/components/profile/artist-star-avatar';
import { useAuth } from '@/hooks/use-auth';
import {
  enrichFriendProfilesWithLiveSlugs,
  fetchFriendships,
  friendProfilesOf,
  resolveCircleFriends,
  visibleCircleFriends,
  type CircleFriendRow,
} from '@/lib/profile/social-client';
import { profileHref } from '@/lib/profile/profile-slug';
import { parseStudioBadge } from '@/lib/studio-tier-chrome';
import { ChevronLeft, Search, Users } from 'lucide-react';

export default function ProfileFriendsPage() {
  const params = useParams();
  const slug = typeof params?.slug === 'string' ? params.slug : '';
  const { user } = useAuth();
  const [displayName, setDisplayName] = useState('Artist');
  const [ownerId, setOwnerId] = useState<string | null>(null);
  const [friends, setFriends] = useState<CircleFriendRow[]>([]);
  const [query, setQuery] = useState('');
  const [loaded, setLoaded] = useState(false);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    if (!slug) return;
    let cancelled = false;
    const load = async () => {
      try {
        const res = await fetch(`/api/profile/${encodeURIComponent(slug)}`);
        if (!res.ok) {
          if (!cancelled) setMissing(true);
          return;
        }
        const data = (await res.json()) as {
          userId?: string;
          displayName?: string;
        };
        if (cancelled) return;
        if (!data.userId) {
          setMissing(true);
          return;
        }
        setOwnerId(data.userId);
        setDisplayName(
          typeof data.displayName === 'string' && data.displayName.trim()
            ? data.displayName.trim()
            : slug
        );

        const list = await fetchFriendships(data.userId, 'accepted');
        const chips = friendProfilesOf(list, data.userId, {
          email: user?.email,
          displayName: user?.displayName,
        });
        let base = chips;
        try {
          base = await enrichFriendProfilesWithLiveSlugs(chips);
        } catch (err) {
          console.warn('[profile-friends] enrich failed', err);
        }

        try {
          const resolved = await resolveCircleFriends(base);
          if (cancelled) return;
          // Public Artist Home circle: live-public only (no offline).
          setFriends(visibleCircleFriends(resolved, false));
        } catch (err) {
          console.warn('[profile-friends] resolve failed', err);
          if (!cancelled) setFriends([]);
        }
      } catch {
        if (!cancelled) setMissing(true);
      } finally {
        if (!cancelled) setLoaded(true);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [slug, user?.email, user?.displayName]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return friends;
    return friends.filter((f) => {
      const name = (f.name || '').toLowerCase();
      const s = (f.slug || '').toLowerCase();
      return name.includes(q) || s.includes(q);
    });
  }, [friends, query]);

  if (!loaded) {
    return <StudioLoader size="lg" fullscreen />;
  }

  if (missing || !ownerId) {
    return (
      <div className="container mx-auto max-w-lg px-4 py-20 text-center space-y-4">
        <h1 className="font-headline text-2xl font-bold uppercase">Friends</h1>
        <p className="text-sm text-muted-foreground">Artist page not found.</p>
        <Button asChild className="font-bold uppercase">
          <Link href="/">Back to The Scene</Link>
        </Button>
      </div>
    );
  }

  const isOwner = Boolean(user?.id && user.id === ownerId);

  return (
    <div className="container mx-auto max-w-2xl space-y-6 px-4 py-8">
      <header className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Button size="sm" variant="outline" className="h-8 gap-1.5 font-bold uppercase" asChild>
            <Link href={profileHref(slug) || `/${slug}`}>
              <ChevronLeft className="h-3.5 w-3.5" /> {displayName}
            </Link>
          </Button>
          {isOwner ? (
            <Button size="sm" variant="outline" className="h-8 font-bold uppercase" asChild>
              <Link href="/friends">Manage circle</Link>
            </Button>
          ) : null}
        </div>
        <div className="space-y-1">
          <h1 className="font-headline text-3xl font-bold uppercase tracking-tight flex items-center gap-2">
            <Users className="h-7 w-7 text-primary" />
            Friends
          </h1>
          <p className="text-sm text-muted-foreground">
            {displayName}&apos;s circle · {friends.length} artist{friends.length === 1 ? '' : 's'}
          </p>
        </div>
      </header>

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search friends by name…"
          className="h-11 pl-10 font-medium"
          autoComplete="off"
        />
      </div>

      {friends.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/15 bg-black/20 px-6 py-14 text-center">
          <p className="text-sm text-muted-foreground">No friends on this circle yet.</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/15 bg-black/20 px-6 py-14 text-center">
          <p className="text-sm text-muted-foreground">No friends match “{query.trim()}”.</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {filtered.map((friend) => {
            const href = friend.slug ? profileHref(friend.slug) : undefined;
            const row = (
              <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-black/25 px-3 py-2.5 transition-colors hover:border-primary/40 hover:bg-black/40">
                <ArtistStarAvatar
                  name={friend.name}
                  avatarUrl={friend.avatarUrl}
                  useStarMark={friend.starMarkUseStar}
                  starMarkSeed={friend.starMarkSeed}
                  studioChrome={parseStudioBadge(friend.studioBadge) || 'free'}
                  size={40}
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-white">{friend.name}</p>
                  {friend.slug ? (
                    <p className="truncate text-[10px] uppercase tracking-wider text-muted-foreground">
                      /{friend.slug}
                    </p>
                  ) : null}
                </div>
              </div>
            );
            return (
              <li key={friend.userId}>
                {href ? <Link href={href}>{row}</Link> : row}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
