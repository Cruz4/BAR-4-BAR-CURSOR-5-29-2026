'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { Heart, MessageCircle, Send, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { ArtistHomeLink } from '@/components/profile/artist-home-link';
import { ExpandableImage } from '@/components/profile/expandable-image';
import { ImageAttachComposer, attachPastedImage } from '@/components/profile/image-attach-composer';
import { VoiceNoteComposer } from '@/components/profile/voice-note-composer';
import { VoiceNotePlayer } from '@/components/profile/voice-note-player';
import { buildCommentTree, type CommentNode } from '@/lib/profile/comment-tree';
import {
  addComment,
  deleteComment,
  fetchCommentLikeStates,
  likeComment,
  unlikeComment,
  type PostComment,
} from '@/lib/profile/social-client';
import { useGamification } from '@/context/gamification-context';
import { SCENE_BOOTH_ID } from '@/lib/scene-home';
import {
  addDropComment,
  deleteDropComment,
  fetchDropCommentLikeStates,
  likeDropComment,
  unlikeDropComment,
} from '@/lib/drop-social-client';
import { revokePostImagePreview, type PendingPostImage } from '@/lib/profile/post-images';
import { type RecordedVoiceClip } from '@/lib/profile/voice-notes';
import { activityCommentElementId } from '@/lib/activity/post-deep-link';
import { EmojiPickerButton, useEmojiInserter } from '@/components/ui/emoji-picker-button';
import { isMasterAdminEmail } from '@/lib/master-admin';

type PostCommentThreadProps = {
  postId?: string;
  shareId?: string;
  comments: PostComment[];
  commentsLoaded: boolean;
  commentCount: number;
  onCommentsChange: (next: PostComment[]) => void;
  onCommentCountChange: (next: number) => void;
  user: {
    id: string;
    displayName?: string | null;
    email?: string | null;
    role?: string | null;
  } | null;
  viewerSlug?: string;
  isOwner: boolean;
};

type ReplyTarget = {
  commentId: string;
  authorName: string;
  authorId: string;
};

