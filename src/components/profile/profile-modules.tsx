'use client';

/**
 * Artist Home module renderers. Each module is one section in the maker's
 * ordered deck — every one exists to pull visitors one step deeper into the
 * artist's world on Bar4Bar.ink (share pages, DNA drops, the studio itself).
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import {
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Disc3,
  Dna,
  DoorOpen,
  Fingerprint,
  LayoutGrid,
  Lock,
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
import { profileFriendsHref, profileHref } from '@/lib/profile/profile-slug';
import { parseStudioBadge } from '@/lib/studio-tier-chrome';
import type { ArtistHomeFeatured, ModuleSize } from '@/lib/profile/modules';
import { FingerprintSvg } from '@/components/profile/rhyme-fingerprint-svg';
import { BarBoardView } from '@/components/profile/bar-board-module';
import { parseEmbedUrl, EMBED_HELP_TEXT } from '@/lib/profile/embeds';
import { EmbedPlayer } from '@/components/profile/embed-player';
import { PostCard } from '@/components/profile/post-card';
import { VoiceNoteComposer } from '@/components/profile/voice-note-composer';
import { ImageAttachComposer, attachPastedImage } from '@/components/profile/image-attach-composer';
import { PressPlate, type PressPlateChrome } from '@/components/profile/press-plate';
import { PublicAchievementFoil } from '@/components/profile/public-achievement-foil';
import { firstDropTracks, LiveDnaDropsGroupedList } from '@/components/profile/live-dna-drop-card';
import { useFirstDropsFeature } from '@/hooks/use-first-drops-feature';
import type { AchievementDef } from '@/lib/gamification/achievements';
import {
  createPost,
  deleteGuestbookEntry,
  enrichFriendProfilesWithLiveSlugs,
  fetchFriendships,
  fetchGuestbook,
  fetchPostsByOwner,
  friendProfilesOf,
  resolveCircleFriends,
  setGuestbookEntry,
  visibleCircleFriends,
  type CircleFriendRow,
  type GuestbookEntry,
  type ProfilePost,
} from '@/lib/profile/social-client';
import { type RecordedVoiceClip } from '@/lib/profile/voice-notes';
import {
  POST_IMAGE_GUEST_MAX_BYTES,
  pendingImageToDataUrl,
  revokePostImagePreview,
  type PendingPostImage,
} from '@/lib/profile/post-images';
import { ArtistHomeLink } from '@/components/profile/artist-home-link';
import { ArtistStarAvatar } from '@/components/profile/artist-star-avatar';

export type ModuleContext = {
  profileUserId: string;
  profileName: string;
  profileSlug?: string;
  isOwner: boolean;
  viewerSlug?: string;
  featured: ArtistHomeFeatured;
  badges: AchievementDef[];
  /** Achievement id → unlock ISO timestamp. */
  unlockedAchievements?: Record<string, string>;
  rankLabel?: string;
  xp?: number;
  currentStreak?: number;
  /** Live DNA Drops currently online for this artist. */
  liveDnaDrops?: Array<{
    shareId: string;
    title: string;
    type: 'album' | 'track';
    albumTitle?: string;
    albumShareId?: string;
    trackIndex?: number;
    trackCount?: number;
    hasDropAudio?: boolean;
    dropPriceSummary?: string;
    playCount?: number;
    previewCount?: number;
    purchaseCount?: number;
    firstBuyerName?: string;
  }>;
  /** Die-cut chrome from the living press — every module punches the same sheet. */
  plate: PressPlateChrome;
  /** Running index so adjacent dies rotate. */
  moduleIndex: number;
  /** S/M/L from Edit Public Page — modules that care about density use this. */
  size: ModuleSize;
  /**
   * Guest Pressing playground — local Wall posts (no Firestore).
   * When set, Wall uses these instead of fetching and allows posting via callback.
   */
  playgroundWall?: {
    posts: ProfilePost[];
    onPost: (input: { text: string; embedUrl?: string; imageUrl?: string }) => void;
    onDelete?: (id: string) => void;
  };
  /** Guest landing — local friends list (no Firestore). */
  playgroundFriends?: Array<{ userId: string; name: string; slug?: string }>;
  /** Guest landing — local guestbook entries (no Firestore). */
  playgroundGuestbook?: GuestbookEntry[];
  /** Guest Pressing playground — edit Bar of the Week on the page. */
  playgroundBarOfWeek?: {
    text: string;
    onChange: (text: string) => void;
  };
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
  const { enabled: firstDropsOn } = useFirstDropsFeature();
  if (ctx.featured.embedUrl) {
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
  const featuredDrop = firstDropsOn ? firstDropTracks(ctx.liveDnaDrops || [])[0] : undefined;
  if (!featuredDrop) return null;
  return (
    <ModuleShell icon={Disc3} title={"Now Playing"} ctx={ctx}>
      <p className="mb-3 font-headline text-lg text-[var(--ph-text,#fff)]">{featuredDrop.title}</p>
      <Link
        href={`/share/${featuredDrop.shareId}`}
        className="inline-flex h-11 items-center gap-2 rounded-full bg-fuchsia-400 px-5 text-[11px] font-bold uppercase tracking-widest text-black hover:bg-fuchsia-300"
      >
        Listen
        {featuredDrop.dropPriceSummary ? ` · ${featuredDrop.dropPriceSummary}` : ''}
      </Link>
      <p className="mt-2 text-[11px] text-[var(--ph-muted,rgba(255,255,255,0.55))]">
        Preview 30 seconds · buy once to stream here
      </p>
    </ModuleShell>
  );
}

