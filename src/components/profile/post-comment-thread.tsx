'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { BarChart3, Heart, MessageCircle, Send, Sparkles, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { ArtistHomeLink } from '@/components/profile/artist-home-link';
import { ExpandableImage } from '@/components/profile/expandable-image';
import { ImageAttachComposer, attachPastedImage } from '@/components/profile/image-attach-composer';
import { GifAttachButton } from '@/components/profile/gif-attach-button';
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
import { useArtistHomeEngagementGate } from '@/context/artist-home-engagement-context';
import {
  addDropComment,
  deleteDropComment,
  fetchDropCommentLikeStates,
  likeDropComment,
  unlikeDropComment,
} from '@/lib/drop-social-client';
import { revokePostImagePreview, type PendingPostImage } from '@/lib/profile/post-images';
import { revokeWallClipPreview, type PendingWallClip } from '@/lib/profile/wall-clips';
import { WallClipPlayer } from '@/components/profile/wall-clip-player';
import { type RecordedVoiceClip } from '@/lib/profile/voice-notes';
import { activityCommentElementId } from '@/lib/activity/post-deep-link';
import { EmojiPickerButton, useEmojiInserter } from '@/components/ui/emoji-picker-button';
import { isMasterAdminEmail } from '@/lib/master-admin';
import { MentionField } from '@/components/profile/mention-suggestions';
import { MentionText } from '@/components/profile/mention-text';
import { ComposerLinkPreview, FieldsLinkPreview } from '@/components/profile/inline-link-preview';
import { QuotePressCard } from '@/components/profile/quote-press-card';
import { QuotePressComposerPanel } from '@/components/profile/quote-press-composer-panel';
import { PollComposerFields } from '@/components/profile/poll-composer-fields';
import { PostPollCard } from '@/components/profile/post-poll';
import { useAuth } from '@/hooks/use-auth';
import { useImprintComposer } from '@/hooks/use-imprint-composer';
import { isProOrTrial } from '@/lib/subscription';
import {
  resolveViewerThreadImprintLock,
  writeImprintThreadLock,
} from '@/lib/profile/imprint-permanent';
import type { PostPollResultsVisibility } from '@/lib/profile/post-polls';

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
  const { user: authUser } = useAuth();
  const { summary, loading: profileLoading } = useGamification();
  const { ensureEngagement } = useArtistHomeEngagementGate();
  const isPro = isProOrTrial(authUser);
  const [likeStates, setLikeStates] = useState<Record<string, { count: number; liked: boolean }>>({});
  const [replyTo, setReplyTo] = useState<ReplyTarget | null>(null);
  const [draft, setDraft] = useState('');
  const [voice, setVoice] = useState<RecordedVoiceClip | null>(null);
  const [image, setImage] = useState<PendingPostImage | null>(null);
  const [clip, setClip] = useState<PendingWallClip | null>(null);
  const [pollOpen, setPollOpen] = useState(false);
  const [pollOptions, setPollOptions] = useState(['', '']);
  const [pollVisibility, setPollVisibility] = useState<PostPollResultsVisibility>('after_vote');
  const [busy, setBusy] = useState(false);
  const draftRef = useRef<HTMLInputElement>(null);
  const insertEmoji = useEmojiInserter(draft, setDraft, draftRef);
  const threadScope = postId || shareId;
  const threadImprintLock = useMemo(
    () =>
      user?.id && threadScope
        ? resolveViewerThreadImprintLock(comments, user.id, threadScope)
        : null,
    [comments, threadScope, user?.id]
  );
  const {
    imprintOn,
    showImprintToggle,
    imprintStyleLocked,
    toggleImprint,
    resetImprint,
    imprintFaders,
    pinImprintLook,
    shuffleImprint,
    shuffleRemaining,
    shuffleCap,
    imprintSlots,
    slotBusy,
    activeImprintConfig,
    persistImprintSlots,
    imprintPayload,
  } = useImprintComposer(draft, isPro, summary.quotePressSlots, {
    lockedFaders: threadImprintLock,
  });
  const pollReady = !pollOpen || (Boolean(draft.trim()) && pollOptions.every((option) => option.trim()));
  const composerReady =
    pollReady && Boolean(draft.trim() || voice || image || clip || (pollOpen && draft.trim()));
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
  }, [postId, shareId, comments, user?.id]);

  const submitComment = async () => {
    if (!user || !composerReady) return;
    if (!ensureEngagement({ intent: 'reply' })) return;
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
            {
              ...replyOpts,
              ...(clip ? { video: clip } : {}),
              ...imprintPayload,
              ...(pollOpen
                ? { poll: { options: pollOptions, resultsVisibility: pollVisibility } }
                : {}),
            }
          )
        : await addDropComment(shareId!, draft, author, image || undefined, {
            ...replyOpts,
            ...(clip ? { video: clip } : {}),
          });
      onCommentsChange([...comments, comment]);
      onCommentCountChange(commentCount + 1);
      if (user?.id && threadScope && comment.quotePress?.faders) {
        writeImprintThreadLock(threadScope, user.id, comment.quotePress.faders);
      }
      setDraft('');
      setVoice(null);
      revokePostImagePreview(image);
      setImage(null);
      revokeWallClipPreview(clip);
      setClip(null);
      setPollOpen(false);
      setPollOptions(['', '']);
      setPollVisibility('after_vote');
      resetImprint();
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
    if (!ensureEngagement({ intent: 'love' })) return;
    if (!user) return;
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
        if (postId) {
          const result = await likeComment(postId, commentId, actor);
          if (!result.created) {
            setLikeStates((s) => ({
              ...s,
              [commentId]: { count: prev.count, liked: true },
            }));
          }
        } else await likeDropComment(shareId!, commentId, actor);
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
            {node.text && node.quotePress ? (
              <div className="mt-1.5">
                <QuotePressCard
                  text={node.text}
                  config={node.quotePress}
                  withMentions
                  compact
                  creatorSlug={node.authorSlug}
                />
              </div>
            ) : node.text ? (
              <span className="text-[var(--ph-text,#fff)]/90"><MentionText text={node.text} /></span>
            ) : null}
            {node.text && !node.quotePress ? (
              <FieldsLinkPreview text={node.text} compact className="mt-1.5 max-w-md" />
            ) : null}
            {node.poll && postId ? (
              <PostPollCard postId={postId} commentId={node.id} poll={node.poll} />
            ) : null}
            {node.video ? (
              <div className="mt-1.5">
                <WallClipPlayer clip={node.video} poster={node.imageUrl} compact />
              </div>
            ) : node.imageUrl ? (
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
                  onClick={() => {
                    if (!ensureEngagement({ intent: 'reply' })) return;
                    setReplyTo({
                      commentId: node.id,
                      authorId: node.authorId,
                      authorName: node.authorName,
                    });
                  }}
                  className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-[var(--ph-muted,rgba(255,255,255,0.45))] hover:text-[var(--ph-text,#fff)]"
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
      ) : user && !profileLoading ? (
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
          <div className="flex min-w-0 items-center gap-1 overflow-x-auto">
            {postId ? (
              <div className={cn('shrink-0', voice && 'min-w-0 max-w-full basis-full sm:basis-auto')}>
                <VoiceNoteComposer clip={voice} onClipChange={setVoice} disabled={busy} compact />
              </div>
            ) : null}
            <div className="shrink-0">
              <ImageAttachComposer
                image={image}
                onImageChange={setImage}
                clip={clip}
                onClipChange={setClip}
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
            </div>
            <GifAttachButton
              disabled={busy}
              image={image}
              onImageChange={setImage}
              clip={clip}
              onClipChange={setClip}
            />
            <EmojiPickerButton compact disabled={busy} onInsert={insertEmoji} />
            {postId ? (
              <>
                <button
                  type="button"
                  onClick={() => setPollOpen((value) => !value)}
                  disabled={busy}
                  className={cn(
                    'inline-flex shrink-0 items-center gap-1 whitespace-nowrap font-code text-[9px] font-bold uppercase tracking-wider transition-colors',
                    pollOpen ? 'text-cyan-300' : 'text-[var(--ph-muted,rgba(255,255,255,0.45))] hover:text-cyan-300'
                  )}
                >
                  <BarChart3 className="h-3.5 w-3.5" /> Poll
                </button>
                {showImprintToggle ? (
                  <button
                    type="button"
                    onClick={toggleImprint}
                    disabled={busy}
                    className={cn(
                      'inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-md border px-1.5 py-0.5 font-code text-[9px] font-bold uppercase tracking-wider transition-all',
                      imprintOn
                        ? 'border-cyan-400/55 bg-cyan-500/20 text-cyan-100 shadow-[0_0_14px_rgba(34,211,238,0.28)]'
                        : 'border-transparent text-[var(--ph-muted,rgba(255,255,255,0.45))] hover:border-cyan-500/35 hover:bg-cyan-500/10 hover:text-cyan-300'
                    )}
                  >
                    <Sparkles className={cn('h-3.5 w-3.5', imprintOn ? 'text-cyan-200' : 'text-cyan-400/80')} />
                    Imprint
                  </button>
                ) : null}
              </>
            ) : null}
          </div>
          {imprintOn && draft.trim() ? (
            <div className="space-y-2">
              <QuotePressCard text={draft} config={activeImprintConfig} withMentions compact />
              <QuotePressComposerPanel
                onShuffle={() => void shuffleImprint()}
                shuffleRemaining={shuffleRemaining}
                shuffleCap={shuffleCap}
                slots={imprintSlots}
                faders={imprintFaders}
                isPro={isPro}
                busy={busy || slotBusy || imprintStyleLocked}
                onLockSlot={(label) => {
                  if (imprintStyleLocked) return;
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
                  if (!isPro || imprintStyleLocked) return;
                  pinImprintLook(slot.faders);
                }}
                onClearSlot={(slotId) => {
                  if (imprintStyleLocked) return;
                  void persistImprintSlots(imprintSlots.filter((s) => s.id !== slotId));
                }}
              />
            </div>
          ) : null}
          {pollOpen ? (
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
          <div className="relative flex flex-1 items-center gap-2">
            <MentionField value={draft} onChange={setDraft} excludeUserId={user?.id} className="flex-1">
              <Input
                ref={draftRef}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onPaste={(e) => {
                  void attachPastedImage(e, {
                    disabled: busy,
                    image,
                    onImageChange: setImage,
                    clip,
                    onClipChange: setClip,
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
                    : voice || image || clip
                      ? 'Add a caption (optional)…'
                      : shareId
                        ? 'Reply on this drop…'
                        : 'Say something… or paste a link or photo'
                }
                className="h-8 border-[var(--ph-border,rgba(255,255,255,0.12))] bg-black/30 text-sm"
              />
            </MentionField>
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8 shrink-0 text-[var(--ph-accent,#7dd3fc)]"
              disabled={busy || !composerReady}
              onClick={() => void submitComment()}
            >
              <Send className="h-3.5 w-3.5" />
            </Button>
          </div>
          <ComposerLinkPreview text={draft} className="max-w-md" />
        </div>
      ) : (
        <p className="text-xs text-[var(--ph-muted,rgba(255,255,255,0.5))]">
          <Link href="/login?mode=signup" className="text-[var(--ph-accent,#7dd3fc)] hover:underline">
            Sign in
          </Link>{' '}
          to reply.
        </p>
      )}
    </div>
  );
}
