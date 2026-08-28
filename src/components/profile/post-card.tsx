'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Eye, Heart, MessageCircle, Repeat2, Share2, Trash2, Users } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { cn } from '@/lib/utils';
import { ArtistStarAvatar } from '@/components/profile/artist-star-avatar';
import { ArtistHomeLink, useLiveArtistHomeSlug } from '@/components/profile/artist-home-link';
import { EmbedPlayer } from '@/components/profile/embed-player';
import { PostShareDialog } from '@/components/profile/post-share-dialog';
import { ExpandableImage } from '@/components/profile/expandable-image';
import { PostCommentThread } from '@/components/profile/post-comment-thread';
import { VoiceNotePlayer } from '@/components/profile/voice-note-player';
import {
  deletePost,
  fetchComments,
  fetchCommentCount,
  fetchHasLiked,
  fetchHasReverbed,
  fetchViewerReverbPost,
  fetchLikeCount,
  fetchPublicArtistAvatarMeta,
  likePost,
  toggleReverb,
  unlikePost,
  type PostComment,
  type ProfilePost,
} from '@/lib/profile/social-client';
import { Hint } from '@/components/ui/tooltip';
import { parseStudioBadge, studioChromeFromUser, studioNameClass, type StudioNameChrome } from '@/lib/studio-tier-chrome';
import {
  parseActivityPostHash,
  scrollActivityPostTarget,
} from '@/lib/activity/post-deep-link';
import { compactReachCount, recordPostViewClient } from '@/lib/post-view-client';
import { LyricClipCard } from '@/components/profile/lyric-clip-card';
import { isMasterAdminEmail } from '@/lib/master-admin';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { MentionSuggestions } from '@/components/profile/mention-suggestions';
import { MentionText } from '@/components/profile/mention-text';
import { PostPollCard } from '@/components/profile/post-poll';

type PostCardProps = {
  post: ProfilePost;
  /** Show the author name/avatar header (feed, wall, and reverbs). */
  showAuthor?: boolean;
  viewerSlug?: string;
  onDeleted?: (postId: string) => void;
  onReverbed?: (post: ProfilePost) => void;
  immersive?: boolean;
};

function timeAgo(iso: string): string {
  try {
    return formatDistanceToNow(new Date(iso), { addSuffix: true });
  } catch {
    return '';
  }
}

