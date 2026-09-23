'use client';

/**
 * Artist Home module renderers. Each module is one section in the maker's
 * ordered deck — every one exists to pull visitors one step deeper into the
 * artist's world on AKAsheet.ink (share pages, DNA drops, the studio itself).
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import {
  BookOpen,
  BarChart3,
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
  Sparkles,
  Trash2,
  Users,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { useGamification } from '@/context/gamification-context';
import { cn } from '@/lib/utils';
import { profileFriendsHref, profileHref } from '@/lib/profile/profile-slug';
import { parseStudioBadge, studioNameClass } from '@/lib/studio-tier-chrome';
import type { ArtistHomeFeatured, ModuleSize } from '@/lib/profile/modules';
import { FingerprintSvg } from '@/components/profile/rhyme-fingerprint-svg';
import { BarBoardView } from '@/components/profile/bar-board-module';
import { EmbedPlayer, FeaturedTrackPlayer } from '@/components/profile/embed-player';
import { ComposerLinkPreview } from '@/components/profile/inline-link-preview';
import { firstInlineHref } from '@/lib/profile/inline-links';
import { PostCard } from '@/components/profile/post-card';
import { VoiceNoteComposer } from '@/components/profile/voice-note-composer';
import { ImageAttachComposer, attachPastedImage } from '@/components/profile/image-attach-composer';
import { PressPlate, type PressPlateChrome } from '@/components/profile/press-plate';
import { PublicAchievementFoil } from '@/components/profile/public-achievement-foil';
import { firstDropTracks, LiveDnaDropsGroupedList, selectDropShelfDna } from '@/components/profile/live-dna-drop-card';
import { useFirstDropsFeature } from '@/hooks/use-first-drops-feature';
import type { AchievementDef } from '@/lib/gamification/achievements';
import {
  createPost,
  deleteGuestbookEntry,
  enrichGuestbookEntries,
  fetchGuestbook,
  fetchPostById,
  fetchPostsByOwner,
  resolvePlaygroundFriends,
  setGuestbookEntry,
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
import { revokeWallClipPreview, type PendingWallClip } from '@/lib/profile/wall-clips';
import { ArtistHomeLink } from '@/components/profile/artist-home-link';
import { ArtistStarAvatar } from '@/components/profile/artist-star-avatar';
import { EmojiPickerButton, useEmojiInserter } from '@/components/ui/emoji-picker-button';
import { SCENE_BOOTH_ID } from '@/lib/scene-home';
import { isMasterAdminEmail } from '@/lib/master-admin';
import { MentionField } from '@/components/profile/mention-suggestions';
import { PollComposerFields } from '@/components/profile/poll-composer-fields';
import { ImprintExportMenu } from '@/components/profile/imprint-export-menu';
import { QuotePressCard } from '@/components/profile/quote-press-card';
import { ImprintScaleFit, type ImprintShelfDensity } from '@/components/profile/imprint-scale-fit';
import { queueAutoImprintSyndication } from '@/lib/profile/imprint-syndicate-client';
import { QuotePressComposerPanel } from '@/components/profile/quote-press-composer-panel';
import { useImprintComposer } from '@/hooks/use-imprint-composer';
import { isProOrTrial } from '@/lib/subscription';
import { quotePressSlotLabel } from '@/lib/profile/quote-press';
import type { PostPollResultsVisibility } from '@/lib/profile/post-polls';
import type { PublicWallPostsPage } from '@/lib/server/public-post';
import { activityPostHash, parseActivityPostHash, scrollActivityPostTarget } from '@/lib/activity/post-deep-link';

export type ModuleContext = {
  profileUserId: string;
  profileName: string;
  profileSlug?: string;
  /** SSR-stable path for public post back-links on this page. */
  activityFromPath?: string;
  isOwner: boolean;
  previewMode?: boolean;
  viewerSlug?: string;
  featured: ArtistHomeFeatured;
  badges: AchievementDef[];
  /** Achievement id → unlock ISO timestamp. */
  unlockedAchievements?: Record<string, string>;
  rankLabel?: string;
  xp?: number;
  currentStreak?: number;
  /** Live music releases and lyric DNA pages currently online for this artist. */
  liveDnaDrops?: Array<{
    shareId: string;
    title: string;
    type: 'album' | 'track';
    albumTitle?: string;
    albumShareId?: string;
    trackIndex?: number;
    trackCount?: number;
    hasDropAudio?: boolean;
    releaseLive?: boolean;
    dnaLive?: boolean;
    houseRelease?: boolean;
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
  /** Server-rendered first wall page — paints posts in HTML before client fetch. */
  initialWallPosts?: PublicWallPostsPage | null;
  /** Server-rendered imprint shelf posts when the module is enabled. */
  initialImprintPosts?: ProfilePost[];
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
      density={ctx.size === 'S' ? 'compact' : 'default'}
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
  if (firstDropsOn && ctx.featured.featuredTrack && ctx.profileUserId) {
    return (
      <ModuleShell icon={Disc3} title="Now Playing" ctx={ctx}>
        <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
          <p className="font-headline text-lg text-[var(--ph-text,#fff)]">
            {ctx.featured.featuredTrack.title}
          </p>
          <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--ph-muted,rgba(255,255,255,0.55))]">
            {ctx.featured.featuredTrack.source === 'purchased' ? 'From my Library' : 'My release'}
          </p>
        </div>
        <FeaturedTrackPlayer
          selection={ctx.featured.featuredTrack}
          profileUserId={ctx.profileUserId}
          previewMode={ctx.previewMode}
        />
      </ModuleShell>
    );
  }
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
        href={`/song/${featuredDrop.shareId}`}
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
        <div className={ctx.size === 'S' ? '[&_blockquote]:text-[clamp(1.05rem,2.5vw,1.45rem)]' : undefined}>
          <PlaygroundBarOfWeekQuote value={playground.text} onChange={playground.onChange} />
        </div>
      ) : (
        <>
          <blockquote
            className={cn(
              'font-headline leading-tight text-[var(--ph-text,#fff)]',
              ctx.size === 'S'
                ? 'text-[clamp(1.05rem,2.5vw,1.45rem)]'
                : 'text-[clamp(1.4rem,3.5vw,2.4rem)]'
            )}
          >
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
// Drop Shelf — all live Lyrics DNA Drops (auto)
// ---------------------------------------------------------------------------

export function DropShelfModule({ ctx }: { ctx: ModuleContext }) {
  const dnaDrops = selectDropShelfDna(ctx.liveDnaDrops || [], ctx.featured.dropShelfShareIds);

  return (
    <ModuleShell icon={Dna} title="Live Lyrics DNA Drops" ctx={ctx}>
      {dnaDrops.length ? (
        <LiveDnaDropsGroupedList drops={dnaDrops} layout="shelf" hideFirstDropStrip />
      ) : (
        <p className="text-sm text-muted-foreground">No live Lyrics DNA Drops yet</p>
      )}
    </ModuleShell>
  );
}

// ---------------------------------------------------------------------------
// Imprint Shelf — curated imprint posts
// ---------------------------------------------------------------------------

const IMPRINT_SHELF_LAYOUT: Record<ModuleSize, string> = {
  // S — single column so a lone imprint doesn't leave a phantom second column.
  S: 'grid grid-cols-1 gap-4 items-start [&>*]:w-full [&>*]:min-w-0 [&>*]:max-w-full',
  // M — between S and L; single column so cards render at ~540px.
  M: 'grid grid-cols-1 gap-5 items-start [&>*]:w-full [&>*]:min-w-0',
  // L — original 576px; one per row, full size.
  L: 'grid grid-cols-1 gap-6 items-start [&>*]:w-full [&>*]:min-w-0',
};

function ImprintShelfCard({
  post,
  ctx,
  density,
}: {
  post: ProfilePost;
  ctx: ModuleContext;
  density: ImprintShelfDensity;
}) {
  const [imprintRoot, setImprintRoot] = useState<HTMLElement | null>(null);
  const [saveCount, setSaveCount] = useState(post.imprintSaveCount || 0);

  useEffect(() => {
    setSaveCount(post.imprintSaveCount || 0);
  }, [post.imprintSaveCount]);

  return (
    <div id={activityPostHash(post.id)} className="min-w-0">
      <ImprintScaleFit density={density}>
        <QuotePressCard
          ref={setImprintRoot}
          text={post.text}
          config={post.quotePress!}
          withMentions
          creatorSlug={post.ownerSlug}
        />
      </ImprintScaleFit>
      <div className="mt-1 flex items-center justify-end gap-1">
        <ImprintExportMenu
          captureRoot={imprintRoot}
          text={post.text}
          quotePress={post.quotePress}
          creatorSlug={post.ownerSlug}
          post={{ ...post, imprintSaveCount: saveCount }}
          hostProfileUserId={ctx.profileUserId}
          onSaveCountChange={setSaveCount}
        />
      </div>
    </div>
  );
}

export function ImprintShelfModule({ ctx }: { ctx: ModuleContext }) {
  const ids = ctx.featured.imprintShelfPostIds;
  const idKey = ids?.join(',') || '';
  const previewPosts = ctx.previewMode ? ctx.initialImprintPosts : undefined;
  const hasInitial = Boolean(ctx.initialImprintPosts?.length);
  const [posts, setPosts] = useState<ProfilePost[]>(ctx.initialImprintPosts || []);
  const [loaded, setLoaded] = useState(Boolean(previewPosts) || hasInitial);

  useEffect(() => {
    if (!ids?.length) {
      setPosts([]);
      setLoaded(true);
      return;
    }
    if (previewPosts) {
      const byId = new Map(previewPosts.map((post) => [post.id, post]));
      setPosts(ids.map((id) => byId.get(id)).filter((post): post is ProfilePost => Boolean(post)));
      setLoaded(true);
      return;
    }
    if (!ctx.profileSlug) {
      setPosts([]);
      setLoaded(true);
      return;
    }
    if (hasInitial && ctx.initialImprintPosts?.length) {
      const byId = new Map(ctx.initialImprintPosts.map((post) => [post.id, post]));
      setPosts(ids.map((id) => byId.get(id)).filter((post): post is ProfilePost => Boolean(post)));
      setLoaded(true);
      return;
    }
    let cancelled = false;
    setLoaded(false);
    const params = new URLSearchParams({
      kind: 'imprints',
      ids: ids.join(','),
    });
    void fetch(`/api/profile/${encodeURIComponent(ctx.profileSlug)}/posts?${params}`)
      .then((res) => res.json())
      .then((data: { posts?: ProfilePost[] }) => {
        if (cancelled) return;
        const rows = Array.isArray(data.posts) ? data.posts : [];
        const byId = new Map(rows.map((post) => [post.id, post]));
        setPosts(ids.map((id) => byId.get(id)).filter((post): post is ProfilePost => Boolean(post)));
      })
      .catch(() => {
        if (!cancelled) setPosts([]);
      })
      .finally(() => {
        if (!cancelled) setLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, [ctx.profileSlug, idKey, hasInitial, ctx.initialImprintPosts, previewPosts, ctx.previewMode]);

  if (!ids?.length) return null;
  if (loaded && !posts.length) return null;

  const grid = IMPRINT_SHELF_LAYOUT[ctx.size] ?? IMPRINT_SHELF_LAYOUT.L;

  return (
    <ModuleShell icon={Sparkles} title="Imprints" ctx={ctx}>
      {!loaded ? (
        <p className="text-[10px] uppercase tracking-widest text-[var(--ph-muted,rgba(255,255,255,0.55))]">
          Loading imprints…
        </p>
      ) : (
        <div className={grid}>
          {posts.map((post) => (
            <ImprintShelfCard key={post.id} post={post} ctx={ctx} density={ctx.size} />
          ))}
        </div>
      )}
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

const wallPagerButtonClass =
  'h-8 gap-1 bg-[var(--ph-accent)] px-2.5 text-[10px] font-bold uppercase tracking-wider text-black shadow-none hover:opacity-90 disabled:opacity-40';

function WallPager({
  safePage,
  pageCount,
  postTotal,
  onPrev,
  onNext,
  edge = 'bottom',
}: {
  safePage: number;
  pageCount: number;
  postTotal: number;
  onPrev: () => void;
  onNext: () => void;
  edge?: 'top' | 'bottom';
}) {
  return (
    <div
      className={cn(
        'flex items-center justify-between gap-3 border-dashed border-[var(--ph-border,rgba(255,255,255,0.12))]',
        edge === 'top' ? 'mb-4 border-b pb-4' : 'mt-5 border-t pt-4'
      )}
    >
      <Button
        type="button"
        size="sm"
        className={wallPagerButtonClass}
        disabled={safePage <= 0}
        onClick={onPrev}
      >
        <ChevronLeft className="h-3.5 w-3.5" />
        Prev
      </Button>
      <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[var(--ph-muted,rgba(255,255,255,0.55))]">
        {safePage + 1} / {pageCount}
        <span className="ml-2 font-normal tracking-widest opacity-80">· {postTotal} posts</span>
      </p>
      <Button
        type="button"
        size="sm"
        className={wallPagerButtonClass}
        disabled={safePage >= pageCount - 1}
        onClick={onNext}
      >
        Next
        <ChevronRight className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}

export function WallModule({ ctx }: { ctx: ModuleContext }) {
  const { user } = useAuth();
  const { summary, loading: profileLoading } = useGamification();
  const { toast } = useToast();
  const isPro = isProOrTrial(user);
  const playground = ctx.playgroundWall;
  const initialWall = ctx.initialWallPosts;
  const [posts, setPosts] = useState<ProfilePost[]>(
    playground?.posts || initialWall?.posts || []
  );
  const [loaded, setLoaded] = useState(Boolean(playground || initialWall));
  const [text, setText] = useState('');
  const [voice, setVoice] = useState<RecordedVoiceClip | null>(null);
  const [image, setImage] = useState<PendingPostImage | null>(null);
  const [clip, setClip] = useState<PendingWallClip | null>(null);
  const [pollOpen, setPollOpen] = useState(false);
  const [pollOptions, setPollOptions] = useState(['', '']);
  const [pollVisibility, setPollVisibility] = useState<PostPollResultsVisibility>('after_vote');
  const [busy, setBusy] = useState(false);
  const [page, setPage] = useState(initialWall?.page || 0);
  const [wallPageCount, setWallPageCount] = useState(initialWall?.pageCount || 1);
  const [wallTotal, setWallTotal] = useState(
    playground?.posts.length || initialWall?.total || 0
  );
  const textRef = useRef<HTMLTextAreaElement>(null);
  const imprintPreviewRef = useRef<HTMLDivElement | null>(null);
  const wallPostsTopRef = useRef<HTMLDivElement>(null);
  const wallScrollAfterPageRef = useRef(false);
  const insertEmoji = useEmojiInserter(text, setText, textRef);
  const {
    imprintOn,
    toggleImprint,
    resetImprint,
    imprintFaders,
    setImprintFaders,
    imprintSlots,
    slotBusy,
    activeImprintConfig,
    persistImprintSlots,
    imprintPayload,
  } = useImprintComposer(text, isPro, summary.quotePressSlots);
  const [focusPostId, setFocusPostId] = useState('');

  useEffect(() => {
    if (playground) {
      setPosts(playground.posts);
      setLoaded(true);
      setPage(0);
      setFocusPostId('');
      return;
    }

    const readFocusId = () => {
      if (typeof window === 'undefined') return '';
      const fromQuery = new URLSearchParams(window.location.search).get('p')?.trim() || '';
      if (fromQuery) return fromQuery;
      return parseActivityPostHash(window.location.hash)?.postId || '';
    };

    const focusId = readFocusId();
    setFocusPostId(focusId);

    const hydrateFromInitial = () => {
      if (!initialWall?.posts.length) return false;
      setPosts(initialWall.posts);
      setPage(initialWall.page);
      setWallPageCount(initialWall.pageCount);
      setWallTotal(initialWall.total);
      setLoaded(true);
      return true;
    };

    if (!focusId && hydrateFromInitial()) {
      return;
    }

    if (focusId && initialWall?.posts.some((post) => post.id === focusId) && hydrateFromInitial()) {
      return;
    }

    setPage(0);
    setLoaded(false);

    const applyRows = async (rows: ProfilePost[], page = 0, pageCount = 1, total = rows.length) => {
      let next = rows;
      if (focusId && !next.some((post) => post.id === focusId)) {
        const extra = await fetchPostById(focusId);
        if (extra && extra.ownerId === ctx.profileUserId) {
          next = [extra, ...next.filter((post) => post.id !== extra.id)];
        }
      }
      setPosts(next);
      setPage(Math.max(0, page));
      setWallPageCount(Math.max(1, pageCount));
      setWallTotal(Math.max(0, total));
    };

    const loadFromApi = async (withTarget: boolean) => {
      if (!ctx.profileSlug) return false;
      const params = new URLSearchParams({ page: '0' });
      if (withTarget && focusId) params.set('target', activityPostHash(focusId));
      const res = await fetch(
        `/api/profile/${encodeURIComponent(ctx.profileSlug)}/posts?${params.toString()}`,
        { cache: 'no-store' }
      );
      if (!res.ok) return false;
      const data = (await res.json()) as {
        posts?: ProfilePost[];
        page?: number;
        pageCount?: number;
        total?: number;
      };
      await applyRows(
        Array.isArray(data.posts) ? data.posts : [],
        Number(data.page) || 0,
        Number(data.pageCount) || 1,
        Number(data.total) || 0
      );
      return true;
    };

    void (async () => {
      try {
        if (ctx.profileSlug) {
          const ok = (await loadFromApi(Boolean(focusId))) || (focusId ? await loadFromApi(false) : false);
          if (!ok) {
            const rows = await fetchPostsByOwner(ctx.profileUserId, WALL_PAGE_SIZE);
            await applyRows(rows, 0, 1, rows.length);
          }
        } else {
          const rows = await fetchPostsByOwner(ctx.profileUserId, WALL_PAGE_SIZE);
          await applyRows(rows, 0, 1, rows.length);
        }
      } catch {
        try {
          const rows = await fetchPostsByOwner(ctx.profileUserId, WALL_PAGE_SIZE);
          await applyRows(rows, 0, 1, rows.length);
        } catch {
          /* keep empty */
        }
      } finally {
        setLoaded(true);
      }
    })();
  }, [ctx.profileUserId, ctx.profileSlug, playground, initialWall]);

  useEffect(() => {
    if (!loaded) return;
    const target = parseActivityPostHash(window.location.hash);
    if (!target) return;
    const delays = [40, 280, 700, 1400];
    const ids = delays.map((ms) => window.setTimeout(() => scrollActivityPostTarget(target), ms));
    return () => {
      for (const id of ids) window.clearTimeout(id);
    };
  }, [loaded, posts.length, page]);

  // Keep playground posts in sync when the guest sandbox mutates them.
  useEffect(() => {
    if (!playground) return;
    setPosts(playground.posts);
  }, [playground, playground?.posts]);

  const profileLive = Boolean(summary.publicProfile && summary.profileSlug);
  const signedInOwner = Boolean(ctx.isOwner && user);
  const canCompose = Boolean(playground) || Boolean(signedInOwner && profileLive);
  const ownerNeedsLive = Boolean(!playground && signedInOwner && !profileLoading && !profileLive);
  const pollReady = !pollOpen || (Boolean(text.trim()) && pollOptions.every((option) => option.trim()));

  const pageCount = playground
    ? Math.max(1, Math.ceil(posts.length / WALL_PAGE_SIZE) || 1)
    : wallPageCount;
  const safePage = Math.min(Math.max(0, page), pageCount - 1);
  const pagePosts = playground
    ? posts.slice(safePage * WALL_PAGE_SIZE, safePage * WALL_PAGE_SIZE + WALL_PAGE_SIZE)
    : posts;
  const showPager = pageCount > 1;

  useEffect(() => {
    if (page !== safePage) setPage(safePage);
  }, [page, safePage]);

  const scrollWallToTop = () => {
    wallPostsTopRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  useEffect(() => {
    if (!wallScrollAfterPageRef.current) return;
    wallScrollAfterPageRef.current = false;
    const id = window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => scrollWallToTop());
    });
    return () => window.cancelAnimationFrame(id);
  }, [safePage, loaded]);

  const loadWallPage = async (nextPage: number, scrollToTop = false) => {
    if (scrollToTop) wallScrollAfterPageRef.current = true;
    if (playground || !ctx.profileSlug) {
      setPage(nextPage);
      return;
    }
    const next = Math.max(0, Math.min(pageCount - 1, nextPage));
    try {
      const res = await fetch(
        `/api/profile/${encodeURIComponent(ctx.profileSlug)}/posts?page=${next}`,
        { cache: 'no-store' }
      );
      const data = (await res.json()) as {
        posts?: ProfilePost[];
        page?: number;
        pageCount?: number;
        total?: number;
      };
      if (!res.ok) throw new Error('Wall unavailable');
      setPosts(Array.isArray(data.posts) ? data.posts : []);
      setPage(Math.max(0, Number(data.page) || 0));
      setWallPageCount(Math.max(1, Number(data.pageCount) || 1));
      setWallTotal(Math.max(0, Number(data.total) || 0));
    } catch {
      wallScrollAfterPageRef.current = false;
      toast({ variant: 'destructive', title: 'Could not load that wall page' });
    }
  };

  const submit = async () => {
    if (playground) {
      const clean = text.trim();
      const link = firstInlineHref(clean);
      if (!clean && !image) return;
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
      revokePostImagePreview(image);
      setImage(null);
      setPage(0);
      return;
    }
    if (!user) return;
    if (!pollReady || (!text.trim() && !voice && !image && !clip)) return;
    setBusy(true);
    try {
      const post = await createPost({
        text,
        ownerName: user.displayName || 'Artist',
        ownerSlug: ctx.profileSlug,
        ...(voice ? { voice } : {}),
        ...(image ? { image } : {}),
        ...(clip ? { video: clip } : {}),
        ...(pollOpen ? { poll: { options: pollOptions, resultsVisibility: pollVisibility } } : {}),
        ...imprintPayload,
      });
      if (post.quotePress) {
        void queueAutoImprintSyndication({ post });
      }
      setPosts((prev) => [post, ...prev]);
      setWallTotal((value) => value + 1);
      setText('');
      setVoice(null);
      revokePostImagePreview(image);
      setImage(null);
      revokeWallClipPreview(clip);
      setClip(null);
      setPollOpen(false);
      setPollOptions(['', '']);
      setPollVisibility('after_vote');
      resetImprint();
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

  if (!canCompose && !ownerNeedsLive && loaded && posts.length === 0 && !focusPostId) return null;

  return (
    <ModuleShell icon={PenLine} title={"The Wall"} ctx={ctx}>
      {ownerNeedsLive ? (
        <p className={cn(inkWellClass, 'mb-5 p-4 text-sm text-[var(--ph-muted,rgba(255,255,255,0.6))]')}>
          Your Artist Home is offline.{' '}
          <Link
            href={`/#${SCENE_BOOTH_ID}`}
            className="font-semibold text-[var(--ph-accent,#7dd3fc)] hover:underline"
          >
            Turn it live in Your Booth
          </Link>{' '}
          to add a wall post. Existing posts stay visible.
        </p>
      ) : null}
      {canCompose && (
        <div className={cn(inkWellClass, 'relative mb-5 space-y-2 p-4')}>
          <MentionField value={text} onChange={setText} excludeUserId={user?.id}>
            <Textarea
              ref={textRef}
              value={text}
              onChange={(e) => setText(e.target.value)}
              onPaste={(e) => {
                void attachPastedImage(e, {
                  disabled: busy,
                  image,
                  onImageChange: setImage,
                  ...(playground ? {} : { clip, onClipChange: setClip }),
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
                  : 'Drop a thought, a link, a photo, a release…'
              }
              className="border-[var(--ph-border,rgba(255,255,255,0.12))] bg-black/30 text-sm"
            />
          </MentionField>
          <ComposerLinkPreview text={text} />
          {!playground && imprintOn && text.trim() ? (
            <div className="space-y-2">
              <QuotePressCard
                ref={imprintPreviewRef}
                text={text}
                config={activeImprintConfig}
                creatorSlug={ctx.profileSlug}
              />
              <QuotePressComposerPanel
                faders={activeImprintConfig.faders}
                onFadersChange={(next) => {
                  if (!isPro) return;
                  setImprintFaders(next);
                }}
                slots={imprintSlots}
                isPro={isPro}
                busy={busy || slotBusy}
                onLockSlot={() => {
                  if (!isPro) return;
                  const label = quotePressSlotLabel(imprintFaders);
                  void persistImprintSlots([
                    ...imprintSlots,
                    {
                      id: `qp-${Date.now()}`,
                      faders: { ...imprintFaders },
                      lockedAt: new Date().toISOString(),
                      label,
                    },
                  ]);
                }}
                onLoadSlot={(slot) => {
                  if (!isPro) return;
                  setImprintFaders(slot.faders);
                }}
                onClearSlot={(slotId) => {
                  void persistImprintSlots(imprintSlots.filter((s) => s.id !== slotId));
                }}
              />
            </div>
          ) : null}
          {!playground && pollOpen ? (
            <PollComposerFields
              options={pollOptions}
              onOptionsChange={setPollOptions}
              resultsVisibility={pollVisibility}
              onResultsVisibilityChange={setPollVisibility}
              onRemovePoll={() => {
                setPollOpen(false);
                setPollOptions(['', '']);
                setPollVisibility('after_vote');
              }}
              disabled={busy}
            />
          ) : null}
          {playground ? (
            <p className="text-[10px] text-[var(--ph-muted,rgba(255,255,255,0.5))]">
              Demo wall — text, photos, and links stay here until you claim your free profile.
            </p>
          ) : null}
          <div className="flex min-w-0 items-center gap-1 overflow-x-auto">
            {!playground ? (
              <div className={cn('shrink-0', voice && 'min-w-0 max-w-full basis-full sm:basis-auto')}>
                <VoiceNoteComposer clip={voice} onClipChange={setVoice} disabled={busy} compact />
              </div>
            ) : null}
            <div className="shrink-0">
              <ImageAttachComposer
                image={image}
                onImageChange={setImage}
                clip={playground ? null : clip}
                onClipChange={playground ? undefined : setClip}
                disabled={busy}
                compact
                maxBytes={playground ? POST_IMAGE_GUEST_MAX_BYTES : undefined}
                onError={(message) =>
                  toast({
                    variant: 'destructive',
                    title: 'Could not attach photo',
                    description: message,
                  })
                }
              />
            </div>
            <EmojiPickerButton compact disabled={busy} onInsert={insertEmoji} />
            {!playground ? (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className={cn('h-8 gap-1 px-2 text-[10px] font-bold uppercase tracking-wider', pollOpen && 'text-cyan-300')}
                onClick={() => setPollOpen((value) => !value)}
                disabled={busy}
              >
                <BarChart3 className="h-3.5 w-3.5" /> Poll
              </Button>
            ) : null}
            {!playground ? (
              <button
                type="button"
                onClick={toggleImprint}
                disabled={busy}
                className={cn(
                  'inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-md border px-1.5 py-1 font-code text-[9px] font-bold uppercase tracking-wider transition-all',
                  imprintOn
                    ? 'border-cyan-400/55 bg-cyan-500/20 text-cyan-100 shadow-[0_0_14px_rgba(34,211,238,0.28)]'
                    : 'border-transparent text-muted-foreground/70 hover:border-cyan-500/35 hover:bg-cyan-500/10 hover:text-cyan-300'
                )}
              >
                <Sparkles className={cn('h-3.5 w-3.5', imprintOn ? 'text-cyan-200' : 'text-cyan-400/80')} />
                Imprint
              </button>
            ) : null}
          </div>
          <div className="flex justify-end">
            <Button
              size="sm"
              className="h-9 gap-1.5 font-bold uppercase"
              disabled={busy || !pollReady || (!text.trim() && !voice && !image && !clip)}
              onClick={() => void submit()}
            >
              <Send className="h-3.5 w-3.5" /> Post
            </Button>
          </div>
        </div>
      )}

      <div ref={wallPostsTopRef} className="scroll-mt-20">
        {showPager ? (
          <WallPager
            edge="top"
            safePage={safePage}
            pageCount={pageCount}
            postTotal={playground ? posts.length : wallTotal}
            onPrev={() => void loadWallPage(Math.max(0, safePage - 1))}
            onNext={() => void loadWallPage(Math.min(pageCount - 1, safePage + 1))}
          />
        ) : null}

        <div className="space-y-4">
        {!loaded ? (
          <p className="py-6 text-center text-sm text-[var(--ph-muted,rgba(255,255,255,0.55))]">Loading the wall…</p>
        ) : null}
        {loaded && focusPostId && !posts.some((post) => post.id === focusPostId) ? (
          <p className="py-2 text-center text-sm text-[var(--ph-muted,rgba(255,255,255,0.55))]">
            That original post is no longer on this wall.
          </p>
        ) : null}
        {pagePosts.map((post) => (
          <div key={post.id} className="relative">
            <PostCard
              post={post}
              showAuthor
              viewerSlug={ctx.viewerSlug}
              activityFromPath={ctx.activityFromPath}
              onDeleted={
                playground
                  ? undefined
                  : (id) => {
                      setPosts((prev) => prev.filter((p) => p.id !== id));
                      setWallTotal((value) => Math.max(0, value - 1));
                    }
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
      </div>

      {showPager ? (
        <WallPager
          edge="bottom"
          safePage={safePage}
          pageCount={pageCount}
          postTotal={playground ? posts.length : wallTotal}
          onPrev={() => void loadWallPage(Math.max(0, safePage - 1), true)}
          onNext={() => void loadWallPage(Math.min(pageCount - 1, safePage + 1), true)}
        />
      ) : null}
    </ModuleShell>
  );
}

// ---------------------------------------------------------------------------
// Friends
// ---------------------------------------------------------------------------

const FRIENDS_PAGE_SIZE = 20;

export function FriendsModule({ ctx }: { ctx: ModuleContext }) {
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
      let cancelled = false;
      setPage(0);
      setLoaded(false);
      void (async () => {
        try {
          const resolved = await resolvePlaygroundFriends(playground);
          if (!cancelled) setFriends(resolved);
        } catch (err) {
          console.warn('[friends-module] playground enrich failed', err);
          if (!cancelled) {
            setFriends(
              playground.map((f) => ({
                userId: f.userId,
                name: f.name,
                slug: f.slug,
                isLivePublic: Boolean(f.slug),
              }))
            );
          }
        } finally {
          if (!cancelled) setLoaded(true);
        }
      })();
      return () => {
        cancelled = true;
      };
    }
    setPage(0);
    let cancelled = false;
    void (async () => {
      try {
        const params = new URLSearchParams({
          of: ctx.profileUserId,
          status: 'accepted',
          publicCards: '1',
          limit: '40',
        });
        const res = await fetch(`/api/friends?${params.toString()}`, { cache: 'no-store' });
        if (!res.ok) throw new Error('Friends unavailable');
        const data = (await res.json()) as { cards?: CircleFriendRow[] };
        const resolved = Array.isArray(data.cards) ? data.cards : [];
        // Artist Home lists: live-public friends only — never show private/offline here.
        if (cancelled) return;
        setFriends(resolved);
      } catch (err) {
        console.warn('[friends-module]', err);
      } finally {
        if (!cancelled) setLoaded(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [ctx.profileUserId, playground]);

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
          const chrome = parseStudioBadge(friend.studioBadge) || 'free';
          const chip = (
            <span className="inline-flex items-center gap-2 rounded-full border border-[var(--ph-border,rgba(255,255,255,0.12))] bg-black/30 py-1 pl-1 pr-3 text-xs font-bold transition-colors hover:border-[var(--ph-accent,#7dd3fc)] hover:text-[var(--ph-accent,#7dd3fc)]">
              <ArtistStarAvatar
                name={friend.name}
                avatarUrl={friend.avatarUrl}
                useStarMark={friend.starMarkUseStar}
                starMarkSeed={friend.starMarkSeed}
                studioChrome={chrome}
                size={22}
                hideInitials
              />
              <span className={studioNameClass(chrome)}>{friend.name}</span>
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
  const { summary, loading: profileLoading } = useGamification();
  const { toast } = useToast();
  const playground = ctx.playgroundGuestbook;
  const [entries, setEntries] = useState<GuestbookEntry[]>(playground || []);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const raw = playground ?? (await fetchGuestbook(ctx.profileUserId));
        const enriched = await enrichGuestbookEntries(raw);
        if (!cancelled) setEntries(enriched);
      } catch {
        if (!cancelled && playground) setEntries(playground);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [ctx.profileUserId, playground]);

  const profileLive = Boolean(summary.publicProfile && summary.profileSlug);
  const canSignIdentity = !playground && Boolean(user && user.id !== ctx.profileUserId);
  const canSign = canSignIdentity && !profileLoading && profileLive;
  const isAdmin = Boolean(
    user && (user.role === 'admin' || isMasterAdminEmail(user.email))
  );
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
      {canSignIdentity && !profileLoading && !profileLive ? (
        <p className="mb-4 text-xs text-[var(--ph-muted,rgba(255,255,255,0.55))]">
          Your Artist Home is offline.{' '}
          <Link
            href={`/#${SCENE_BOOTH_ID}`}
            className="font-semibold text-[var(--ph-accent,#7dd3fc)] hover:underline"
          >
            Turn it live in Your Booth
          </Link>{' '}
          to leave a new line. Existing entries stay visible.
        </p>
      ) : null}
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
        {entries.slice(0, 20).map((entry) => {
          const chrome = parseStudioBadge(entry.studioBadge) || 'free';
          const authorHref = entry.authorSlug ? profileHref(entry.authorSlug) || undefined : undefined;
          return (
          <div key={entry.id} className="flex items-start gap-2.5 text-sm">
            <ArtistStarAvatar
              name={entry.authorName}
              avatarUrl={entry.avatarUrl}
              useStarMark={entry.starMarkUseStar}
              starMarkSeed={entry.starMarkSeed}
              href={authorHref}
              studioChrome={chrome}
              size={22}
              hideInitials
              className="mt-0.5 shrink-0"
            />
            <div className="min-w-0 flex-1">
              <ArtistHomeLink
                userId={entry.authorId}
                slug={entry.authorSlug}
                className={cn(
                  'mr-2 text-[11px] font-bold uppercase tracking-wider hover:underline',
                  studioNameClass(chrome)
                )}
              >
                {entry.authorName}
              </ArtistHomeLink>
              <span className="italic text-[var(--ph-text,#fff)]/85">&ldquo;{entry.text}&rdquo;</span>
            </div>
            {!playground && user?.id && (user.id === entry.authorId || ctx.isOwner || isAdmin) && (
              <button
                type="button"
                className="text-[var(--ph-muted,rgba(255,255,255,0.4))] hover:text-red-400"
                onClick={() => {
                  void deleteGuestbookEntry(ctx.profileUserId, entry.id)
                    .then(() => setEntries((prev) => prev.filter((e) => e.id !== entry.id)))
                    .catch(() => toast({ variant: 'destructive', title: 'Could not remove' }));
                }}
                aria-label={
                  isAdmin && user.id !== entry.authorId && !ctx.isOwner
                    ? 'Admin: delete guestbook entry'
                    : 'Delete guestbook entry'
                }
                title={
                  isAdmin && user.id !== entry.authorId && !ctx.isOwner
                    ? 'Admin: delete guestbook entry'
                    : 'Delete guestbook entry'
                }
              >
                <Trash2 className="h-3 w-3" />
              </button>
            )}
          </div>
          );
        })}
        {entries.length === 0 && (
          <p className="py-4 text-center text-sm text-[var(--ph-muted,rgba(255,255,255,0.55))]">
            The book is open — first line is free.
          </p>
        )}
      </div>
    </ModuleShell>
  );
}
