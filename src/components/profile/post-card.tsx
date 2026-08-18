'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Eye, Heart, MessageCircle, Repeat2, Send, Share2, Trash2, Users } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { cn } from '@/lib/utils';
import { ArtistStarAvatar } from '@/components/profile/artist-star-avatar';
import { ArtistHomeLink, useLiveArtistHomeSlug } from '@/components/profile/artist-home-link';
import { EmbedPlayer } from '@/components/profile/embed-player';
import { PostShareDialog } from '@/components/profile/post-share-dialog';
import { VoiceNoteComposer } from '@/components/profile/voice-note-composer';
import { VoiceNotePlayer } from '@/components/profile/voice-note-player';
import {
  addComment,
  deleteComment,
  deletePost,
  fetchComments,
  fetchCommentCount,
  fetchHasLiked,
  fetchHasReverbed,
  fetchLikeCount,
  fetchPublicArtistAvatarMeta,
  likePost,
  toggleReverb,
  unlikePost,
  type PostComment,
  type ProfilePost,
} from '@/lib/profile/social-client';
import { type RecordedVoiceClip } from '@/lib/profile/voice-notes';
import { Hint } from '@/components/ui/tooltip';
import { parseStudioBadge, studioChromeFromUser, studioNameClass, type StudioNameChrome } from '@/lib/studio-tier-chrome';
import {
  activityCommentElementId,
  parseActivityPostHash,
  scrollActivityPostTarget,
} from '@/lib/activity/post-deep-link';
import { compactReachCount, recordPostViewClient } from '@/lib/post-view-client';

type PostCardProps = {
  post: ProfilePost;
  /** Show the author name/avatar header (feed, wall, and reverbs). */
  showAuthor?: boolean;
  viewerSlug?: string;
  onDeleted?: (postId: string) => void;
  onReverbed?: (post: ProfilePost) => void;
};

function timeAgo(iso: string): string {
  try {
    return formatDistanceToNow(new Date(iso), { addSuffix: true });
  } catch {
    return '';
  }
}