function firstDropUrlFromText(text?: string): string | undefined {
  if (!text) return undefined;
  return text.match(/https?:\/\/[^\s]+\/(?:song|share)\/[^\s?#]+|\/(?:song|share)\/[^\s?#]+/i)?.[0];
}

/** Goal foil posts predate typed media, so recognize their stable generated caption. */
function isStudioGoalShare(text?: string): boolean {
  return Boolean(text && /\b(?:weekly|monthly|lifetime)\s+goal complete:/i.test(text));
}

function ReverbSourceBody({ post, immersive = false }: { post: ProfilePost; immersive?: boolean }) {
  const name = post.reverbOwnerName || 'Artist';
  const { liveSlug, href, resolved, isLive } = useLiveArtistHomeSlug(
    post.reverbOwnerId,
    post.reverbOwnerSlug
  );
  const [avatarUrl, setAvatarUrl] = useState<string | undefined>(undefined);
  const [starSeed, setStarSeed] = useState<number | undefined>(undefined);
  const [useStar, setUseStar] = useState(false);
  const [studioChrome, setStudioChrome] = useState<StudioNameChrome | undefined>(undefined);

  useEffect(() => {
    if (!liveSlug) {
      setAvatarUrl(undefined);
      setStarSeed(undefined);
      setUseStar(false);
      setStudioChrome(undefined);
      return;
    }
    let cancelled = false;
    void fetchPublicArtistAvatarMeta(liveSlug).then((meta) => {
      if (cancelled || !meta) return;
      setAvatarUrl(meta.avatarUrl);
      setUseStar(Boolean(meta.starMarkUseStar));
      setStarSeed(meta.starMarkSeed);
      setStudioChrome(parseStudioBadge(meta.studioBadge));
    });
    return () => {
      cancelled = true;
    };
  }, [liveSlug]);

  const originalPostHref = post.reverbPostId ? `/p/${post.reverbPostId}` : undefined;

  return (
    <div className="mt-2 rounded-xl border border-[var(--ph-border,rgba(255,255,255,0.14))] bg-black/30 p-3">
      <div className="mb-1.5 flex items-center gap-2">
        {resolved && !isLive && (post.reverbOwnerId || post.reverbOwnerSlug) ? (
          <Hint content="Artist Home offline" side="top">
            <span className="inline-flex cursor-default">
              <ArtistStarAvatar
                name={name}
                avatarUrl={avatarUrl}
                useStarMark={useStar}
                starMarkSeed={starSeed}
                size={42}
                toneClass="bg-sky-500/30 text-sky-300"
                studioChrome={studioChrome}
              />
            </span>
          </Hint>
        ) : (
          <ArtistStarAvatar
            name={name}
            avatarUrl={avatarUrl}
            useStarMark={useStar}
            starMarkSeed={starSeed}
            href={href}
            size={42}
            toneClass="bg-sky-500/30 text-sky-300"
            studioChrome={studioChrome}
          />
        )}
        <p className="min-w-0 text-[10px] font-bold uppercase tracking-widest text-[var(--ph-muted,rgba(255,255,255,0.55))]">
          {originalPostHref ? (
            <Link
              href={originalPostHref}
              className="text-[var(--ph-muted,rgba(255,255,255,0.55))] transition-colors hover:text-[var(--ph-text,#fff)] hover:underline"
            >
              Original
            </Link>
          ) : (
            'Original'
          )}
          {' · '}
          <ArtistHomeLink
            userId={post.reverbOwnerId}
            slug={post.reverbOwnerSlug}
            className={cn(
              'hover:underline',
              studioNameClass(studioChrome)
            )}
          >
            {name}
          </ArtistHomeLink>
        </p>
      </div>
      {post.reverbLyricClip ? (
        <div className="mt-2">
          <LyricClipCard clip={post.reverbLyricClip} />
        </div>
      ) : post.reverbText ? (
        <p className="whitespace-pre-wrap text-sm leading-relaxed text-[var(--ph-text,#fff)]/90">
          {post.reverbText}
        </p>
      ) : null}
      {post.reverbImageUrl && !post.reverbLyricClip ? (
        <div className="mt-2 flex justify-center">
          <ExpandableImage
            src={post.reverbImageUrl}
            alt="Reverbed photo"
            thumbClassName={cn(
              'block h-auto rounded-lg object-contain',
              isStudioGoalShare(post.reverbText)
                ? immersive
                  ? 'w-full max-w-[28rem] max-h-[min(36dvh,21rem)]'
                  : 'w-full max-w-[30rem] max-h-[24rem]'
                : cn(
                    'w-auto max-w-full',
                    immersive ? 'max-h-[min(38dvh,25rem)]' : 'max-h-[min(65dvh,42rem)]'
                  )
            )}
          />
        </div>
      ) : null}
      {post.reverbEmbedUrl || firstDropUrlFromText(post.reverbText) ? (
        <div className="mt-2">
          <EmbedPlayer url={post.reverbEmbedUrl || firstDropUrlFromText(post.reverbText)!} referralPostId={post.id} viewportBounded={immersive} />
        </div>
      ) : null}
      {post.reverbVoice ? (
        <div className="mt-2">
          <VoiceNotePlayer
            src={post.reverbVoice.url}
            storagePath={post.reverbVoice.storagePath}
            contentType={post.reverbVoice.contentType}
            transcript={post.reverbVoice.transcript}
            durationSec={post.reverbVoice.durationSec}
            compact
          />
        </div>
      ) : null}
      {post.reverbPoll && post.reverbPostId ? (
        <PostPollCard postId={post.reverbPostId} poll={post.reverbPoll} />
      ) : null}
      {!post.reverbText &&
      !post.reverbImageUrl &&
      !post.reverbEmbedUrl &&
      !post.reverbVoice &&
      !post.reverbLyricClip &&
      !post.reverbPoll ? (
        <p className="text-xs italic text-[var(--ph-muted,rgba(255,255,255,0.5))]">Original post</p>
      ) : null}
    </div>
  );
}

export function PostCard({ post, showAuthor = false, viewerSlug, onDeleted, onReverbed, immersive = false }: PostCardProps) {
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const articleRef = useRef<HTMLElement>(null);
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [commentCount, setCommentCount] = useState(0);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [comments, setComments] = useState<PostComment[]>([]);
  const [commentsLoaded, setCommentsLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [deleted, setDeleted] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [reverbed, setReverbed] = useState(false);
  const [reverbComposerOpen, setReverbComposerOpen] = useState(false);
  const [reverbQuote, setReverbQuote] = useState('');
  const [viewerReverbQuote, setViewerReverbQuote] = useState('');
  const [loveBurst, setLoveBurst] = useState(false);
  const tapRef = useRef({ lastAt: 0, downX: 0, downY: 0 });
  const loveBusyRef = useRef(false);
  const [authorAvatarUrl, setAuthorAvatarUrl] = useState<string | undefined>(undefined);
  const [authorStarSeed, setAuthorStarSeed] = useState<number | undefined>(undefined);
  const [authorUseStar, setAuthorUseStar] = useState(false);
  const [authorStudioChrome, setAuthorStudioChrome] = useState<StudioNameChrome | undefined>(undefined);
  const {
    liveSlug: liveAuthorSlug,
    href: authorHref,
    resolved: authorResolved,
    isLive: authorIsLive,
  } = useLiveArtistHomeSlug(showAuthor ? post.ownerId : undefined, showAuthor ? post.ownerSlug : undefined);

  const isOwner = Boolean(user?.id && user.id === post.ownerId);
  const isAdmin = Boolean(
    user && (user.role === 'admin' || isMasterAdminEmail(user.email))
  );
  const canDeletePost = isOwner || isAdmin;
  const authorChrome =
    authorStudioChrome || (isOwner ? studioChromeFromUser(user) : undefined);
  const rootIdForReverb =
    post.isReverb && post.reverbPostId ? post.reverbPostId : post.id;
  const canReverb = Boolean(user && !isOwner && rootIdForReverb);

  useEffect(() => {
    void fetchLikeCount(post.id).then(setLikeCount).catch(() => undefined);
    void fetchCommentCount(post.id).then(setCommentCount).catch(() => undefined);
    void fetchHasLiked(post.id).then(setLiked).catch(() => undefined);
  }, [post.id]);

  useEffect(() => {
    const applyHash = () => {
      const target = parseActivityPostHash(window.location.hash);
      if (!target || target.postId !== post.id) return;
      const reveal = async () => {
        if (target.openComments) {
          setCommentsOpen(true);
          if (!commentsLoaded) {
            try {
              setComments(await fetchComments(post.id));
            } catch {
              /* ignore */
            }
            setCommentsLoaded(true);
          }
        }
        window.setTimeout(() => scrollActivityPostTarget(target), 60);
        window.setTimeout(() => scrollActivityPostTarget(target), 420);
      };
      void reveal();
    };
    applyHash();
    window.addEventListener('hashchange', applyHash);
    return () => window.removeEventListener('hashchange', applyHash);
  }, [post.id, commentsLoaded]);

  useEffect(() => {
    if (!canReverb) {
      setReverbed(false);
      return;
    }
    void Promise.all([
      fetchHasReverbed(rootIdForReverb),
      fetchViewerReverbPost(rootIdForReverb),
    ]).then(([has, reverbPost]) => {
      setReverbed(has);
      setViewerReverbQuote(reverbPost?.text || '');
    }).catch(() => undefined);
  }, [canReverb, rootIdForReverb]);

  useEffect(() => {
    if (authLoading) return;
    if (user?.id && user.id === post.ownerId) return;
    const el = articleRef.current;
    if (!el) return;
    let hold: number | undefined;
    let sent = false;
    const io = new IntersectionObserver(
      (entries) => {
        const hit = entries.some((e) => e.isIntersecting && e.intersectionRatio >= 0.4);
        if (hit && !sent) {
          hold = window.setTimeout(() => {
            if (sent) return;
            sent = true;
            recordPostViewClient(post.id);
          }, 700);
        } else if (hold) {
          window.clearTimeout(hold);
          hold = undefined;
        }
      },
      { threshold: [0.4] }
    );
    io.observe(el);
    return () => {
      io.disconnect();
      if (hold) window.clearTimeout(hold);
    };
  }, [authLoading, post.id, post.ownerId, user?.id]);

  useEffect(() => {
    if (!showAuthor) {
      setAuthorAvatarUrl(undefined);
      setAuthorStarSeed(undefined);
      setAuthorUseStar(false);
      setAuthorStudioChrome(undefined);
      return;
    }
    if (post.ownerStarMarkUseStar === true || post.ownerStarMarkUseStar === false) {
      setAuthorAvatarUrl(post.ownerAvatarUrl);
      setAuthorUseStar(post.ownerStarMarkUseStar === true);
      setAuthorStarSeed(post.ownerStarMarkSeed);
      setAuthorStudioChrome(parseStudioBadge(post.ownerStudioBadge));
      return;
    }
    if (!liveAuthorSlug) {
      setAuthorAvatarUrl(undefined);
      setAuthorStarSeed(undefined);
      setAuthorUseStar(false);
      setAuthorStudioChrome(undefined);
      return;
    }
    let cancelled = false;
    void fetchPublicArtistAvatarMeta(liveAuthorSlug).then((meta) => {
      if (cancelled || !meta) return;
      setAuthorAvatarUrl(meta.avatarUrl);
      setAuthorUseStar(Boolean(meta.starMarkUseStar));
      setAuthorStarSeed(meta.starMarkSeed);
      setAuthorStudioChrome(parseStudioBadge(meta.studioBadge));
    });
    return () => {
      cancelled = true;
    };
  }, [showAuthor, liveAuthorSlug, post.ownerAvatarUrl, post.ownerStarMarkUseStar, post.ownerStarMarkSeed, post.ownerStudioBadge]);

  const toggleLike = async (showBurst = false) => {
    if (loveBusyRef.current) return;
    if (!user) {
      toast({ title: 'Sign in to show love' });
      return;
    }
    const next = !liked;
    loveBusyRef.current = true;
    setLiked(next);
    setLikeCount((c) => Math.max(0, c + (next ? 1 : -1)));
    if (next && showBurst) {
      setLoveBurst(true);
      window.setTimeout(() => setLoveBurst(false), 650);
    }
    try {
      if (next) {
        await likePost(post.id, {
          name: user.displayName || 'Artist',
          slug: viewerSlug,
        });
      } else await unlikePost(post.id);
    } catch {
      setLiked(!next);
      setLikeCount((c) => Math.max(0, c + (next ? -1 : 1)));
    } finally {
      loveBusyRef.current = false;
    }
  };

  const handleReverb = async (quote?: string) => {
    if (!user) {
      toast({ title: 'Sign in to Reverb' });
      return;
    }
    setBusy(true);
    try {
      const result = await toggleReverb(post, {
        name: user.displayName || 'Artist',
        slug: viewerSlug,
      }, quote?.trim() ? { quote } : undefined);
      setReverbed(result.status !== 'removed');
      setViewerReverbQuote(result.status === 'removed' ? '' : quote?.trim() || viewerReverbQuote);
      setReverbComposerOpen(false);
      setReverbQuote('');
      toast({
        title: result.status === 'created'
          ? quote?.trim() ? 'Quote Reverb live' : 'Reverb live'
          : result.status === 'updated' ? 'Quote Reverb updated' : 'Reverb removed',
        description:
          result.status === 'created' || result.status === 'updated'
            ? 'This post now echoes on your wall and Reverbs page.'
            : 'Taken off your Reverbs.',
      });
      if (result.status === 'created' && result.post) onReverbed?.(result.post);
    } catch (e) {
      toast({
        variant: 'destructive',
        title: 'Could not Reverb',
        description: e instanceof Error ? e.message : undefined,
      });
    } finally {
      setBusy(false);
    }
  };

  const openComments = async () => {
    setCommentsOpen((open) => !open);
    if (!commentsLoaded) {
      try {
        setComments(await fetchComments(post.id));
      } catch {
        /* ignore */
      }
      setCommentsLoaded(true);
    }
  };

  const handleDeletePost = async () => {
    setBusy(true);
    try {
      await deletePost(post.id);
      setDeleted(true);
      onDeleted?.(post.id);
    } catch {
      toast({ variant: 'destructive', title: 'Could not delete post' });
      setBusy(false);
    }
  };

  if (deleted) return null;

  return (
    <article
      ref={articleRef}
      id={`post-${post.id}`}
      className="relative touch-pan-y scroll-mt-28 border border-dashed border-[var(--ph-border)] bg-black/20 p-4 transition-shadow data-[activity-focus]:ring-2 data-[activity-focus]:ring-fuchsia-400/80"
      onPointerDown={immersive ? (event) => {
        tapRef.current.downX = event.clientX;
        tapRef.current.downY = event.clientY;
      } : undefined}
      onPointerUp={immersive ? (event) => {
        const target = event.target as HTMLElement;
        if (target.closest('button,a,input,textarea,select,audio,video,[role="button"],[data-no-double-love]')) return;
        if (Math.hypot(event.clientX - tapRef.current.downX, event.clientY - tapRef.current.downY) > 12) {
          tapRef.current.lastAt = 0;
          return;
        }
        const now = Date.now();
        if (now - tapRef.current.lastAt < 330) {
          tapRef.current.lastAt = 0;
          void toggleLike(true);
        } else tapRef.current.lastAt = now;
      } : undefined}
    >
      {loveBurst ? <Heart className="pointer-events-none absolute left-1/2 top-1/2 z-50 h-20 w-20 -translate-x-1/2 -translate-y-1/2 animate-in zoom-in fill-fuchsia-400 text-fuchsia-400 drop-shadow-[0_0_24px_rgba(244,114,182,.9)]" /> : null}
      {post.isReverb && (
        <p className="mb-2 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.22em] text-violet-300/90">
          <Repeat2 className="h-3 w-3" /> Reverb
        </p>
      )}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          {showAuthor && (
            <span className="flex min-w-0 items-center gap-2.5">
              {authorResolved && !authorIsLive ? (
                <Hint content="Artist Home offline" side="top">
                  <span className="inline-flex cursor-default">
                    <ArtistStarAvatar
                      name={post.ownerName}
                      avatarUrl={authorAvatarUrl}
                      useStarMark={authorUseStar}
                      starMarkSeed={authorStarSeed}
                      size={56}
                      toneClass="bg-sky-500/30 text-sky-300"
                      studioChrome={authorChrome}
                    />
                  </span>
                </Hint>
              ) : (
                <ArtistStarAvatar
                  name={post.ownerName}
                  avatarUrl={authorAvatarUrl}
                  useStarMark={authorUseStar}
                  starMarkSeed={authorStarSeed}
                  href={authorHref}
                  size={56}
                  toneClass="bg-sky-500/30 text-sky-300"
                  studioChrome={authorChrome}
                />
              )}
              <ArtistHomeLink
                userId={post.ownerId}
                slug={post.ownerSlug}
                className={cn(
                  'text-xs font-bold uppercase tracking-widest hover:underline',
                  authorChrome ? studioNameClass(authorChrome) : studioNameClass('free')
                )}
              >
                {post.ownerName}
              </ArtistHomeLink>
            </span>
          )}
          <Link
            href={`/p/${post.id}`}
            className="mt-1 inline-flex whitespace-nowrap text-[10px] uppercase tracking-widest text-[var(--ph-muted,rgba(255,255,255,0.55))] hover:text-[var(--ph-text,#fff)] hover:underline"
            aria-label="Open public post permalink"
          >
            {timeAgo(post.createdAt)}
          </Link>
        </div>
        {canDeletePost && (
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7 text-[var(--ph-muted,rgba(255,255,255,0.55))] hover:text-red-400"
            disabled={busy}
            onClick={() => void handleDeletePost()}
            aria-label={isAdmin && !isOwner ? 'Admin: delete post' : 'Delete post'}
            title={isAdmin && !isOwner ? 'Admin: delete post' : 'Delete post'}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>

      {post.lyricClip ? (
        <div className="mt-3">
          <LyricClipCard clip={post.lyricClip} />
        </div>
      ) : post.text ? (
        <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-[var(--ph-text,#fff)]">
          <MentionText text={post.text} />
        </p>
      ) : null}

      {!post.isReverb && post.poll ? <PostPollCard postId={post.id} poll={post.poll} /> : null}

      {post.voice ? (
        <div className="mt-3">
          <VoiceNotePlayer
            src={post.voice.url}
            storagePath={post.voice.storagePath}
            contentType={post.voice.contentType}
            transcript={post.voice.transcript}
            durationSec={post.voice.durationSec}
          />
        </div>
      ) : null}

      {post.isReverb ? <ReverbSourceBody post={post} immersive={immersive} /> : null}

      {!post.isReverb && post.imageUrl && (
        <div className="mt-3 mb-1 flex justify-center overflow-visible">
          <ExpandableImage
            src={post.imageUrl}
            alt="Posted photo"
            thumbClassName={cn(
              'block h-auto rounded-xl object-contain shadow-[0_8px_28px_rgba(0,0,0,0.45)]',
              isStudioGoalShare(post.text)
                ? immersive
                  ? 'w-full max-w-[28rem] max-h-[min(36dvh,21rem)]'
                  : 'w-full max-w-[30rem] max-h-[24rem]'
                : cn(
                    'w-auto max-w-full',
                    immersive ? 'max-h-[min(42dvh,28rem)]' : 'max-h-[min(68dvh,46rem)]'
                  )
            )}
          />
        </div>
      )}

      {!post.isReverb && (post.embedUrl || firstDropUrlFromText(post.text)) && (
        <div className="mt-3">
          <EmbedPlayer url={post.embedUrl || firstDropUrlFromText(post.text)!} referralPostId={post.id} viewportBounded={immersive} />
        </div>
      )}

      <div className="mt-3 flex items-center gap-2">
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-4">
        <button
          type="button"
          onClick={() => void toggleLike()}
          className={cn(
            'flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest transition-colors',
            liked
              ? 'text-accent'
              : 'text-[var(--ph-muted,rgba(255,255,255,0.55))] hover:text-[var(--ph-text,#fff)]'
          )}
        >
          <Heart className={cn('h-3.5 w-3.5', liked && 'fill-current')} />
          {likeCount > 0 ? likeCount : 'Love'}
        </button>
        <button
          type="button"
          onClick={() => void openComments()}
          className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-[var(--ph-muted,rgba(255,255,255,0.55))] transition-colors hover:text-[var(--ph-text,#fff)]"
        >
          <MessageCircle className="h-3.5 w-3.5" />
          {commentCount > 0 ? commentCount : 'Reply'}
        </button>
        {canReverb && (
          <DropdownMenu>
          <DropdownMenuTrigger asChild>
          <button
            type="button"
            disabled={busy}
            className={cn(
              'flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest transition-colors',
              reverbed
                ? 'text-violet-300'
                : 'text-[var(--ph-muted,rgba(255,255,255,0.55))] hover:text-violet-300'
            )}
            title="Reverb — pass this post onto your wall (like a repost)"
          >
            <Repeat2 className={cn('h-3.5 w-3.5', reverbed && 'stroke-[2.5]')} />
            {reverbed ? 'Reverbed' : 'Reverb'}
          </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="min-w-44 border-violet-400/25">
            <DropdownMenuItem onSelect={() => void handleReverb()}>{reverbed ? 'Undo Reverb' : 'Reverb'}</DropdownMenuItem>
            <DropdownMenuItem onSelect={() => { setReverbQuote(viewerReverbQuote); setReverbComposerOpen(true); }}>{viewerReverbQuote ? 'Edit Quote' : 'Quote'}</DropdownMenuItem>
          </DropdownMenuContent>
          </DropdownMenu>
        )}
        <button
          type="button"
          onClick={() => setShareOpen(true)}
          className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-[var(--ph-muted,rgba(255,255,255,0.55))] transition-colors hover:text-[var(--ph-text,#fff)]"
        >
          <Share2 className="h-3.5 w-3.5" />
          Share
        </button>
        </div>
        {isOwner ? (
          <Hint
            content={
              <p className="text-[10px] font-bold leading-snug">
                {post.viewCount || 0} {post.viewCount === 1 ? 'person saw' : 'people saw'} this
                {likeCount + commentCount > 0
                  ? ` · ${likeCount} love${likeCount === 1 ? '' : 's'} · ${commentCount} ${commentCount === 1 ? 'reply' : 'replies'}`
                  : ''}
                . Only you see this.
              </p>
            }
            side="top"
          >
            <span className="ml-auto inline-flex shrink-0 items-center gap-2 font-code text-[10px] font-bold uppercase tracking-widest text-[var(--ph-muted,rgba(255,255,255,0.42))]">
              <span className="inline-flex items-center gap-1">
                <Eye className="h-3 w-3" />
                {compactReachCount(post.viewCount || 0)}
              </span>
              {likeCount + commentCount > 0 ? (
                <span className="inline-flex items-center gap-1">
                  <Users className="h-3 w-3" />
                  {compactReachCount(likeCount + commentCount)}
                </span>
              ) : null}
            </span>
          </Hint>
        ) : null}
      </div>

      <PostShareDialog open={shareOpen} onOpenChange={setShareOpen} post={post} />

      <Dialog
        open={reverbComposerOpen}
        onOpenChange={(open) => {
          if (busy) return;
          setReverbComposerOpen(open);
          if (!open) setReverbQuote('');
        }}
      >
        <DialogContent className="border-violet-400/25 sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-headline text-xl uppercase">
              <Repeat2 className="h-5 w-5 text-violet-300" /> {viewerReverbQuote ? 'Edit Quote Reverb' : 'Reverb this post'}
            </DialogTitle>
            <DialogDescription>
              Add your own thought above the original, then pass both to your wall.
            </DialogDescription>
          </DialogHeader>
          <div className="relative space-y-3">
            <Textarea
              value={reverbQuote}
              onChange={(event) => setReverbQuote(event.target.value.slice(0, 1000))}
              placeholder="Add your quote…"
              rows={4}
              maxLength={1000}
              className="resize-none border-violet-400/20 bg-black/30"
              autoFocus
            />
            <MentionSuggestions value={reverbQuote} onChange={setReverbQuote} excludeUserId={user?.id} />
            <div className="rounded-lg border border-white/10 bg-black/25 px-3 py-2.5">
              <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">
                Original · {post.isReverb ? post.reverbOwnerName || 'Artist' : post.ownerName}
              </p>
              <p className="mt-1 line-clamp-3 whitespace-pre-wrap text-xs text-foreground/80">
                {(post.isReverb ? post.reverbText : post.text) || 'Media post'}
              </p>
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={busy}
              onClick={() => setReverbComposerOpen(false)}
              className="font-bold uppercase"
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={busy || !reverbQuote.trim()}
              onClick={() => void handleReverb(reverbQuote)}
              className="gap-1.5 bg-violet-500 font-bold uppercase text-white hover:bg-violet-400"
            >
              <MessageCircle className="h-3.5 w-3.5" /> {viewerReverbQuote ? 'Save Quote' : 'Quote + Reverb'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {commentsOpen && (
        <PostCommentThread
          postId={post.id}
          comments={comments}
          commentsLoaded={commentsLoaded}
          commentCount={commentCount}
          onCommentsChange={setComments}
          onCommentCountChange={setCommentCount}
          user={user}
          viewerSlug={viewerSlug}
          isOwner={isOwner}
        />
      )}
    </article>
  );
}
