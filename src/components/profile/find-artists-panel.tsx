'use client';

/**
 * Search live Artist Homes by name and send a friend invite.
 * Also surfaces the referral link for artists not on the app yet.
 */

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Check, Clock, Copy, Gift, Loader2, Search, UserPlus, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { auth } from '@/lib/firebase/client/firebase';
import {
  fetchFriendshipWith,
  sendFriendRequest,
  type Friendship,
} from '@/lib/profile/social-client';
import { REFERRAL_INK_REWARD } from '@/lib/referrals';
import { cn } from '@/lib/utils';

type ArtistHit = {
  userId: string;
  displayName: string;
  slug: string;
  rankId?: string;
  xp?: number;
};

type FindArtistsPanelProps = {
  viewerSlug?: string;
  className?: string;
};

export function FindArtistsPanel({ viewerSlug, className }: FindArtistsPanelProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [query, setQuery] = useState('');
  const [hits, setHits] = useState<ArtistHit[]>([]);
  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [friendshipByUser, setFriendshipByUser] = useState<Record<string, Friendship | null>>({});
  const [referralLink, setReferralLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    void (async () => {
      try {
        const token = await auth.currentUser?.getIdToken();
        if (!token) return;
        const res = await fetch(`/api/referrals/me?userId=${encodeURIComponent(user.id)}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (!cancelled && res.ok && typeof data.referralLink === 'string') {
          setReferralLink(data.referralLink);
        }
      } catch {
        /* optional */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id) return;
    const q = query.trim();
    if (q.length < 2) {
      setHits([]);
      setSearched(false);
      return;
    }
    let cancelled = false;
    const timer = window.setTimeout(() => {
      void (async () => {
        setSearching(true);
        try {
          const res = await fetch(
            `/api/profile/search?q=${encodeURIComponent(q)}&excludeUserId=${encodeURIComponent(user.id)}`
          );
          const data = await res.json();
          if (cancelled) return;
          const artists: ArtistHit[] = Array.isArray(data.artists) ? data.artists : [];
          setHits(artists);
          setSearched(true);
          const statuses = await Promise.all(
            artists.map(async (a) => {
              const f = await fetchFriendshipWith(a.userId);
              return [a.userId, f] as const;
            })
          );
          if (!cancelled) {
            setFriendshipByUser((prev) => {
              const next = { ...prev };
              for (const [id, f] of statuses) next[id] = f;
              return next;
            });
          }
        } catch {
          if (!cancelled) {
            setHits([]);
            setSearched(true);
          }
        } finally {
          if (!cancelled) setSearching(false);
        }
      })();
    }, 280);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [query, user?.id]);

  const invite = useCallback(
    async (artist: ArtistHit) => {
      if (!user) return;
      setBusyId(artist.userId);
      try {
        const created = await sendFriendRequest(
          { name: user.displayName || 'Artist', ...(viewerSlug ? { slug: viewerSlug } : {}) },
          {
            userId: artist.userId,
            name: artist.displayName,
            slug: artist.slug,
          }
        );
        setFriendshipByUser((prev) => ({ ...prev, [artist.userId]: created }));
        toast(
          created.status === 'accepted'
            ? {
                title: 'Friends',
                description: `You and ${artist.displayName} are connected.`,
              }
            : {
                title: 'Friend invite sent',
                description: `Waiting on ${artist.displayName} to accept.`,
              }
        );
      } catch (e) {
        toast({
          variant: 'destructive',
          title: 'Could not send invite',
          description: e instanceof Error ? e.message : undefined,
        });
      } finally {
        setBusyId(null);
      }
    },
    [user, viewerSlug, toast]
  );

  const copyReferral = async () => {
    if (!referralLink) return;
    try {
      await navigator.clipboard.writeText(referralLink);
      setCopied(true);
      toast({
        title: 'Invite link copied',
        description: `Share it — you and your friend each get ${REFERRAL_INK_REWARD} Ink when they join.`,
      });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({ variant: 'destructive', title: 'Copy failed' });
    }
  };

  if (!user) return null;

  return (
    <section
      className={cn(
        'rounded-2xl border border-emerald-500/25 bg-emerald-500/[0.04] p-4 space-y-3',
        className
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.3em] text-emerald-400">
            <Users className="h-3.5 w-3.5" /> Find artists
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Search by artist name, send a friend invite, or share your referral link.
          </p>
        </div>
      </div>

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search artist name…"
          className="bg-black/30 pl-9"
          maxLength={48}
        />
        {searching && (
          <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
        )}
      </div>

      {hits.length > 0 && (
        <ul className="space-y-2">
          {hits.map((artist) => {
            const friendship = friendshipByUser[artist.userId];
            const busy = busyId === artist.userId;
            return (
              <li
                key={artist.userId}
                className="flex items-center gap-3 rounded-xl border border-white/10 bg-black/25 px-3 py-2.5"
              >
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/profile/${artist.slug}`}
                    className="block truncate text-sm font-bold text-white hover:text-emerald-300"
                  >
                    {artist.displayName}
                  </Link>
                  <p className="truncate text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                    @{artist.slug}
                    {typeof artist.xp === 'number' ? ` · ${artist.xp.toLocaleString()} XP` : ''}
                  </p>
                </div>
                {!friendship ? (
                  <Button
                    size="sm"
                    className="h-8 shrink-0 gap-1 font-bold uppercase"
                    disabled={busy}
                    onClick={() => void invite(artist)}
                  >
                    {busy ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <UserPlus className="h-3.5 w-3.5" />
                    )}
                    Invite
                  </Button>
                ) : friendship.status === 'pending' ? (
                  <Button size="sm" variant="outline" className="h-8 shrink-0 gap-1 font-bold uppercase" disabled>
                    <Clock className="h-3.5 w-3.5" /> Pending
                  </Button>
                ) : (
                  <Button size="sm" variant="outline" className="h-8 shrink-0 gap-1 font-bold uppercase" disabled>
                    <Check className="h-3.5 w-3.5" /> Friends
                  </Button>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {searched && !searching && hits.length === 0 && query.trim().length >= 2 && (
        <p className="text-xs text-muted-foreground">
          No live Artist Homes match that name. They may be private — or not on Bar 4 Bar yet.
        </p>
      )}

      {referralLink && (
        <div className="flex flex-wrap items-center gap-2 border-t border-white/10 pt-3">
          <p className="flex min-w-0 flex-1 items-center gap-1.5 text-[11px] text-muted-foreground">
            <Gift className="h-3.5 w-3.5 shrink-0 text-primary" />
            Not on the app? Send your referral invite.
          </p>
          <Button
            size="sm"
            variant="outline"
            className="h-8 gap-1.5 font-bold uppercase"
            onClick={() => void copyReferral()}
          >
            {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            {copied ? 'Copied' : 'Copy invite'}
          </Button>
        </div>
      )}
    </section>
  );
}