export function PostCommentThread({
  postId,
  shareId,
  comments,
  commentsLoaded,
  commentCount,
  onCommentsChange,
  onCommentCountChange,
  user,
  viewerSlug,
  isOwner,
}: PostCommentThreadProps) {
  const { toast } = useToast();
  const { summary, loading: profileLoading } = useGamification();
  const [likeStates, setLikeStates] = useState<Record<string, { count: number; liked: boolean }>>({});
  const [replyTo, setReplyTo] = useState<ReplyTarget | null>(null);
  const [draft, setDraft] = useState('');
  const [voice, setVoice] = useState<RecordedVoiceClip | null>(null);
  const [image, setImage] = useState<PendingPostImage | null>(null);
  const [busy, setBusy] = useState(false);
  const draftRef = useRef<HTMLInputElement>(null);
  const insertEmoji = useEmojiInserter(draft, setDraft, draftRef);
  const profileLive = Boolean(summary.publicProfile && summary.profileSlug);
  const canWritePublic = Boolean(user && !profileLoading && profileLive);
  const isAdmin = Boolean(
    user && (user.role === 'admin' || isMasterAdminEmail(user.email))
  );

  const tree = useMemo(() => buildCommentTree(comments), [comments]);

  useEffect(() => {
    if (!comments.length || (!postId && !shareId)) {
      setLikeStates({});
      return;
    }
    let cancelled = false;
    const loader = postId
      ? fetchCommentLikeStates(postId, comments.map((c) => c.id))
      : fetchDropCommentLikeStates(shareId!, comments.map((c) => c.id));
    void loader.then((states) => {
      if (!cancelled) setLikeStates(states);
    });
    return () => {
      cancelled = true;
    };
  }, [postId, shareId, comments]);

  const submitComment = async () => {
    if (!user || (!draft.trim() && !voice && !image)) return;
    if (!canWritePublic) {
      toast({
        variant: 'destructive',
        title: 'Artist Home offline',
        description: 'Turn your Artist Home live in Your Booth before posting or replying.',
      });
      return;
    }
    if (!postId && !shareId) return;
    setBusy(true);
    try {
      const author = {
        name: user.displayName || 'Artist',
        slug: viewerSlug,
      };
      const replyOpts = replyTo
        ? {
            parentCommentId: replyTo.commentId,
            recipientId: replyTo.authorId,
            recipientName: replyTo.authorName,
          }
        : undefined;
      const comment = postId
        ? await addComment(
            postId,
            draft,
            author,
            voice || undefined,
            image || undefined,
            replyOpts
          )
        : await addDropComment(shareId!, draft, author, image || undefined, replyOpts);
      onCommentsChange([...comments, comment]);
      onCommentCountChange(commentCount + 1);
      setDraft('');
      setVoice(null);
      revokePostImagePreview(image);
      setImage(null);
      setReplyTo(null);
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

  const toggleCommentLike = async (commentId: string) => {
    if (!user) {
      toast({ title: 'Sign in to show love' });
      return;
    }
    if (!postId && !shareId) return;
    const prev = likeStates[commentId] || { count: 0, liked: false };
    const nextLiked = !prev.liked;
    setLikeStates((s) => ({
      ...s,
      [commentId]: {
        count: Math.max(0, prev.count + (nextLiked ? 1 : -1)),
        liked: nextLiked,
      },
    }));
    try {
      const actor = {
        name: user.displayName || 'Artist',
        slug: viewerSlug,
      };
      if (nextLiked) {
        if (postId) await likeComment(postId, commentId, actor);
        else await likeDropComment(shareId!, commentId, actor);
      } else if (postId) await unlikeComment(postId, commentId);
      else await unlikeDropComment(shareId!, commentId);
    } catch {
      setLikeStates((s) => ({ ...s, [commentId]: prev }));
    }
  };

  const removeComment = async (commentId: string) => {
    if (postId) await deleteComment(postId, commentId);
    else if (shareId) await deleteDropComment(shareId, commentId);
    else return;
    onCommentsChange(comments.filter((c) => c.id !== commentId));
    onCommentCountChange(Math.max(0, commentCount - 1));
  };

  const renderNode = (node: CommentNode, depth = 0) => {
    const likes = likeStates[node.id] || { count: 0, liked: false };
    return (
      <div
        key={node.id}
        id={activityCommentElementId(node.id)}
        className={cn(
          'scroll-mt-28 rounded-md px-1 py-1 transition-shadow data-[activity-focus]:ring-2 data-[activity-focus]:ring-fuchsia-400/80',
          depth > 0 && 'ml-4 border-l border-[var(--ph-border,rgba(255,255,255,0.12))] pl-3'
        )}
      >
        <div className="flex items-start gap-2 text-sm">
          <div className="min-w-0 flex-1">
            <ArtistHomeLink
              userId={node.authorId}
              slug={node.authorSlug}
              className="mr-2 text-[11px] font-bold uppercase tracking-wider text-[var(--ph-accent2,#fbbf24)] hover:underline"
            >
              {node.authorName}
            </ArtistHomeLink>
            {node.text ? (
              <span className="text-[var(--ph-text,#fff)]/90">{node.text}</span>
            ) : null}
            {node.imageUrl ? (
              <div className="mt-1.5">
                <ExpandableImage
                  src={node.imageUrl}
                  alt="Comment photo"
                  thumbClassName="max-h-56 w-auto max-w-full rounded-lg"
                />
              </div>
            ) : null}
            {node.voice ? (
              <div className="mt-1.5">
                <VoiceNotePlayer
                  src={node.voice.url}
                  storagePath={node.voice.storagePath}
                  contentType={node.voice.contentType}
                  transcript={node.voice.transcript}
                  durationSec={node.voice.durationSec}
                  compact
                />
              </div>
            ) : null}
            <div className="mt-1.5 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => void toggleCommentLike(node.id)}
                className={cn(
                  'inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest transition-colors',
                  likes.liked
                    ? 'text-accent'
                    : 'text-[var(--ph-muted,rgba(255,255,255,0.45))] hover:text-[var(--ph-text,#fff)]'
                )}
              >
                <Heart className={cn('h-3 w-3', likes.liked && 'fill-current')} />
                {likes.count > 0 ? likes.count : 'Love'}
              </button>
              {user ? (
                <button
                  type="button"
                  disabled={!canWritePublic}
                  onClick={() =>
                    setReplyTo({
                      commentId: node.id,
                      authorId: node.authorId,
                      authorName: node.authorName,
                    })
                  }
                  className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-[var(--ph-muted,rgba(255,255,255,0.45))] hover:text-[var(--ph-text,#fff)] disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:text-[var(--ph-muted,rgba(255,255,255,0.45))]"
                  title={!canWritePublic ? 'Turn your Artist Home live to reply' : undefined}
                >
                  <MessageCircle className="h-3 w-3" />
                  Reply
                </button>
              ) : null}
            </div>
          </div>
          {user?.id && (user.id === node.authorId || isOwner || isAdmin) ? (
            <button
              type="button"
              className="text-[var(--ph-muted,rgba(255,255,255,0.4))] hover:text-red-400"
              onClick={() => {
                void removeComment(node.id).catch(() =>
                  toast({ variant: 'destructive', title: 'Could not delete' })
                );
              }}
              aria-label={
                isAdmin && user.id !== node.authorId && !isOwner
                  ? 'Admin: delete reply'
                  : 'Delete reply'
              }
              title={
                isAdmin && user.id !== node.authorId && !isOwner
                  ? 'Admin: delete reply'
                  : 'Delete reply'
              }
            >
              <Trash2 className="h-3 w-3" />
            </button>
          ) : null}
        </div>
        {node.replies.length > 0 ? (
          <div className="mt-2 space-y-2">{node.replies.map((reply) => renderNode(reply, depth + 1))}</div>
        ) : null}
      </div>
    );
  };

  return (
    <div className="mt-3 space-y-2 border-t border-[var(--ph-border,rgba(255,255,255,0.12))] pt-3">
      {tree.map((node) => renderNode(node))}
      {commentsLoaded && comments.length === 0 && (
        <p className="text-xs text-[var(--ph-muted,rgba(255,255,255,0.5))]">No replies yet.</p>
      )}
      {user && profileLoading ? (
        <p className="text-xs text-[var(--ph-muted,rgba(255,255,255,0.5))]">
          Checking your Artist Home…
        </p>
      ) : canWritePublic ? (
        <div className="space-y-2 pt-1">
          {replyTo ? (
            <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--ph-muted,rgba(255,255,255,0.55))]">
              Replying to {replyTo.authorName}{' '}
              <button
                type="button"
                className="text-[var(--ph-accent,#7dd3fc)] hover:underline"
                onClick={() => setReplyTo(null)}
              >
                Cancel
              </button>
            </p>
          ) : null}
          <div className="flex flex-wrap items-center gap-2">
            {postId ? (
              <VoiceNoteComposer clip={voice} onClipChange={setVoice} disabled={busy} compact />
            ) : null}
            <ImageAttachComposer
              image={image}
              onImageChange={setImage}
              disabled={busy}
              compact
              onError={(message) =>
                toast({
                  variant: 'destructive',
                  title: 'Could not attach photo',
                  description: message,
                })
              }
            />
            <EmojiPickerButton compact disabled={busy} onInsert={insertEmoji} />
          </div>
          <div className="flex items-center gap-2">
            <Input
              ref={draftRef}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onPaste={(e) => {
                void attachPastedImage(e, {
                  disabled: busy,
                  image,
                  onImageChange: setImage,
                  onError: (message) =>
                    toast({
                      variant: 'destructive',
                      title: 'Could not attach photo',
                      description: message,
                    }),
                });
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  void submitComment();
                }
              }}
              maxLength={500}
              placeholder={
                replyTo
                  ? `Reply to ${replyTo.authorName}…`
                  : voice || image
                    ? 'Add a caption (optional)…'
                    : shareId
                      ? 'Reply on this drop…'
                      : 'Say something… or paste a photo'
              }
              className="h-8 border-[var(--ph-border,rgba(255,255,255,0.12))] bg-black/30 text-sm"
            />
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8 shrink-0 text-[var(--ph-accent,#7dd3fc)]"
              disabled={busy || (!draft.trim() && !voice && !image)}
              onClick={() => void submitComment()}
            >
              <Send className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      ) : user ? (
        <p className="text-xs text-[var(--ph-muted,rgba(255,255,255,0.55))]">
          Your Artist Home is offline.{' '}
          <Link
            href={`/#${SCENE_BOOTH_ID}`}
            className="font-semibold text-[var(--ph-accent,#7dd3fc)] hover:underline"
          >
            Turn it live in Your Booth
          </Link>{' '}
          to post or reply. Existing comments stay visible.
        </p>
      ) : (
        <p className="text-xs text-[var(--ph-muted,rgba(255,255,255,0.5))]">
          <Link href="/login" className="text-[var(--ph-accent,#7dd3fc)] hover:underline">
            Sign in
          </Link>{' '}
          to reply.
        </p>
      )}
    </div>
  );
}