// ---------------------------------------------------------------------------
// Bar of the Week
// ---------------------------------------------------------------------------

/** Same look as the live quote — click to type (no input chrome). */
function PlaygroundBarOfWeekQuote({
  value,
  onChange,
  maxLength = 280,
}: {
  value: string;
  onChange: (text: string) => void;
  maxLength?: number;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const focusedRef = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || focusedRef.current) return;
    if (el.textContent !== value) el.textContent = value;
  }, [value]);

  const commit = (raw: string) => {
    const next = raw.replace(/\u00a0/g, ' ').slice(0, maxLength);
    onChange(next);
    return next;
  };

  return (
    <blockquote className="font-headline text-[clamp(1.4rem,3.5vw,2.4rem)] leading-tight text-[var(--ph-text,#fff)]">
      &ldquo;
      <span
        ref={ref}
        role="textbox"
        aria-label="Bar of the Week"
        contentEditable
        suppressContentEditableWarning
        className={cn(
          'cursor-text outline-none empty:inline-block empty:min-w-[0.6em]',
          'focus-visible:rounded-sm focus-visible:ring-1 focus-visible:ring-[var(--ph-accent,#7dd3fc)]/50'
        )}
        onFocus={() => {
          focusedRef.current = true;
        }}
        onBlur={() => {
          focusedRef.current = false;
          const next = commit(ref.current?.textContent || '');
          if (ref.current && ref.current.textContent !== next) {
            ref.current.textContent = next;
          }
        }}
        onInput={() => {
          const el = ref.current;
          if (!el) return;
          let raw = el.textContent || '';
          if (raw.length > maxLength) {
            raw = raw.slice(0, maxLength);
            el.textContent = raw;
            const range = document.createRange();
            const sel = window.getSelection();
            range.selectNodeContents(el);
            range.collapse(false);
            sel?.removeAllRanges();
            sel?.addRange(range);
          }
          commit(raw);
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') e.preventDefault();
        }}
        onPaste={(e) => {
          e.preventDefault();
          const pasted = e.clipboardData.getData('text/plain').replace(/\s+/g, ' ');
          document.execCommand('insertText', false, pasted);
        }}
      />
      &rdquo;
    </blockquote>
  );
}

