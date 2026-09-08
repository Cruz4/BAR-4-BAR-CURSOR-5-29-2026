'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { BarChart3, Eye, Heart, MessageCircle, Repeat2, Share2, Sparkles, Trash2, Users } from 'lucide-react';
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
import { usePostImageUrl } from '@/hooks/use-post-image-url';
import { cn } from '@/lib/utils';
import { ArtistStarAvatar } from '@/components/profile/artist-star-avatar';
import { ArtistHomeLink, useLiveArtistHomeSlug } from '@/components/profile/artist-home-link';
import { FieldsLinkPreview } from '@/components/profile/inline-link-preview';
import { PostShareDialog } from '@/components/profile/post-share-dialog';
import { ExpandableImage } from '@/components/profile/expandable-image';
import { WallClipPlayer } from '@/components/profile/wall-clip-player';
import { PostCommentThread } from '@/components/profile/post-comment-thread';
import { VoiceNotePlayer } from '@/components/profile/voice-note-player';
import {
  deletePost,
  fetchComments,
  fetchCommentCount,
  fetchHasLiked,
  fetchHasReverbed,
  fetchPostById,
  fetchViewerReverbPost,
  fetchLikeCount,
  fetchReverbCount,
  fetchPublicArtistAvatarMeta,
  likePost,
  toggleReverb,
  unlikePost,
  type PostComment,
  type ProfilePost,
  type ReverbComposerOptions,
} from '@/lib/profile/social-client';
import { VoiceNoteComposer } from '@/components/profile/voice-note-composer';
import { ImageAttachComposer, attachPastedImage } from '@/components/profile/image-attach-composer';
import { EmojiPickerButton, useEmojiInserter } from '@/components/ui/emoji-picker-button';
import { PollComposerFields } from '@/components/profile/poll-composer-fields';
import {
  revokePostImagePreview,
  type PendingPostImage,
} from '@/lib/profile/post-images';
import { revokeWallClipPreview, type PendingWallClip } from '@/lib/profile/wall-clips';
import { type RecordedVoiceClip } from '@/lib/profile/voice-notes';
import type { PostPollResultsVisibility } from '@/lib/profile/post-polls';
import { Hint } from '@/components/ui/tooltip';
import { parseStudioBadge, studioChromeFromUser, studioNameClass, type StudioNameChrome } from '@/lib/studio-tier-chrome';
import {
  parseActivityPostHash,
  scrollActivityPostTarget,
} from '@/lib/activity/post-deep-link';
import { activityOpenLinkHref, artistHomePostHref, publicScenePostHref } from '@/lib/activity/href';
import { compactReachCount, recordPostViewClient } from '@/lib/post-view-client';
import { LyricClipCard } from '@/components/profile/lyric-clip-card';
import { QuotePressCard } from '@/components/profile/quote-press-card';
import { ImprintExportMenu } from '@/components/profile/imprint-export-menu';
import { QuotePressComposerPanel } from '@/components/profile/quote-press-composer-panel';
import { useGamification } from '@/context/gamification-context';
import { useImprintComposer } from '@/hooks/use-imprint-composer';
import { isProOrTrial } from '@/lib/subscription';
import { quotePressSlotLabel } from '@/lib/profile/quote-press';
import type { QuotePressConfig } from '@/lib/profile/quote-press';
import { isMasterAdminEmail } from '@/lib/master-admin';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { MentionField } from '@/components/profile/mention-suggestions';
import { MentionText } from '@/components/profile/mention-text';
import { PostPollCard } from '@/components/profile/post-poll';

type PostCardProps = {
  post: ProfilePost;
  /** Show the author name/avatar header (feed, wall, and reverbs). Hidden in immersive swipe — the slide already names them. */
  showAuthor?: boolean;
  viewerSlug?: string;
  onDeleted?: (postId: string) => void;
  onReverbed?: (post: ProfilePost) => void;
  immersive?: boolean;
  /** Play this card's clip while it is the focused immersive slide. */
  mediaActive?: boolean;
};

function timeAgo(iso: string): string {
  try {
    return formatDistanceToNow(new Date(iso), { addSuffix: true });
  } catch {
    return '';
  }
}

