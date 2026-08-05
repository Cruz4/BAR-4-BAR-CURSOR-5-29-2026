'use client';

/**
 * Artist Home module renderers. Each module is one section in the maker's
 * ordered deck — every one exists to pull visitors one step deeper into the
 * artist's world on Bar4Bar.ink (share pages, DNA drops, the studio itself).
 */

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  BookOpen,
  Disc3,
  Dna,
  DoorOpen,
  Fingerprint,
  PenLine,
  Quote,
  Send,
  Trash2,
  Users,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { cn } from '@/lib/utils';
import type { ArtistHomeFeatured, RhymeFingerprint } from '@/lib/profile/modules';
import { parseEmbedUrl, EMBED_HELP_TEXT } from '@/lib/profile/embeds';
import { EmbedPlayer } from '@/components/profile/embed-player';
import { PostCard } from '@/components/profile/post-card';
import { PressPlate, type PressPlateChrome } from '@/components/profile/press-plate';
import { PublicAchievementFoil } from '@/components/profile/public-achievement-foil';
import type { AchievementDef } from '@/lib/gamification/achievements';
import { ProfileMediaLightbox } from '@/components/profile/profile-media-lightbox';
import {
  createPost,
  deleteGuestbookEntry,
  fetchFriendships,
  fetchGuestbook,
  fetchPostsByOwner,
  friendProfilesOf,
  setGuestbookEntry,
  type GuestbookEntry,
  type ProfilePost,
} from '@/lib/profile/social-client';

export type ModuleContext = {
  profileUserId: string;
  profileName: string;
  profileSlug?: string;
  isOwner: boolean;
  viewerSlug?: string;
  featured: ArtistHomeFeatured;
  badges: AchievementDef[];
  rankLabel?: string;
  xp?: number;
  currentStreak?: number;
  /** Live DNA Drops currently online for this artist. */
  liveDnaDrops?: Array<{ shareId: string; title: string; type: 'album' | 'track' }>;
  /** Die-cut chrome from the living press — every module punches the same sheet. */
  plate: PressPlateChrome;
  /** Running index so adjacent dies rotate. */
  moduleIndex: number;
};

function ModuleShell({
  icon: Icon,
  title,
  children,
  action,
  ctx,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  children: React.ReactNode;
  action?: React.ReactNode;
  ctx: ModuleContext;
}) {
  return (
    <PressPlate
      title={title}
      icon={Icon}
      action={action}
      chrome={ctx.plate}
      index={ctx.moduleIndex}
    >
      {children}
    </PressPlate>
  );
}

/** Nested insert — ink well inside a plate, not another glass card. */
const inkWellClass =
  'border border-dashed border-[var(--ph-border)] bg-black/25';

// ---------------------------------------------------------------------------
// Now Playing
// ---------------------------------------------------------------------------

export function NowPlayingModule({ ctx }: { ctx: ModuleContext }) {
  if (!ctx.featured.embedUrl) return null;
  return (
    <ModuleShell icon={Disc3} title={"Now Playing"} ctx={ctx}>
      {ctx.featured.embedTitle && (
        <p className="mb-3 font-headline text-lg text-[var(--ph-text,#fff)]">
          {ctx.featured.embedTitle}
        </p>
      )}
      <EmbedPlayer url={ctx.featured.embedUrl} title={ctx.featured.embedTitle} />
    </ModuleShell>
  );
}

// ---------------------------------------------------------------------------
// Bar of the Week
// ---------------------------------------------------------------------------

export function BarOfWeekModule({ ctx }: { ctx: ModuleContext }) {
  const bar = ctx.featured.barOfWeek;
  if (!bar) return null;
  return (
    <ModuleShell icon={Quote} title={"Bar of the Week"} ctx={ctx}>
      <blockquote className="font-headline text-[clamp(1.4rem,3.5vw,2.4rem)] leading-tight text-[var(--ph-text,#fff)]">
        &ldquo;{bar}&rdquo;
      </blockquote>
      {ctx.featured.barOfWeekShareId && (
        <Link
          href={`/share/${ctx.featured.barOfWeekShareId}`}
          className="mt-4 inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-[var(--ph-accent,#7dd3fc)] hover:underline"
        >
          <DoorOpen className="h-3.5 w-3.5" /> Read it in the sheet
        </Link>
      )}
    </ModuleShell>
  );
}

// ---------------------------------------------------------------------------
// Living DNA
// ---------------------------------------------------------------------------

