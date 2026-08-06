'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Heart, MessageCircle, Send, Share2, Trash2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { cn } from '@/lib/utils';
import { ArtistStarAvatar } from '@/components/profile/artist-star-avatar';
import { EmbedPlayer } from '@/components/profile/embed-player';
import { PostShareDialog } from '@/components/profile/post-share-dialog';
import {
  addComment,
  deleteComment,
  deletePost,
  fetchComments,
  fetchCommentCount,
  fetchHasLiked,
  fetchLikeCount,
  fetchPublicArtistAvatarMeta,
  likePost,
  unlikePost,
  type PostComment,
  type ProfilePost,
} from '@/lib/profile/social-client';

type PostCardProps = {
  post: ProfilePost;
  /** Show the author name/link header (used in the feed; hidden on own wall). */
  showAuthor?: boolean;
  viewerSlug?: string;
  onDeleted?: (postId: string) => void;
};

function timeAgo(iso: string): string {
  try {
    return formatDistanceToNow(new Date(iso), { addSuffix: true });
  } catch {
    return '';
  }
}

export function PostCard({ post, showAuthor = false, viewerSlug, onDeleted }: PostCardProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [commentCount, setCommentCount] = useState(0);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [comments, setComments] = useState<PostComment[]>([]);
  const [commentsLoaded, setCommentsLoaded] = useState(false);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [authorAvatarUrl, setAuthorAvatarUrl] = useState<string | undefined>(undefined);
  const [authorStarSeed, setAuthorStarSeed] = useState<number | undefined>(undefined);
  const [authorUseStar, setAuthorUseStar] = useState(false);

  const isOwner = Boolean(user?.id && user.id === post.ownerId);

  useEffect(() => {
    void fetchLikeCount(post.id).then(setLikeCount).catch(() => undefined);
    void fetchCommentCount(post.id).then(setCommentCount).catch(() => undefined);
    void fetchHasLiked(post.id).then(setLiked).catch(() => undefined);
  }, [post.id]);

  useEffect(() => {
    if (!showAuthor || !post.ownerSlug) {
      setAuthorAvatarUrl(undefined);
      setAuthorStarSeed(undefined);
      setAuthorUseStar(false);
      return;
    }
    let cancelled = false;
    void fetchPublicArtistAvatarMeta(post.ownerSlug).then((meta) => {
      if (cancelled || !meta) return;
      setAuthorAvatarUrl(meta.avatarUrl);
      setAuthorUseStar(Boolean(meta.starMarkUseStar));
      setAuthorStarSeed(meta.starMarkSeed);
    });
    return () => {
      cancelled = true;
    };
  }, [showAuthor, post.ownerSlug]);

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
    if (!user || !draft.trim()) return;
    setBusy(true);
    try {
      const comment = await addComment(post.id, draft, {
        name: user.displayName || 'Artist',
        slug: viewerSlug,
      });
      setComments((prev) => [...prev, comment]);
      setCommentCount((c) => c + 1);
      setDraft('');
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
      id={`post-${post.id}`}
      className="scroll-mt-24 border border-dashed border-[var(--ph-border)] bg-black/20 p-4"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          {showAuthor &&
            (() => {
              const chip = (
                <span className="inline-flex items-center gap-2.5">
                  <ArtistStarAvatar
                    name={post.ownerName}
                    avatarUrl={authorAvatarUrl}
                    useStarMark={authorUseStar}
                    starMarkSeed={authorStarSeed}
                    size={56}
                    toneClass="bg-[var(--ph-accent,#7dd3fc)]/25 text-[var(--ph-accent,#7dd3fc)]"
                  />
                  <span className="text-xs font-bold uppercase tracking-widest text-[var(--ph-accent,#7dd3fc)]">
                    {post.ownerName}
                  </span>
                </span>
              );
              return post.ownerSlug ? (
                <Link
                  href={`/profile/${post.ownerSlug}`}
                  className="inline-flex hover:opacity-90 hover:underline"
                >
                  {chip}
                </Link>
              ) : (
                chip
              );
            })()}
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

      {post.imageUrl && (
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

      {post.embedUrl && (
        <div className="mt-3">
          <EmbedPlayer url={post.embedUrl} />
        </div>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-4">
        <button
          type="button"
          onClick={() => void toggleLike()}
          className={cn(
            'flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest transition-colors',
            liked
              ? 'text-[var(--ph-accent,#7dd3fc)]'
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
        <button
          type="button"
          onClick={() => setShareOpen(true)}
          className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-[var(--ph-muted,rgba(255,255,255,0.55))] transition-colors hover:text-[var(--ph-text,#fff)]"
        >
          <Share2 className="h-3.5 w-3.5" />
          Share
        </button>
      </div>

      <PostShareDialog open={shareOpen} onOpenChange={setShareOpen} post={post} />

      {commentsOpen && (
        <div className="mt-3 space-y-2 border-t border-[var(--ph-border,rgba(255,255,255,0.12))] pt-3">
          {comments.map((comment) => (
            <div key={comment.id} className="flex items-start gap-2 text-sm">
              <div className="min-w-0 flex-1">
                {comment.authorSlug ? (
                  <Link
                    href={`/profile/${comment.authorSlug}`}
                    className="mr-2 text-[11px] font-bold uppercase tracking-wider text-[var(--ph-accent2,#fbbf24)] hover:underline"
                  >
                    {comment.authorName}
                  </Link>
                ) : (
                  <span className="mr-2 text-[11px] font-bold uppercase tracking-wider text-[var(--ph-accent2,#fbbf24)]">
                    {comment.authorName}
                  </span>
                )}
                <span className="text-[var(--ph-text,#fff)]/90">{comment.text}</span>
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
            <div className="flex items-center gap-2 pt-1">
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
                placeholder="Say something..."
                className="h-8 border-[var(--ph-border,rgba(255,255,255,0.12))] bg-black/30 text-sm"
              />
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8 shrink-0 text-[var(--ph-accent,#7dd3fc)]"
                disabled={busy || !draft.trim()}
                onClick={() => void submitComment()}
              >
                <Send className="h-3.5 w-3.5" />
              </Button>
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