function ImmersiveClampedText({
  text,
  immersive,
  className,
  children,
}: {
  text: string;
  immersive?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  const [expanded, setExpanded] = useState(false);
  const long =
    text.trim().split(/\s+/).length > 40 ||
    text.length > 220 ||
    text.split('\n').length > 6;
  if (!immersive) {
    return <p className={className}>{children}</p>;
  }
  return (
    <div>
      <p className={cn(className, !expanded && 'line-clamp-6')}>{children}</p>
      {long ? (
        <button
          type="button"
          onClick={() => setExpanded((open) => !open)}
          className="mt-1 text-[10px] font-bold uppercase tracking-widest text-sky-300 hover:text-sky-200"
        >
          {expanded ? 'Show less' : 'Read more'}
        </button>
      ) : null}
    </div>
  );
}

/** Goal foil posts predate typed media, so recognize their stable generated caption. */
function isStudioGoalShare(text?: string): boolean {
  return Boolean(text && /\b(?:weekly|monthly|lifetime)\s+goal complete:/i.test(text));
}

function ReverbSourceBody({
  post,
  immersive = false,
  mediaActive,
}: {
  post: ProfilePost;
  immersive?: boolean;
  mediaActive?: boolean;
}) {
  const name = post.reverbOwnerName || 'Artist';
  const { liveSlug, href, resolved, isLive } = useLiveArtistHomeSlug(
    post.reverbOwnerId,
    post.reverbOwnerSlug
  );
  const [avatarUrl, setAvatarUrl] = useState<string | undefined>(undefined);
  const [starSeed, setStarSeed] = useState<number | undefined>(undefined);
  const [useStar, setUseStar] = useState(false);
  const [studioChrome, setStudioChrome] = useState<StudioNameChrome | undefined>(undefined);
  const [reverbImprint, setReverbImprint] = useState<QuotePressConfig | undefined>(
    post.reverbQuotePress
  );

  useEffect(() => {
    setReverbImprint(post.reverbQuotePress);
  }, [post.reverbQuotePress]);

  useEffect(() => {
    if (post.reverbQuotePress || !post.reverbPostId || !post.reverbText?.trim()) return;
    let cancelled = false;
    void fetchPostById(post.reverbPostId).then((original) => {
      if (!cancelled && original?.quotePress) setReverbImprint(original.quotePress);
    });
    return () => {
      cancelled = true;
    };
  }, [post.reverbPostId, post.reverbQuotePress, post.reverbText]);

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

  const originalPostHref =
    post.reverbPostId && liveSlug ? artistHomePostHref(liveSlug, post.reverbPostId) : undefined;

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
              href={activityOpenLinkHref(originalPostHref)}
              prefetch={false}
              onClick={(event) => {
                event.preventDefault();
                window.location.assign(originalPostHref);
              }}
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
      ) : reverbImprint && post.reverbText ? (
        <div className="mt-2">
          <QuotePressCard
            text={post.reverbText}
            config={reverbImprint}
            withMentions
            compact
            creatorSlug={post.reverbOwnerSlug}
          />
        </div>
      ) : post.reverbText ? (
        <ImmersiveClampedText
          text={post.reverbText}
          immersive={immersive}
          className="whitespace-pre-wrap text-sm leading-relaxed text-[var(--ph-text,#fff)]/90"
        >
          {post.reverbText}
        </ImmersiveClampedText>
      ) : null}
      {post.reverbVideo && !post.reverbLyricClip ? (
        <div className="mt-2 flex justify-center">
          <WallClipPlayer
            clip={post.reverbVideo}
            poster={post.reverbImageUrl}
            className={immersive ? 'max-h-[min(38dvh,25rem)]' : undefined}
            active={immersive ? mediaActive : undefined}
          />
        </div>
      ) : post.reverbImageUrl && !post.reverbLyricClip ? (
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
      <FieldsLinkPreview
        embedUrl={post.reverbEmbedUrl}
        text={post.reverbText}
        referralPostId={post.id}
        viewportBounded={immersive}
        className="mt-2"
      />
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
      !post.reverbVideo &&
      !post.reverbEmbedUrl &&
      !post.reverbVoice &&
      !post.reverbLyricClip &&
      !post.reverbPoll ? (
        <p className="text-xs italic text-[var(--ph-muted,rgba(255,255,255,0.5))]">Original post</p>
      ) : null}
    </div>
  );
}