export function DnaStripModule({ ctx }: { ctx: ModuleContext }) {
  const lines = ctx.featured.dnaLines;
  if (!lines?.length) return null;
  return (
    <ModuleShell icon={Dna} title={"Living DNA"} ctx={ctx}>
      <div className="space-y-3">
        {lines.map((line, i) => (
          <p
            key={i}
            className="border-l-2 border-[var(--ph-accent,#7dd3fc)] pl-3 text-sm italic leading-relaxed text-[var(--ph-text,#fff)]/90"
          >
            {line}
          </p>
        ))}
      </div>
    </ModuleShell>
  );
}

// ---------------------------------------------------------------------------
// Rhyme Fingerprint
// ---------------------------------------------------------------------------

function FingerprintSvg({ fingerprint }: { fingerprint: RhymeFingerprint }) {
  const { rhyme, syllables } = fingerprint;
  const rows = rhyme.length;
  const maxSyl = Math.max(...syllables, 8);
  const width = 280;
  const rowH = 16;
  const height = rows * rowH + 8;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="w-full max-w-sm"
      role="img"
      aria-label="Rhyme fingerprint — abstract cadence pattern"
    >
      {rhyme.map((group, i) => {
        const barW = Math.max(24, (syllables[i] / maxSyl) * (width - 60));
        const hueShift = (group * 47) % 360;
        return (
          <g key={i} transform={`translate(0, ${i * rowH + 4})`}>
            <rect
              x={0}
              y={0}
              width={barW}
              height={rowH - 6}
              rx={4}
              fill={`hsl(calc(var(--ph-hue, 200) + ${hueShift}) 70% 60% / 0.75)`}
            />
            <circle
              cx={barW + 12}
              cy={(rowH - 6) / 2}
              r={4}
              fill={`hsl(calc(var(--ph-hue, 200) + ${hueShift}) 80% 65%)`}
            />
          </g>
        );
      })}
    </svg>
  );
}

export function RhymeFingerprintModule({ ctx }: { ctx: ModuleContext }) {
  const fp = ctx.featured.fingerprint;
  if (!fp) return null;
  return (
    <ModuleShell icon={Fingerprint} title={"Rhyme Fingerprint"} ctx={ctx}>
      <FingerprintSvg fingerprint={fp} />
      <p className="mt-3 text-[10px] uppercase tracking-widest text-[var(--ph-muted,rgba(255,255,255,0.5))]">
        {fp.sourceLabel ? `Pressed from ${fp.sourceLabel} · ` : ''}bars &amp; end-rhymes as shape — no
        lyrics shown
      </p>
    </ModuleShell>
  );
}

// ---------------------------------------------------------------------------
// Album Rooms
// ---------------------------------------------------------------------------

const ALBUM_ROOM_LOGO = '/Logo.png';

function AlbumRoomCover({
  customSrc,
  albumCoverSrc,
  title,
  onExpand,
}: {
  customSrc?: string;
  albumCoverSrc?: string;
  title: string;
  /** Opens the media lightbox when the cover has a real image. */
  onExpand?: () => void;
}) {
  const [failed, setFailed] = useState(false);
  const custom = customSrc?.trim() || '';
  const album = albumCoverSrc?.trim() || '';
  const src = custom || album;
  const showLogo = !src || failed;
  const fitContain = !custom && Boolean(album);
  const canExpand = Boolean(onExpand && !showLogo);

  return (
    <div className="relative aspect-[2/1] w-full overflow-hidden bg-neutral-950">
      {showLogo ? (
        <div className="flex h-full w-full items-center justify-center bg-neutral-900">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={ALBUM_ROOM_LOGO}
            alt=""
            className="h-14 w-14 object-contain opacity-25 sm:h-16 sm:w-16"
          />
        </div>
      ) : canExpand ? (
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onExpand?.();
          }}
          aria-label={`View ${title} larger`}
          className="group/cover relative block h-full w-full cursor-zoom-in focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--ph-accent,#7dd3fc)]"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={src}
            alt={title}
            className={cn(
              'h-full w-full transition-transform group-hover/cover:scale-[1.03]',
              fitContain ? 'object-contain' : 'object-cover'
            )}
            onError={() => setFailed(true)}
          />
        </button>
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={title}
          className={cn(
            'h-full w-full transition-transform group-hover:scale-[1.03]',
            fitContain ? 'object-contain' : 'object-cover'
          )}
          onError={() => setFailed(true)}
        />
      )}
    </div>
  );
}