export function BarOfWeekModule({ ctx }: { ctx: ModuleContext }) {
  const playground = ctx.playgroundBarOfWeek;
  const bar = playground ? playground.text : ctx.featured.barOfWeek;
  if (!playground && !bar) return null;
  return (
    <ModuleShell icon={Quote} title={"Bar of the Week"} ctx={ctx}>
      {playground ? (
        <PlaygroundBarOfWeekQuote value={playground.text} onChange={playground.onChange} />
      ) : (
        <>
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
        </>
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
// The Board
// ---------------------------------------------------------------------------

export function BarBoardModule({ ctx }: { ctx: ModuleContext }) {
  const data = ctx.featured.barBoard;
  if (!data?.pins?.length) return null;
  return (
    <ModuleShell icon={LayoutGrid} title="The Board" ctx={ctx}>
      <BarBoardView
        data={data}
        profileUserId={ctx.profileUserId}
        viewerSlug={ctx.viewerSlug}
      />
    </ModuleShell>
  );
}

// ---------------------------------------------------------------------------
// Finish this bar (Open LOCK)
// ---------------------------------------------------------------------------

type OpenLockRow = {
  id: string;
  seedBar: string;
  echoCount: number;
  status?: string;
};

async function fetchLockSummary(lockId: string): Promise<OpenLockRow | null> {
  const id = lockId.trim();
  if (!id) return null;
  try {
    const res = await fetch(`/api/lock/${encodeURIComponent(id)}`);
    if (!res.ok) return null;
    const data = (await res.json()) as {
      lock?: { id?: string; seedBar?: string; echoCount?: number; status?: string };
    };
    const lock = data.lock;
    if (!lock?.id) return null;
    return {
      id: String(lock.id),
      seedBar: String(lock.seedBar || '').trim(),
      echoCount: typeof lock.echoCount === 'number' ? lock.echoCount : 0,
      status: typeof lock.status === 'string' ? lock.status : 'open',
    };
  } catch {
    return null;
  }
}

export function OpenLockModule({ ctx }: { ctx: ModuleContext }) {
  const featuredId = ctx.featured.openLockId;
  const [locks, setLocks] = useState<OpenLockRow[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoaded(false);

    const load = async () => {
      let rows: OpenLockRow[] = [];
      try {
        const res = await fetch(
          `/api/lock/by-owner?userId=${encodeURIComponent(ctx.profileUserId)}`
        );
        if (res.ok) {
          const data = await res.json();
          const list = Array.isArray(data.locks) ? data.locks : [];
          rows = list
            .map((l: { id?: string; seedBar?: string; echoCount?: number; status?: string }) => ({
              id: String(l.id || ''),
              seedBar: String(l.seedBar || '').trim(),
              echoCount: typeof l.echoCount === 'number' ? l.echoCount : 0,
              status: typeof l.status === 'string' ? l.status : 'open',
            }))
            .filter((l: OpenLockRow) => l.id);
        }
      } catch {
        rows = [];
      }

      // Featured cast always appears, even if the by-owner index lags.
      if (featuredId && !rows.some((l) => l.id === featuredId)) {
        rows = [{ id: featuredId, seedBar: '', echoCount: 0 }, ...rows];
      }

      // Hydrate any row missing the seed bar so the profile shows the line before click-in.
      const missing = rows.filter((l) => !l.seedBar).map((l) => l.id);
      if (missing.length) {
        const extras = await Promise.all(missing.slice(0, 12).map((id) => fetchLockSummary(id)));
        const byId = new Map(
          extras.filter((x): x is OpenLockRow => Boolean(x?.id)).map((x) => [x.id, x])
        );
        rows = rows.map((l) => {
          const hit = byId.get(l.id);
          if (!hit) return l;
          return {
            ...l,
            seedBar: hit.seedBar || l.seedBar,
            echoCount: hit.echoCount || l.echoCount,
            status: hit.status || l.status,
          };
        });
      }

      if (!cancelled) {
        setLocks(rows);
        setLoaded(true);
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [ctx.profileUserId, featuredId]);

  const ordered = useMemo(() => {
    if (!featuredId) return locks;
    const pin = locks.find((l) => l.id === featuredId);
    const rest = locks.filter((l) => l.id !== featuredId);
    return pin ? [pin, ...rest] : locks;
  }, [locks, featuredId]);

  const rows = ordered;

  return (
    <ModuleShell icon={Lock} title="Finish this bar" ctx={ctx}>
      {!loaded ? (
        <p className="text-sm text-muted-foreground">Loading open lines…</p>
      ) : rows.length === 0 ? (
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">No open line right now.</p>
          {ctx.isOwner ? (
            <Button asChild variant="outline" size="sm" className="font-bold uppercase">
              <Link href="/lock/desk">Publish one →</Link>
            </Button>
          ) : null}
        </div>
      ) : (
        <ul className="space-y-2.5">
          {rows.map((lock) => {
            const featured = Boolean(featuredId && lock.id === featuredId);
            const bar = lock.seedBar.trim();
            return (
              <li key={lock.id}>
                <Link
                  href={`/lock/${lock.id}`}
                  className={cn(
                    'block rounded-lg border px-3 py-3 transition-colors',
                    'border-[var(--ph-border,rgba(255,255,255,0.12))] bg-black/25',
                    'hover:border-[var(--ph-accent,#7dd3fc)] hover:bg-black/40'
                  )}
                >
                  {featured ? (
                    <p className="mb-1.5 text-[9px] font-bold uppercase tracking-[0.2em] text-[var(--ph-accent,#7dd3fc)]">
                      Featured
                    </p>
                  ) : null}
                  {bar ? (
                    <p className="font-headline text-sm font-bold leading-snug tracking-tight text-[var(--ph-text,#fff)] sm:text-base">
                      &ldquo;{bar}&rdquo;
                    </p>
                  ) : (
                    <p className="text-sm text-[var(--ph-muted,rgba(255,255,255,0.55))]">
                      Open unfinished line…
                    </p>
                  )}
                  <p className="mt-1.5 text-[10px] font-bold uppercase tracking-wider text-[var(--ph-muted,rgba(255,255,255,0.55))]">
                    {lock.echoCount === 1
                      ? '1 reply · Finish it →'
                      : `${lock.echoCount} replies · Finish it →`}
                  </p>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
      {ctx.isOwner && loaded ? (
        <Link
          href="/lock/desk"
          className="mt-3 inline-block text-[10px] font-bold uppercase tracking-widest text-[var(--ph-accent,#7dd3fc)] hover:underline"
        >
          Manage your lines →
        </Link>
      ) : null}
    </ModuleShell>
  );
}

// ---------------------------------------------------------------------------
// Drop Shelf — all live DNA Drops (auto)
// ---------------------------------------------------------------------------

export function DropShelfModule({ ctx }: { ctx: ModuleContext }) {
  const drops = ctx.liveDnaDrops || [];
  const { enabled: firstDropsOn } = useFirstDropsFeature();
  if (!drops.length) return null;
  const firstCount = firstDropTracks(drops).length;
  const hideFirstDropStrip = firstDropsOn && firstCount > 0;
  if (hideFirstDropStrip) {
    const hasDnaOnly = drops.some((d) => d.type === 'album' || !d.hasDropAudio);
    if (!hasDnaOnly) return null;
  }

  return (
    <ModuleShell
      icon={Dna}
      title={hideFirstDropStrip ? 'Lyric DNA Drops' : firstCount > 0 ? 'Listen / Buy' : 'Live DNA Drops'}
      ctx={ctx}
    >
      <LiveDnaDropsGroupedList
        drops={drops}
        layout="shelf"
        hideFirstDropStrip={hideFirstDropStrip}
      />
    </ModuleShell>
  );
}

// ---------------------------------------------------------------------------
// Proof Wall (badges)
// ---------------------------------------------------------------------------

const PROOF_WALL_LAYOUT: Record<
  ModuleSize,
  { limit: number; density: 'compact' | 'cozy' | 'roomy'; grid: string }
> = {
  // Half-column plate: 2-up, compact chrome (4-up was clipping serials/copy).
  S: {
    limit: 4,
    density: 'compact',
    grid: 'grid grid-cols-2 gap-2.5 auto-rows-[minmax(128px,auto)]',
  },
  // Full-width plate: roomier 3-up wall.
  M: {
    limit: 6,
    density: 'cozy',
    grid: 'grid grid-cols-2 gap-3.5 sm:grid-cols-3 auto-rows-[minmax(148px,auto)]',
  },
  // Full-bleed: densest wall + bento spans.
  L: {
    limit: 8,
    density: 'roomy',
    grid: 'grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 auto-rows-[minmax(148px,auto)]',
  },
};

export function ProofWallModule({ ctx }: { ctx: ModuleContext }) {
  const badges = [...ctx.badges].sort((a, b) => b.xpReward - a.xpReward);
  if (!badges.length) return null;
  const layout = PROOF_WALL_LAYOUT[ctx.size] ?? PROOF_WALL_LAYOUT.M;
  return (
    <ModuleShell icon={BookOpen} title={"Proof Wall"} ctx={ctx}>
      <div className={layout.grid}>
        {badges.slice(0, layout.limit).map((badge, i) => (
          <PublicAchievementFoil
            key={badge.id}
            achievement={badge}
            displayName={ctx.profileName}
            index={i}
            density={layout.density}
            rankLabel={ctx.rankLabel}
            xp={ctx.xp}
            streak={ctx.currentStreak}
            unlockedAt={ctx.unlockedAchievements?.[badge.id]}
          />
        ))}
      </div>
    </ModuleShell>
  );
}

// ---------------------------------------------------------------------------
// The Wall (posts)
// ---------------------------------------------------------------------------

const WALL_PAGE_SIZE = 15;
/** Enough for ~10 in-module pages without a separate wall route. */
const WALL_FETCH_MAX = 150;

export function WallModule({ ctx }: { ctx: ModuleContext }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const playground = ctx.playgroundWall;
  const [posts, setPosts] = useState<ProfilePost[]>(playground?.posts || []);
  const [loaded, setLoaded] = useState(Boolean(playground));
  const [text, setText] = useState('');
  const [embedUrl, setEmbedUrl] = useState('');
  const [voice, setVoice] = useState<RecordedVoiceClip | null>(null);
  const [image, setImage] = useState<PendingPostImage | null>(null);
  const [busy, setBusy] = useState(false);
  const [page, setPage] = useState(0);

  useEffect(() => {
    if (playground) {
      setPosts(playground.posts);
      setLoaded(true);
      setPage(0);
      return;
    }
    setPage(0);
    fetchPostsByOwner(ctx.profileUserId, WALL_FETCH_MAX)
      .then(setPosts)
      .catch(() => undefined)
      .finally(() => setLoaded(true));
  }, [ctx.profileUserId, playground]);

  // Keep playground posts in sync when the guest sandbox mutates them.
  useEffect(() => {
    if (!playground) return;
    setPosts(playground.posts);
  }, [playground, playground?.posts]);

  const embedPreview = useMemo(() => parseEmbedUrl(embedUrl), [embedUrl]);
  const canCompose = Boolean(playground) || (ctx.isOwner && user);

  const pageCount = Math.max(1, Math.ceil(posts.length / WALL_PAGE_SIZE) || 1);
  const safePage = Math.min(Math.max(0, page), pageCount - 1);
  const pagePosts = posts.slice(
    safePage * WALL_PAGE_SIZE,
    safePage * WALL_PAGE_SIZE + WALL_PAGE_SIZE
  );
  const showPager = posts.length > WALL_PAGE_SIZE;

  useEffect(() => {
    if (page !== safePage) setPage(safePage);
  }, [page, safePage]);

  const submit = async () => {
    if (playground) {
      const clean = text.trim();
      const link = embedUrl.trim();
      if (!clean && !link && !image) return;
      if (link && !parseEmbedUrl(link)) {
        toast({
          variant: 'destructive',
          title: 'Unsupported link',
          description: EMBED_HELP_TEXT,
        });
        return;
      }
      let guestImageUrl: string | undefined;
      if (image) {
        try {
          guestImageUrl = await pendingImageToDataUrl(image);
        } catch (e) {
          toast({
            variant: 'destructive',
            title: 'Could not attach photo',
            description: e instanceof Error ? e.message : undefined,
          });
          return;
        }
      }
      playground.onPost({
        text: clean,
        ...(link ? { embedUrl: link.slice(0, 500) } : {}),
        ...(guestImageUrl ? { imageUrl: guestImageUrl } : {}),
      });
      setText('');
      setEmbedUrl('');
      revokePostImagePreview(image);
      setImage(null);
      setPage(0);
      return;
    }
    if (!user) return;
    if (!text.trim() && !embedUrl.trim() && !voice && !image) return;
    setBusy(true);
    try {
      const post = await createPost({
        text,
        embedUrl: embedUrl.trim() || undefined,
        ownerName: user.displayName || 'Artist',
        ownerSlug: ctx.profileSlug,
        ...(voice ? { voice } : {}),
        ...(image ? { image } : {}),
      });
      setPosts((prev) => [post, ...prev]);
      setText('');
      setEmbedUrl('');
      setVoice(null);
      revokePostImagePreview(image);
      setImage(null);
      setPage(0);
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

  if (!canCompose && loaded && posts.length === 0) return null;

  return (
    <ModuleShell icon={PenLine} title={"The Wall"} ctx={ctx}>
      {canCompose && (
        <div className={cn(inkWellClass, 'mb-5 space-y-2 p-4')}>
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onPaste={(e) => {
              void attachPastedImage(e, {
                disabled: busy,
                image,
                onImageChange: setImage,
                maxBytes: playground ? POST_IMAGE_GUEST_MAX_BYTES : undefined,
                onError: (message) =>
                  toast({
                    variant: 'destructive',
                    title: 'Could not attach photo',
                    description: message,
                  }),
              });
            }}
            maxLength={1000}
            rows={2}
            placeholder={
              playground
                ? 'Try a wall post — claim your profile to keep it…'
                : 'Drop a thought, a photo, a release...'
            }
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
          {playground ? (
            <p className="text-[10px] text-[var(--ph-muted,rgba(255,255,255,0.5))]">
              Demo wall — text, photos, and links stay here until you claim your free profile.
            </p>
          ) : (
            <VoiceNoteComposer clip={voice} onClipChange={setVoice} disabled={busy} />
          )}
          <ImageAttachComposer
            image={image}
            onImageChange={setImage}
            disabled={busy}
            maxBytes={playground ? POST_IMAGE_GUEST_MAX_BYTES : undefined}
            onError={(message) =>
              toast({
                variant: 'destructive',
                title: 'Could not attach photo',
                description: message,
              })
            }
          />
          <div className="flex justify-end">
            <Button
              size="sm"
              className="h-9 gap-1.5 font-bold uppercase"
              disabled={busy || (!text.trim() && !embedUrl.trim() && !voice && !image)}
              onClick={() => void submit()}
            >
              <Send className="h-3.5 w-3.5" /> Post
            </Button>
          </div>
        </div>
      )}

      <div className="space-y-4">
        {pagePosts.map((post) => (
          <div key={post.id} className="relative">
            <PostCard
              post={post}
              showAuthor
              viewerSlug={ctx.viewerSlug}
              onDeleted={
                playground
                  ? undefined
                  : (id) => setPosts((prev) => prev.filter((p) => p.id !== id))
              }
            />
            {playground?.onDelete ? (
              <button
                type="button"
                className="absolute top-2 right-2 text-[10px] uppercase tracking-wider text-[var(--ph-muted)] hover:text-rose-400"
                onClick={() => playground.onDelete?.(post.id)}
              >
                Remove
              </button>
            ) : null}
          </div>
        ))}
        {loaded && posts.length === 0 && canCompose && (
          <p className="py-6 text-center text-sm text-[var(--ph-muted,rgba(255,255,255,0.55))]">
            Your wall is blank — post your first drop.
          </p>
        )}
      </div>

      {showPager ? (
        <div className="mt-5 flex items-center justify-between gap-3 border-t border-dashed border-[var(--ph-border,rgba(255,255,255,0.12))] pt-4">
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-8 gap-1 border-[var(--ph-border,rgba(255,255,255,0.12))] bg-black/20 px-2.5 text-[10px] font-bold uppercase tracking-wider text-[var(--ph-text,#fff)] hover:border-[var(--ph-accent,#7dd3fc)] hover:text-[var(--ph-accent,#7dd3fc)]"
            disabled={safePage <= 0}
            onClick={() => setPage((p) => Math.max(0, p - 1))}
          >
            <ChevronLeft className="h-3.5 w-3.5" />
            Prev
          </Button>
          <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[var(--ph-muted,rgba(255,255,255,0.55))]">
            {safePage + 1} / {pageCount}
            <span className="ml-2 font-normal tracking-widest opacity-80">
              · {posts.length} posts
            </span>
          </p>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-8 gap-1 border-[var(--ph-border,rgba(255,255,255,0.12))] bg-black/20 px-2.5 text-[10px] font-bold uppercase tracking-wider text-[var(--ph-text,#fff)] hover:border-[var(--ph-accent,#7dd3fc)] hover:text-[var(--ph-accent,#7dd3fc)]"
            disabled={safePage >= pageCount - 1}
            onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
          >
            Next
            <ChevronRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      ) : null}
    </ModuleShell>
  );
}

// ---------------------------------------------------------------------------
// Friends
// ---------------------------------------------------------------------------

const FRIENDS_PAGE_SIZE = 20;

export function FriendsModule({ ctx }: { ctx: ModuleContext }) {
  const { user } = useAuth();
  const playground = ctx.playgroundFriends;
  const [friends, setFriends] = useState<CircleFriendRow[]>(
    (playground || []).map((f) => ({
      userId: f.userId,
      name: f.name,
      slug: f.slug,
      isLivePublic: Boolean(f.slug),
    }))
  );
  const [loaded, setLoaded] = useState(Boolean(playground));
  const [page, setPage] = useState(0);

  useEffect(() => {
    if (playground) {
      setFriends(
        playground.map((f) => ({
          userId: f.userId,
          name: f.name,
          slug: f.slug,
          isLivePublic: Boolean(f.slug),
        }))
      );
      setLoaded(true);
      setPage(0);
      return;
    }
    setPage(0);
    let cancelled = false;
    void (async () => {
      try {
        const list = await fetchFriendships(ctx.profileUserId, 'accepted');
        const chips = friendProfilesOf(list, ctx.profileUserId, {
          email: user?.email,
          displayName: user?.displayName,
        });
        let base = chips;
        try {
          base = await enrichFriendProfilesWithLiveSlugs(chips);
        } catch (err) {
          console.warn('[friends-module] enrich failed', err);
        }
        // Artist Home lists: live-public friends only — never show private/offline here.
        const resolved = await resolveCircleFriends(base);
        if (cancelled) return;
        setFriends(visibleCircleFriends(resolved, false));
      } catch (err) {
        console.warn('[friends-module]', err);
      } finally {
        if (!cancelled) setLoaded(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [ctx.profileUserId, playground, user?.email, user?.displayName]);

  const pageCount = Math.max(1, Math.ceil(friends.length / FRIENDS_PAGE_SIZE) || 1);
  const safePage = Math.min(Math.max(0, page), pageCount - 1);
  const pageFriends = friends.slice(
    safePage * FRIENDS_PAGE_SIZE,
    safePage * FRIENDS_PAGE_SIZE + FRIENDS_PAGE_SIZE
  );
  const showPager = friends.length > FRIENDS_PAGE_SIZE;

  useEffect(() => {
    if (page !== safePage) setPage(safePage);
  }, [page, safePage]);

  if (loaded && friends.length === 0) return null;

  return (
    <ModuleShell
      icon={Users}
      title={`Friends${friends.length ? ` · ${friends.length}` : ''}`}
      ctx={ctx}
      action={
        !playground && ctx.profileSlug ? (
          <Link
            href={profileFriendsHref(ctx.profileSlug) || '/friends'}
            className="text-[10px] font-bold uppercase tracking-widest text-[var(--ph-accent,#7dd3fc)] hover:underline"
          >
            See all →
          </Link>
        ) : undefined
      }
    >
      <div className="flex flex-wrap gap-2">
        {pageFriends.map((friend) => {
          const chip = (
            <span className="inline-flex items-center gap-2 rounded-full border border-[var(--ph-border,rgba(255,255,255,0.12))] bg-black/30 py-1 pl-1 pr-3 text-xs font-bold text-[var(--ph-text,#fff)] transition-colors hover:border-[var(--ph-accent,#7dd3fc)] hover:text-[var(--ph-accent,#7dd3fc)]">
              <ArtistStarAvatar
                name={friend.name}
                avatarUrl={friend.avatarUrl}
                useStarMark={friend.starMarkUseStar}
                starMarkSeed={friend.starMarkSeed}
                studioChrome={parseStudioBadge(friend.studioBadge) || 'free'}
                size={22}
                hideInitials
              />
              {friend.name}
            </span>
          );
          return friend.slug ? (
            <Link key={friend.userId} href={profileHref(friend.slug) || '#'}>
              {chip}
            </Link>
          ) : (
            <span key={friend.userId} className="opacity-70">
              {chip}
            </span>
          );
        })}
      </div>

      {showPager ? (
        <div className="mt-5 flex items-center justify-between gap-3 border-t border-dashed border-[var(--ph-border,rgba(255,255,255,0.12))] pt-4">
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-8 gap-1 border-[var(--ph-border,rgba(255,255,255,0.12))] bg-black/20 px-2.5 text-[10px] font-bold uppercase tracking-wider text-[var(--ph-text,#fff)] hover:border-[var(--ph-accent,#7dd3fc)] hover:text-[var(--ph-accent,#7dd3fc)]"
            disabled={safePage <= 0}
            onClick={() => setPage((p) => Math.max(0, p - 1))}
          >
            <ChevronLeft className="h-3.5 w-3.5" />
            Prev
          </Button>
          <div className="flex flex-col items-center gap-1">
            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[var(--ph-muted,rgba(255,255,255,0.55))]">
              {safePage + 1} / {pageCount}
              <span className="ml-2 font-normal tracking-widest opacity-80">
                · {friends.length} friends
              </span>
            </p>
            {ctx.profileSlug ? (
              <Link
                href={profileFriendsHref(ctx.profileSlug) || '/friends'}
                className="text-[9px] font-bold uppercase tracking-widest text-[var(--ph-accent,#7dd3fc)] hover:underline"
              >
                See all · search
              </Link>
            ) : null}
          </div>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-8 gap-1 border-[var(--ph-border,rgba(255,255,255,0.12))] bg-black/20 px-2.5 text-[10px] font-bold uppercase tracking-wider text-[var(--ph-text,#fff)] hover:border-[var(--ph-accent,#7dd3fc)] hover:text-[var(--ph-accent,#7dd3fc)]"
            disabled={safePage >= pageCount - 1}
            onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
          >
            Next
            <ChevronRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      ) : null}
    </ModuleShell>
  );
}

// ---------------------------------------------------------------------------
// Guestbook
// ---------------------------------------------------------------------------

export function GuestbookModule({ ctx }: { ctx: ModuleContext }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const playground = ctx.playgroundGuestbook;
  const [entries, setEntries] = useState<GuestbookEntry[]>(playground || []);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (playground) {
      setEntries(playground);
      return;
    }
    fetchGuestbook(ctx.profileUserId)
      .then(setEntries)
      .catch(() => undefined);
  }, [ctx.profileUserId, playground]);

  const canSign = !playground && Boolean(user && user.id !== ctx.profileUserId);
  const myEntry = user ? entries.find((e) => e.authorId === user.id) : undefined;

  const sign = async () => {
    if (!user || playground) return;
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
      {!user && !playground && (
        <p className="mb-4 text-xs text-[var(--ph-muted,rgba(255,255,255,0.55))]">
          <Link href="/login" className="text-[var(--ph-accent,#7dd3fc)] hover:underline">
            Sign in
          </Link>{' '}
          to leave one line in the book.
        </p>
      )}
      {playground ? (
        <p className="mb-4 text-xs text-[var(--ph-muted,rgba(255,255,255,0.55))]">
          Guestbook preview — tap Neomaiya Sol to open her real Artist Home.
        </p>
      ) : null}
      <div className="space-y-2.5">
        {entries.slice(0, 20).map((entry) => (
          <div key={entry.id} className="flex items-start gap-2 text-sm">
            <div className="min-w-0 flex-1">
              <ArtistHomeLink
                userId={entry.authorId}
                slug={entry.authorSlug}
                className="mr-2 text-[11px] font-bold uppercase tracking-wider text-[var(--ph-accent2,#fbbf24)] hover:underline"
              >
                {entry.authorName}
              </ArtistHomeLink>
              <span className="italic text-[var(--ph-text,#fff)]/85">&ldquo;{entry.text}&rdquo;</span>
            </div>
            {!playground && user?.id && (user.id === entry.authorId || ctx.isOwner) && (
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