export function PostCard({ post, showAuthor = false, viewerSlug, onDeleted, onReverbed, immersive = false, mediaActive }: PostCardProps) {
  const showInlineAuthor = showAuthor && !immersive;
  const resolvedImageUrl = usePostImageUrl(post.imageUrl, post.imageStoragePath);
  const { user, loading: authLoading } = useAuth();
  const { summary } = useGamification();
  const isPro = isProOrTrial(user);
  const { toast } = useToast();
  const articleRef = useRef<HTMLElement>(null);
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [commentCount, setCommentCount] = useState(0);
  const [reverbCount, setReverbCount] = useState(0);
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
  const [viewerReverbPost, setViewerReverbPost] = useState<ProfilePost | null>(null);
  const [reverbVoice, setReverbVoice] = useState<RecordedVoiceClip | null>(null);
  const [reverbImage, setReverbImage] = useState<PendingPostImage | null>(null);
  const [reverbClip, setReverbClip] = useState<PendingWallClip | null>(null);
  const [reverbPollOpen, setReverbPollOpen] = useState(false);
  const [reverbPollOptions, setReverbPollOptions] = useState(['', '']);
  const [reverbPollVisibility, setReverbPollVisibility] =
    useState<PostPollResultsVisibility>('after_vote');
  const reverbQuoteRef = useRef<HTMLTextAreaElement | null>(null);
  const [imprintRoot, setImprintRoot] = useState<HTMLDivElement | null>(null);
  const [imprintSaveCount, setImprintSaveCount] = useState(post.imprintSaveCount || 0);
  const insertReverbEmoji = useEmojiInserter(reverbQuote, setReverbQuote, reverbQuoteRef);
  const {
    imprintOn: reverbImprintOn,
    setImprintOn: setReverbImprintOn,
    toggleImprint: toggleReverbImprint,
    resetImprint: resetReverbImprint,
    imprintFaders: reverbImprintFaders,
    setImprintFaders: setReverbImprintFaders,
    imprintSlots: reverbImprintSlots,
    slotBusy: reverbImprintSlotBusy,
    activeImprintConfig: reverbActiveImprintConfig,
    persistImprintSlots: persistReverbImprintSlots,
    imprintPayload: reverbImprintPayload,
  } = useImprintComposer(reverbQuote, isPro, summary.quotePressSlots);
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
  } = useLiveArtistHomeSlug(
    showInlineAuthor ? post.ownerId : undefined,
    showInlineAuthor ? post.ownerSlug : undefined
  );

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
    if (authLoading) return;
    let cancelled = false;
    void Promise.all([
      fetchLikeCount(post.id),
      fetchHasLiked(post.id),
      fetchCommentCount(post.id),
      fetchReverbCount(rootIdForReverb),
    ])
      .then(([count, hasLiked, replies, reverbs]) => {
        if (cancelled || loveBusyRef.current) return;
        setLikeCount(count);
        setLiked(hasLiked);
        setCommentCount(replies);
        setReverbCount(reverbs);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [post.id, rootIdForReverb, user?.id, authLoading]);

  useEffect(() => {
    setImprintSaveCount(post.imprintSaveCount || 0);
  }, [post.imprintSaveCount]);

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
      setViewerReverbPost(reverbPost);
      setViewerReverbQuote(reverbPost?.text || '');
    }).catch(() => undefined);
  }, [canReverb, rootIdForReverb]);

  const viewerHasQuoteContent = Boolean(
    viewerReverbQuote.trim() ||
      viewerReverbPost?.voice ||
      viewerReverbPost?.imageUrl ||
      viewerReverbPost?.video ||
      viewerReverbPost?.poll ||
      viewerReverbPost?.quotePress
  );
  const reverbPollReady =
    !reverbPollOpen ||
    (Boolean(reverbQuote.trim()) && reverbPollOptions.every((option) => option.trim()));
  const reverbImprintReady = !reverbImprintOn || Boolean(reverbQuote.trim());
  const reverbComposerReady =
    reverbPollReady &&
    reverbImprintReady &&
    Boolean(
      reverbQuote.trim() ||
        reverbVoice ||
        reverbImage ||
        reverbClip ||
        reverbPollOpen ||
        reverbImprintOn
    );

  const resetReverbComposer = () => {
    setReverbQuote('');
    setReverbVoice(null);
    revokePostImagePreview(reverbImage);
    setReverbImage(null);
    revokeWallClipPreview(reverbClip);
    setReverbClip(null);
    setReverbPollOpen(false);
    setReverbPollOptions(['', '']);
    setReverbPollVisibility('after_vote');
    resetReverbImprint();
  };

  const openReverbComposer = () => {
    setReverbQuote(viewerReverbQuote);
    setReverbVoice(null);
    revokePostImagePreview(reverbImage);
    setReverbImage(null);
    revokeWallClipPreview(reverbClip);
    setReverbClip(null);
    if (viewerReverbPost?.poll) {
      setReverbPollOpen(true);
      setReverbPollOptions(viewerReverbPost.poll.options.map((option) => option.label));
      setReverbPollVisibility(viewerReverbPost.poll.resultsVisibility);
    } else {
      setReverbPollOpen(false);
      setReverbPollOptions(['', '']);
      setReverbPollVisibility('after_vote');
    }
    if (viewerReverbPost?.quotePress) {
      setReverbImprintOn(true);
      setReverbImprintFaders(viewerReverbPost.quotePress.faders);
    } else {
      resetReverbImprint();
    }
    setReverbComposerOpen(true);
  };

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
    if (!showInlineAuthor) {
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
  }, [showInlineAuthor, liveAuthorSlug, post.ownerAvatarUrl, post.ownerStarMarkUseStar, post.ownerStarMarkSeed, post.ownerStudioBadge]);

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
        const result = await likePost(post.id, {
          name: user.displayName || 'Artist',
          slug: viewerSlug,
        });
        if (!result.created) {
          setLiked(true);
          setLikeCount((c) => Math.max(0, c - 1));
        }
      } else await unlikePost(post.id);
    } catch {
      setLiked(!next);
      setLikeCount((c) => Math.max(0, c + (next ? -1 : 1)));
    } finally {
      loveBusyRef.current = false;
    }
  };

  const handleReverb = async (composer?: ReverbComposerOptions) => {
    if (!user) {
      toast({ title: 'Sign in to Reverb' });
      return;
    }
    setBusy(true);
    try {
      const result = await toggleReverb(
        post,
        {
          name: user.displayName || 'Artist',
          slug: viewerSlug,
        },
        composer
      );
      setReverbed(result.status !== 'removed');
      if (result.status === 'removed') {
        setViewerReverbQuote('');
        setViewerReverbPost(null);
        setReverbCount((c) => Math.max(0, c - 1));
      } else if (result.status === 'created') {
        setReverbCount((c) => c + 1);
      } else if (result.post) {
        setViewerReverbPost(result.post);
        setViewerReverbQuote(result.post.text || '');
      }
      setReverbComposerOpen(false);
      resetReverbComposer();
      const quoted = Boolean(
        composer &&
          (composer.quote?.trim() ||
            composer.voice ||
            composer.image ||
            composer.video ||
            composer.poll ||
            composer.quotePress)
      );
      toast({
        title: result.status === 'created'
          ? quoted ? 'Quote Reverb live' : 'Reverb live'
          : result.status === 'updated' ? 'Quote Reverb updated' : 'Reverb removed',
        description:
          result.status === 'created' || result.status === 'updated'
            ? 'This post now echoes on your wall and Reverbs page.'
            : 'Taken off your Reverbs.',
      });
      if ((result.status === 'created' || result.status === 'updated') && result.post) {
        onReverbed?.(result.post);
      }
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

  const submitReverbComposer = () => {
    if (!reverbComposerReady) return;
    void handleReverb({
      quote: reverbQuote,
      ...(reverbVoice ? { voice: reverbVoice } : {}),
      ...(reverbImage ? { image: reverbImage } : {}),
      ...(reverbClip ? { video: reverbClip } : {}),
      ...(reverbPollOpen
        ? { poll: { options: reverbPollOptions, resultsVisibility: reverbPollVisibility } }
        : {}),
      ...(viewerReverbPost?.poll && !reverbPollOpen ? { clearPoll: true } : {}),
      ...reverbImprintPayload,
      ...(viewerReverbPost?.quotePress && !reverbImprintOn ? { clearQuotePress: true } : {}),
    });
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
          {showInlineAuthor && (
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
            href={publicScenePostHref(post.id)}
            prefetch={false}
            className="mt-1 inline-flex whitespace-nowrap text-[10px] uppercase tracking-widest text-[var(--ph-muted,rgba(255,255,255,0.55))] hover:text-[var(--ph-text,#fff)] hover:underline"
            aria-label="Open public Scene post"
          >
            {timeAgo(post.createdAt)}
            <span className="sr-only"> · Public Scene post</span>
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
      ) : post.quotePress && post.text ? (
        <div className="mt-3">
          <QuotePressCard
            ref={setImprintRoot}
            text={post.text}
            config={post.quotePress}
            withMentions
            creatorSlug={post.ownerSlug}
          />
          <div className="mt-1 flex items-center justify-end gap-1">
            <ImprintExportMenu
              captureRoot={imprintRoot}
              text={post.text}
              post={{ ...post, imprintSaveCount }}
              isAdmin={isAdmin}
              onSaveCountChange={setImprintSaveCount}
            />
          </div>
        </div>
      ) : post.text ? (
        <ImmersiveClampedText
          text={post.text}
          immersive={immersive}
          className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-[var(--ph-text,#fff)]"
        >
          <MentionText text={post.text} />
        </ImmersiveClampedText>
      ) : null}

      {post.poll ? <PostPollCard postId={post.id} poll={post.poll} /> : null}

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

      {post.video ? (
        <div className="mt-3 mb-1 flex justify-center overflow-visible">
          <WallClipPlayer
            clip={post.video}
            poster={resolvedImageUrl}
            className={immersive ? 'max-h-[min(42dvh,28rem)]' : undefined}
            active={immersive ? mediaActive : undefined}
          />
        </div>
      ) : resolvedImageUrl ? (
        <div className="mt-3 mb-1 flex justify-center overflow-visible">
          <ExpandableImage
            src={resolvedImageUrl}
            alt={post.isReverb ? 'Reverb quote photo' : 'Posted photo'}
            thumbClassName={cn(
              'block h-auto rounded-xl object-contain shadow-[0_8px_28px_rgba(0,0,0,0.45)]',
              !post.isReverb && isStudioGoalShare(post.text)
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
      ) : null}

      {post.isReverb ? <ReverbSourceBody post={post} immersive={immersive} mediaActive={mediaActive} /> : null}

      {!post.isReverb ? (
        <FieldsLinkPreview
          embedUrl={post.embedUrl}
          text={post.text}
          referralPostId={post.id}
          viewportBounded={immersive}
          className="mt-3"
        />
      ) : null}

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
        {canReverb ? (
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
            {reverbCount > 0 ? reverbCount : reverbed ? 'Reverbed' : 'Reverb'}
          </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="min-w-44 border-violet-400/25">
            <DropdownMenuItem onSelect={() => void handleReverb()}>{reverbed ? 'Undo Reverb' : 'Reverb'}</DropdownMenuItem>
            <DropdownMenuItem onSelect={openReverbComposer}>{viewerHasQuoteContent ? 'Edit Quote' : 'Quote'}</DropdownMenuItem>
          </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <span
            className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-violet-300/75"
            title={
              reverbCount > 0
                ? `${reverbCount} Reverb${reverbCount === 1 ? '' : 's'}`
                : 'Reverbs on this post'
            }
          >
            <Repeat2 className="h-3.5 w-3.5" />
            {reverbCount > 0 ? reverbCount : 'Reverb'}
          </span>
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
                {likeCount + commentCount + reverbCount > 0
                  ? ` · ${likeCount} love${likeCount === 1 ? '' : 's'} · ${commentCount} ${commentCount === 1 ? 'reply' : 'replies'}${reverbCount > 0 ? ` · ${reverbCount} Reverb${reverbCount === 1 ? '' : 's'}` : ''}`
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
              {likeCount + commentCount + reverbCount > 0 ? (
                <span className="inline-flex items-center gap-1">
                  <Users className="h-3 w-3" />
                  {compactReachCount(likeCount + commentCount + reverbCount)}
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
          if (!open) resetReverbComposer();
        }}
      >
        <DialogContent className="border-violet-400/25 sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-headline text-xl uppercase">
              <Repeat2 className="h-5 w-5 text-violet-300" /> {viewerHasQuoteContent ? 'Edit Quote Reverb' : 'Reverb this post'}
            </DialogTitle>
            <DialogDescription>
              Add your thought, voice, photo, poll, or Imprint above the original, then pass both to your wall.
            </DialogDescription>
          </DialogHeader>
          <div className="relative space-y-3">
            <MentionField value={reverbQuote} onChange={setReverbQuote} excludeUserId={user?.id}>
              <Textarea
                ref={reverbQuoteRef}
                value={reverbQuote}
                onChange={(event) => setReverbQuote(event.target.value.slice(0, 1000))}
                onPaste={(event) => {
                  void attachPastedImage(event, {
                    disabled: busy,
                    image: reverbImage,
                    onImageChange: setReverbImage,
                    clip: reverbClip,
                    onClipChange: setReverbClip,
                    onError: (message) =>
                      toast({
                        variant: 'destructive',
                        title: 'Could not attach photo',
                        description: message,
                      }),
                  });
                }}
                placeholder={
                  reverbVoice || reverbImage || reverbClip || reverbPollOpen || reverbImprintOn
                    ? 'Add a caption (optional)…'
                    : 'Add your quote… or paste a link or photo'
                }
                rows={4}
                maxLength={1000}
                className="resize-none border-violet-400/20 bg-black/30"
                autoFocus
              />
            </MentionField>
            {reverbImprintOn && reverbQuote.trim() ? (
              <div className="space-y-2">
                <QuotePressCard text={reverbQuote} config={reverbActiveImprintConfig} withMentions />
                <QuotePressComposerPanel
                  faders={reverbActiveImprintConfig.faders}
                  onFadersChange={(next) => {
                    if (!isPro) return;
                    setReverbImprintFaders(next);
                  }}
                  slots={reverbImprintSlots}
                  isPro={isPro}
                  busy={busy || reverbImprintSlotBusy}
                  onLockSlot={() => {
                    if (!isPro) return;
                    const label = quotePressSlotLabel(reverbImprintFaders);
                    void persistReverbImprintSlots([
                      ...reverbImprintSlots,
                      {
                        id: `qp-${Date.now()}`,
                        faders: { ...reverbImprintFaders },
                        lockedAt: new Date().toISOString(),
                        label,
                      },
                    ]);
                  }}
                  onLoadSlot={(slot) => {
                    if (!isPro) return;
                    setReverbImprintFaders(slot.faders);
                  }}
                  onClearSlot={(slotId) => {
                    void persistReverbImprintSlots(reverbImprintSlots.filter((s) => s.id !== slotId));
                  }}
                />
              </div>
            ) : null}
            {reverbPollOpen ? (
              <PollComposerFields
                options={reverbPollOptions}
                onOptionsChange={setReverbPollOptions}
                resultsVisibility={reverbPollVisibility}
                onResultsVisibilityChange={setReverbPollVisibility}
                onRemovePoll={() => {
                  setReverbPollOpen(false);
                  setReverbPollOptions(['', '']);
                  setReverbPollVisibility('after_vote');
                }}
                disabled={busy}
              />
            ) : null}
            <div className="flex min-w-0 items-center gap-1 overflow-x-auto">
              <div className={cn('shrink-0', reverbVoice && 'min-w-0 max-w-full basis-full sm:basis-auto')}>
                <VoiceNoteComposer clip={reverbVoice} onClipChange={setReverbVoice} disabled={busy} compact />
              </div>
              <div className="shrink-0">
                <ImageAttachComposer
                  image={reverbImage}
                  onImageChange={setReverbImage}
                  clip={reverbClip}
                  onClipChange={setReverbClip}
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
              <EmojiPickerButton compact disabled={busy} onInsert={insertReverbEmoji} />
              <button
                type="button"
                onClick={() => setReverbPollOpen((value) => !value)}
                disabled={busy}
                className={cn(
                  'inline-flex shrink-0 items-center gap-1 whitespace-nowrap font-code text-[9px] font-bold uppercase tracking-wider transition-colors',
                  reverbPollOpen ? 'text-cyan-300' : 'text-muted-foreground/70 hover:text-cyan-300'
                )}
              >
                <BarChart3 className="h-3.5 w-3.5" /> Poll
              </button>
              <button
                type="button"
                onClick={toggleReverbImprint}
                disabled={busy}
                className={cn(
                  'inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-md border px-1.5 py-1 font-code text-[9px] font-bold uppercase tracking-wider transition-all',
                  reverbImprintOn
                    ? 'border-cyan-400/55 bg-cyan-500/20 text-cyan-100 shadow-[0_0_14px_rgba(34,211,238,0.28)]'
                    : 'border-transparent text-muted-foreground/70 hover:border-cyan-500/35 hover:bg-cyan-500/10 hover:text-cyan-300'
                )}
              >
                <Sparkles
                  className={cn('h-3.5 w-3.5', reverbImprintOn ? 'text-cyan-200' : 'text-cyan-400/80')}
                />
                Imprint
              </button>
            </div>
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
              disabled={busy || !reverbComposerReady}
              onClick={submitReverbComposer}
              className="gap-1.5 bg-violet-500 font-bold uppercase text-white hover:bg-violet-400"
            >
              <MessageCircle className="h-3.5 w-3.5" /> {viewerHasQuoteContent ? 'Save Quote' : 'Quote + Reverb'}
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