function ReverbSourceBody({ post }: { post: ProfilePost }) {
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
          Original ·{' '}
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
      {post.reverbText ? (
        <p className="whitespace-pre-wrap text-sm leading-relaxed text-[var(--ph-text,#fff)]/90">
          {post.reverbText}
        </p>
      ) : null}
      {post.reverbImageUrl ? (
        <div className="mt-2 flex justify-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={post.reverbImageUrl}
            alt="Reverbed studio card"
            className="block h-auto w-full max-w-[360px] rounded-lg object-contain"
          />
        </div>
      ) : null}
      {post.reverbEmbedUrl ? (
        <div className="mt-2">
          <EmbedPlayer url={post.reverbEmbedUrl} />
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
      {!post.reverbText && !post.reverbImageUrl && !post.reverbEmbedUrl && !post.reverbVoice ? (
        <p className="text-xs italic text-[var(--ph-muted,rgba(255,255,255,0.5))]">Original post</p>
      ) : null}
    </div>
  );
}

export function PostCard({ post, showAuthor = false, viewerSlug, onDeleted, onReverbed }: PostCardProps) {
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const articleRef = useRef<HTMLElement>(null);
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [commentCount, setCommentCount] = useState(0);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [comments, setComments] = useState<PostComment[]>([]);
  const [commentsLoaded, setCommentsLoaded] = useState(false);
  const [draft, setDraft] = useState('');
  const [voice, setVoice] = useState<RecordedVoiceClip | null>(null);
  const [busy, setBusy] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [reverbed, setReverbed] = useState(false);
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
    void fetchHasReverbed(rootIdForReverb).then(setReverbed).catch(() => undefined);
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
    if (!showAuthor || !liveAuthorSlug) {
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
  }, [showAuthor, liveAuthorSlug]);

  const toggleLike = async () => {
    if (!user) {
      toast({ title: 'Sign in to show love' });
      return;
    }
    const next = !liked;
    setLiked(next);
    setLikeCount((c) => Math.max(0, c + (next ? 1 : -1)));
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
    }
  };

  const handleReverb = async () => {
    if (!user) {
      toast({ title: 'Sign in to Reverb' });
      return;
    }
    setBusy(true);
    try {
      const result = await toggleReverb(post, {
        name: user.displayName || 'Artist',
        slug: viewerSlug,
      });
      setReverbed(result.status === 'created');
      toast({
        title: result.status === 'created' ? 'Reverb live' : 'Reverb removed',
        description:
          result.status === 'created'
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

  const submitComment = async () => {
    if (!user || (!draft.trim() && !voice)) return;
    setBusy(true);
    try {
      const comment = await addComment(
        post.id,
        draft,
        {
          name: user.displayName || 'Artist',
          slug: viewerSlug,
        },
        voice || undefined
      );
      setComments((prev) => [...prev, comment]);
      setCommentCount((c) => c + 1);
      setDraft('');
      setVoice(null);
    } catch (e) {
      toast({
        variant: 'destructive',
        title: 'Comment failed',
        description: e instanceof Error ? e.message : undefined,
      });
    } finally {
      setBusy(false);
    }
  };

  const handleDeletePost = async () => {
    setBusy(true);
    try {
      await deletePost(post.id);
      onDeleted?.(post.id);
    } catch {
      toast({ variant: 'destructive', title: 'Could not delete post' });
      setBusy(false);
    }
  };

  return (
    <article
      ref={articleRef}
      id={`post-${post.id}`}
      className="scroll-mt-28 border border-dashed border-[var(--ph-border)] bg-black/20 p-4 transition-shadow data-[activity-focus]:ring-2 data-[activity-focus]:ring-fuchsia-400/80"
    >
      {post.isReverb && (
        <p className="mb-2 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.22em] text-violet-300/90">
          <Repeat2 className="h-3 w-3" /> Reverb
        </p>
      )}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          {showAuthor && (
            <span className="inline-flex items-center gap-2.5">
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
          <p className="text-[10px] uppercase tracking-widest text-[var(--ph-muted,rgba(255,255,255,0.55))]">
            {timeAgo(post.createdAt)}
          </p>
        </div>
        {isOwner && (
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7 text-[var(--ph-muted,rgba(255,255,255,0.55))] hover:text-red-400"
            disabled={busy}
            onClick={() => void handleDeletePost()}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>

      {post.text && (
        <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-[var(--ph-text,#fff)]">
          {post.text}
        </p>
      )}

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

      {post.isReverb ? <ReverbSourceBody post={post} /> : null}

      {!post.isReverb && post.imageUrl && (
        <div className="mt-3 mb-1 flex justify-center overflow-visible">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={post.imageUrl}
            alt="Shared studio card"
            className="block h-auto w-full max-w-[420px] rounded-xl object-contain shadow-[0_8px_28px_rgba(0,0,0,0.45)] sm:max-w-[480px]"
            style={{ imageRendering: 'auto' }}
          />
        </div>
      )}

      {!post.isReverb && post.embedUrl && (
        <div className="mt-3">
          <EmbedPlayer url={post.embedUrl} />
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
          <button
            type="button"
            disabled={busy}
            onClick={() => void handleReverb()}
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

      {commentsOpen && (
        <div className="mt-3 space-y-2 border-t border-[var(--ph-border,rgba(255,255,255,0.12))] pt-3">
          {comments.map((comment) => (
            <div
              key={comment.id}
              id={activityCommentElementId(comment.id)}
              className="flex scroll-mt-28 items-start gap-2 rounded-md px-1 py-1 text-sm transition-shadow data-[activity-focus]:ring-2 data-[activity-focus]:ring-fuchsia-400/80"
            >
              <div className="min-w-0 flex-1">
                <ArtistHomeLink
                  userId={comment.authorId}
                  slug={comment.authorSlug}
                  className="mr-2 text-[11px] font-bold uppercase tracking-wider text-[var(--ph-accent2,#fbbf24)] hover:underline"
                >
                  {comment.authorName}
                </ArtistHomeLink>
                {comment.text ? (
                  <span className="text-[var(--ph-text,#fff)]/90">{comment.text}</span>
                ) : null}
                {comment.voice ? (
                  <div className="mt-1.5">
                    <VoiceNotePlayer
                      src={comment.voice.url}
                      storagePath={comment.voice.storagePath}
                      contentType={comment.voice.contentType}
                      transcript={comment.voice.transcript}
                      durationSec={comment.voice.durationSec}
                      compact
                    />
                  </div>
                ) : null}
              </div>
              {user?.id && (user.id === comment.authorId || isOwner) && (
                <button
                  type="button"
                  className="text-[var(--ph-muted,rgba(255,255,255,0.4))] hover:text-red-400"
                  onClick={() => {
                    void deleteComment(post.id, comment.id)
                      .then(() => {
                        setComments((prev) => prev.filter((c) => c.id !== comment.id));
                        setCommentCount((c) => Math.max(0, c - 1));
                      })
                      .catch(() => toast({ variant: 'destructive', title: 'Could not delete' }));
                  }}
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              )}
            </div>
          ))}
          {commentsLoaded && comments.length === 0 && (
            <p className="text-xs text-[var(--ph-muted,rgba(255,255,255,0.5))]">
              No replies yet.
            </p>
          )}
          {user ? (
            <div className="space-y-2 pt-1">
              <VoiceNoteComposer
                clip={voice}
                onClipChange={setVoice}
                disabled={busy}
                compact
              />
              <div className="flex items-center gap-2">
                <Input
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      void submitComment();
                    }
                  }}
                  maxLength={500}
                  placeholder={voice ? 'Add a caption (optional)…' : 'Say something…'}
                  className="h-8 border-[var(--ph-border,rgba(255,255,255,0.12))] bg-black/30 text-sm"
                />
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 shrink-0 text-[var(--ph-accent,#7dd3fc)]"
                  disabled={busy || (!draft.trim() && !voice)}
                  onClick={() => void submitComment()}
                >
                  <Send className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ) : (
            <p className="text-xs text-[var(--ph-muted,rgba(255,255,255,0.5))]">
              <Link href="/login" className="text-[var(--ph-accent,#7dd3fc)] hover:underline">
                Sign in
              </Link>{' '}
              to reply.
            </p>
          )}
        </div>
      )}
    </article>
  );
}