export function AlbumRoomsModule({ ctx }: { ctx: ModuleContext }) {
  const rooms = ctx.featured.albumRooms;
  const [lightbox, setLightbox] = useState<{ src: string; title: string } | null>(null);

  if (!rooms?.length) return null;

  return (
    <ModuleShell icon={DoorOpen} title={"Album Rooms"} ctx={ctx}>
      <div className="grid gap-4 sm:grid-cols-2">
        {rooms.map((room, i) => {
          const expandSrc = (room.roomImageUrl || room.coverArtUrl || '').trim();
          const openExpand = expandSrc
            ? () => setLightbox({ src: expandSrc, title: room.title })
            : undefined;

          return (
            <div
              key={i}
              className={cn(
                inkWellClass,
                'group flex h-full flex-col overflow-hidden transition-transform hover:-translate-y-0.5'
              )}
            >
              <AlbumRoomCover
                customSrc={room.roomImageUrl}
                albumCoverSrc={room.coverArtUrl}
                title={room.title}
                onExpand={openExpand}
              />
              <div className="flex flex-1 flex-col gap-1.5 p-4">
                <p className="font-headline text-base uppercase tracking-tight text-[var(--ph-text,#fff)]">
                  {room.title}
                </p>
                {room.theme && (
                  <p className="text-xs text-[var(--ph-muted,rgba(255,255,255,0.6))]">{room.theme}</p>
                )}
                {room.sampleBar && (
                  <p className="mt-1 text-sm italic text-[var(--ph-text,#fff)]/80">
                    &ldquo;{room.sampleBar}&rdquo;
                  </p>
                )}
                {room.shareId && (
                  <Link
                    href={`/share/${room.shareId}`}
                    className="mt-auto pt-2 text-[10px] font-bold uppercase tracking-widest text-[var(--ph-accent,#7dd3fc)] hover:underline"
                  >
                    Enter the room →
                  </Link>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <ProfileMediaLightbox
        open={Boolean(lightbox)}
        onOpenChange={(open) => {
          if (!open) setLightbox(null);
        }}
        title={lightbox?.title || 'Album Room'}
        src={lightbox?.src}
        fit="contain"
      />
    </ModuleShell>
  );
}

// ---------------------------------------------------------------------------
// Drop Shelf — all live DNA Drops (auto)
// ---------------------------------------------------------------------------

export function DropShelfModule({ ctx }: { ctx: ModuleContext }) {
  const drops = ctx.liveDnaDrops || [];
  if (!drops.length) return null;

  return (
    <ModuleShell icon={Dna} title={"Live DNA Drops"} ctx={ctx}>
      <div className="grid gap-3 sm:grid-cols-2">
        {drops.map((drop) => (
          <Link
            key={drop.shareId}
            href={`/share/${drop.shareId}`}
            className={cn(
              inkWellClass,
              'group flex items-center gap-3 p-4 transition-colors hover:border-[var(--ph-accent,#7dd3fc)]'
            )}
          >
            <Dna className="h-5 w-5 shrink-0 text-[var(--ph-accent,#7dd3fc)]" />
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-[var(--ph-text,#fff)]">{drop.title}</p>
              <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--ph-muted,rgba(255,255,255,0.55))]">
                {drop.type === 'album' ? 'Album DNA' : 'Track DNA'} · open drop
              </p>
            </div>
          </Link>
        ))}
      </div>
    </ModuleShell>
  );
}

// ---------------------------------------------------------------------------
// Proof Wall (badges)
// ---------------------------------------------------------------------------

export function ProofWallModule({ ctx }: { ctx: ModuleContext }) {
  const badges = [...ctx.badges].sort((a, b) => b.xpReward - a.xpReward);
  if (!badges.length) return null;
  return (
    <ModuleShell icon={BookOpen} title={"Proof Wall"} ctx={ctx}>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 auto-rows-[minmax(148px,auto)]">
        {badges.slice(0, 8).map((badge, i) => (
          <PublicAchievementFoil
            key={badge.id}
            achievement={badge}
            displayName={ctx.profileName}
            index={i}
            rankLabel={ctx.rankLabel}
            xp={ctx.xp}
            streak={ctx.currentStreak}
          />
        ))}
      </div>
    </ModuleShell>
  );
}

// ---------------------------------------------------------------------------
// The Wall (posts)
// ---------------------------------------------------------------------------

export function WallModule({ ctx }: { ctx: ModuleContext }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [posts, setPosts] = useState<ProfilePost[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [text, setText] = useState('');
  const [embedUrl, setEmbedUrl] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetchPostsByOwner(ctx.profileUserId)
      .then(setPosts)
      .catch(() => undefined)
      .finally(() => setLoaded(true));
  }, [ctx.profileUserId]);

  const embedPreview = useMemo(() => parseEmbedUrl(embedUrl), [embedUrl]);

  const submit = async () => {
    if (!user) return;
    setBusy(true);
    try {
      const post = await createPost({
        text,
        embedUrl: embedUrl.trim() || undefined,
        ownerName: user.displayName || 'Artist',
        ownerSlug: ctx.profileSlug,
      });
      setPosts((prev) => [post, ...prev]);
      setText('');
      setEmbedUrl('');
    } catch (e) {
      toast({
        variant: 'destructive',
        title: 'Post failed',
        description: e instanceof Error ? e.message : undefined,
      });
    } finally {
      setBusy(false);
    }
  };

  if (!ctx.isOwner && loaded && posts.length === 0) return null;

  return (
    <ModuleShell icon={PenLine} title={"The Wall"} ctx={ctx}>
      {ctx.isOwner && (
        <div className={cn(inkWellClass, 'mb-5 space-y-2 p-4')}>
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            maxLength={1000}
            rows={2}
            placeholder="Drop a thought, a release, a moment..."
            className="border-[var(--ph-border,rgba(255,255,255,0.12))] bg-black/30 text-sm"
          />
          <Input
            value={embedUrl}
            onChange={(e) => setEmbedUrl(e.target.value)}
            maxLength={500}
            placeholder="Optional: paste a YouTube / TikTok / Instagram / Facebook / SoundCloud / Spotify / Suno link"
            className="h-9 border-[var(--ph-border,rgba(255,255,255,0.12))] bg-black/30 text-sm"
          />
          {embedUrl.trim() && !embedPreview && (
            <p className="text-[10px] uppercase tracking-widest text-[var(--ph-muted,rgba(255,255,255,0.5))]">
              {EMBED_HELP_TEXT}
            </p>
          )}
          {embedPreview && <EmbedPlayer url={embedUrl} />}
          <div className="flex justify-end">
            <Button
              size="sm"
              className="h-9 gap-1.5 font-bold uppercase"
              disabled={busy || (!text.trim() && !embedUrl.trim())}
              onClick={() => void submit()}
            >
              <Send className="h-3.5 w-3.5" /> Post
            </Button>
          </div>
        </div>
      )}

      <div className="space-y-4">
        {posts.map((post) => (
          <PostCard
            key={post.id}
            post={post}
            viewerSlug={ctx.viewerSlug}
            onDeleted={(id) => setPosts((prev) => prev.filter((p) => p.id !== id))}
          />
        ))}
        {loaded && posts.length === 0 && ctx.isOwner && (
          <p className="py-6 text-center text-sm text-[var(--ph-muted,rgba(255,255,255,0.55))]">
            Your wall is blank — post your first drop.
          </p>
        )}
      </div>
    </ModuleShell>
  );
}

// ---------------------------------------------------------------------------
// Friends
// ---------------------------------------------------------------------------

export function FriendsModule({ ctx }: { ctx: ModuleContext }) {
  const [friends, setFriends] = useState<Array<{ userId: string; name: string; slug?: string }>>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetchFriendships(ctx.profileUserId, 'accepted')
      .then((list) => setFriends(friendProfilesOf(list, ctx.profileUserId)))
      .catch(() => undefined)
      .finally(() => setLoaded(true));
  }, [ctx.profileUserId]);

  if (loaded && friends.length === 0) return null;

  return (
    <ModuleShell
      icon={Users}
      title={`Friends${friends.length ? ` · ${friends.length}` : ''}`}
      ctx={ctx}
      action={
        ctx.isOwner ? (
          <Link
            href="/friends"
            className="text-[10px] font-bold uppercase tracking-widest text-[var(--ph-accent,#7dd3fc)] hover:underline"
          >
            Manage →
          </Link>
        ) : undefined
      }
    >
      <div className="flex flex-wrap gap-2">
        {friends.slice(0, 24).map((friend) =>
          friend.slug ? (
            <Link
              key={friend.userId}
              href={`/profile/${friend.slug}`}
              className="rounded-full border border-[var(--ph-border,rgba(255,255,255,0.12))] bg-black/30 px-3 py-1.5 text-xs font-bold text-[var(--ph-text,#fff)] transition-colors hover:border-[var(--ph-accent,#7dd3fc)] hover:text-[var(--ph-accent,#7dd3fc)]"
            >
              {friend.name}
            </Link>
          ) : (
            <span
              key={friend.userId}
              className="rounded-full border border-[var(--ph-border,rgba(255,255,255,0.12))] bg-black/30 px-3 py-1.5 text-xs font-bold text-[var(--ph-text,#fff)]/70"
            >
              {friend.name}
            </span>
          )
        )}
      </div>
    </ModuleShell>
  );
}

// ---------------------------------------------------------------------------
// Guestbook
// ---------------------------------------------------------------------------

export function GuestbookModule({ ctx }: { ctx: ModuleContext }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [entries, setEntries] = useState<GuestbookEntry[]>([]);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetchGuestbook(ctx.profileUserId)
      .then(setEntries)
      .catch(() => undefined);
  }, [ctx.profileUserId]);

  const canSign = Boolean(user && user.id !== ctx.profileUserId);
  const myEntry = user ? entries.find((e) => e.authorId === user.id) : undefined;

  const sign = async () => {
    if (!user) return;
    setBusy(true);
    try {
      const entry = await setGuestbookEntry(ctx.profileUserId, draft, {
        name: user.displayName || 'Artist',
        slug: ctx.viewerSlug,
      });
      setEntries((prev) => [entry, ...prev.filter((e) => e.id !== entry.id)]);
      setDraft('');
      toast({ title: 'Signed the book' });
    } catch (e) {
      toast({
        variant: 'destructive',
        title: 'Could not sign',
        description: e instanceof Error ? e.message : undefined,
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <ModuleShell icon={BookOpen} title={"Guestbook"} ctx={ctx}>
      {canSign && (
        <div className="mb-4 flex items-center gap-2">
          <Input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                void sign();
              }
            }}
            maxLength={240}
            placeholder={myEntry ? 'Rewrite your line...' : 'Leave one line...'}
            className="h-9 border-[var(--ph-border,rgba(255,255,255,0.12))] bg-black/30 text-sm"
          />
          <Button
            size="sm"
            className="h-9 shrink-0 font-bold uppercase"
            disabled={busy || !draft.trim()}
            onClick={() => void sign()}
          >
            Sign
          </Button>
        </div>
      )}
      {!user && (
        <p className="mb-4 text-xs text-[var(--ph-muted,rgba(255,255,255,0.55))]">
          <Link href="/login" className="text-[var(--ph-accent,#7dd3fc)] hover:underline">
            Sign in
          </Link>{' '}
          to leave one line in the book.
        </p>
      )}
      <div className="space-y-2.5">
        {entries.slice(0, 20).map((entry) => (
          <div key={entry.id} className="flex items-start gap-2 text-sm">
            <div className="min-w-0 flex-1">
              {entry.authorSlug ? (
                <Link
                  href={`/profile/${entry.authorSlug}`}
                  className="mr-2 text-[11px] font-bold uppercase tracking-wider text-[var(--ph-accent2,#fbbf24)] hover:underline"
                >
                  {entry.authorName}
                </Link>
              ) : (
                <span className="mr-2 text-[11px] font-bold uppercase tracking-wider text-[var(--ph-accent2,#fbbf24)]">
                  {entry.authorName}
                </span>
              )}
              <span className="italic text-[var(--ph-text,#fff)]/85">&ldquo;{entry.text}&rdquo;</span>
            </div>
            {user?.id && (user.id === entry.authorId || ctx.isOwner) && (
              <button
                type="button"
                className="text-[var(--ph-muted,rgba(255,255,255,0.4))] hover:text-red-400"
                onClick={() => {
                  void deleteGuestbookEntry(ctx.profileUserId, entry.id)
                    .then(() => setEntries((prev) => prev.filter((e) => e.id !== entry.id)))
                    .catch(() => toast({ variant: 'destructive', title: 'Could not remove' }));
                }}
              >
                <Trash2 className="h-3 w-3" />
              </button>
            )}
          </div>
        ))}
        {entries.length === 0 && (
          <p className="py-4 text-center text-sm text-[var(--ph-muted,rgba(255,255,255,0.55))]">
            The book is open — first line is free.
          </p>
        )}
      </div>
    </ModuleShell>
  );
}
