'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { BarChart3, Check, Copy, Heart, MessageCircle, Repeat2, Share2, Sparkles } from 'lucide-react';
import { PostCommentThread } from '@/components/profile/post-comment-thread';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { useGamification } from '@/context/gamification-context';
import {
  createPost,
  fetchDropReverbWallPostId,
  recordDropReverb,
  undoDropReverb,
} from '@/lib/profile/social-client';
import { profileHref } from '@/lib/profile/profile-slug';
import { ToastAction } from '@/components/ui/toast';
import { buildLoginUrl } from '@/lib/login-links';
import { formatDropPulseLine } from '@/lib/drop-pulse';
import {
  fetchDropCommentCount,
  fetchDropComments,
  fetchDropLoveCount,
  fetchDropLoved,
  likeDrop,
  unlikeDrop,
} from '@/lib/drop-social-client';
import type { PostComment } from '@/lib/profile/social-client';
import { cn } from '@/lib/utils';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { MentionField } from '@/components/profile/mention-suggestions';
import { VoiceNoteComposer } from '@/components/profile/voice-note-composer';
import { ImageAttachComposer, attachPastedImage } from '@/components/profile/image-attach-composer';
import { EmojiPickerButton, useEmojiInserter } from '@/components/ui/emoji-picker-button';
import { PollComposerFields } from '@/components/profile/poll-composer-fields';
import { QuotePressCard } from '@/components/profile/quote-press-card';
import { QuotePressComposerPanel } from '@/components/profile/quote-press-composer-panel';
import { useImprintComposer } from '@/hooks/use-imprint-composer';
import { isProOrTrial } from '@/lib/subscription';
import { quotePressSlotLabel } from '@/lib/profile/quote-press';
import { revokePostImagePreview, type PendingPostImage } from '@/lib/profile/post-images';
import { revokeWallClipPreview, type PendingWallClip } from '@/lib/profile/wall-clips';
import type { RecordedVoiceClip } from '@/lib/profile/voice-notes';
import type { PostPollResultsVisibility } from '@/lib/profile/post-polls';
import { dropPromotePath } from '@/lib/pressed-song';

type DropSocialPanelProps = {
  shareId: string;
  title: string;
  ownerId: string;
  playCount?: number;
  previewCount?: number;
  purchaseCount?: number;
  firstBuyerName?: string;
  hasAudio?: boolean;
  isAlbum?: boolean;
  /** Album-release share id + vault track id when promoting one song from an album. */
  trackId?: string;
  ownerName?: string;
  ownerSlug?: string;
  albumTitle?: string;
  albumShareId?: string;
};

export function DropSocialPanel({
  shareId,
  title,
  ownerId,
  playCount,
  previewCount,
  purchaseCount,
  firstBuyerName,
  hasAudio = true,
  isAlbum = false,
  trackId,
  ownerName,
  albumTitle,
  albumShareId,
}: DropSocialPanelProps) {
  const { user } = useAuth();
  const { summary } = useGamification();
  const { toast } = useToast();
  const router = useRouter();
  const isPro = isProOrTrial(user);
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [commentCount, setCommentCount] = useState(0);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [comments, setComments] = useState<PostComment[]>([]);
  const [commentsLoaded, setCommentsLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [walled, setWalled] = useState(false);
  const [reverbPostId, setReverbPostId] = useState<string | null>(null);
  const [quoteOpen, setQuoteOpen] = useState(false);
  const [quoteText, setQuoteText] = useState('');
  const [quoteVoice, setQuoteVoice] = useState<RecordedVoiceClip | null>(null);
  const [quoteImage, setQuoteImage] = useState<PendingPostImage | null>(null);
  const [quoteClip, setQuoteClip] = useState<PendingWallClip | null>(null);
  const [quotePollOpen, setQuotePollOpen] = useState(false);
  const [quotePollOptions, setQuotePollOptions] = useState(['', '']);
  const [quotePollVisibility, setQuotePollVisibility] = useState<PostPollResultsVisibility>('after_vote');
  const quoteTextRef = useRef<HTMLTextAreaElement | null>(null);
  const insertQuoteEmoji = useEmojiInserter(quoteText, setQuoteText, quoteTextRef);
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
  } = useImprintComposer(quoteText, isPro, summary.quotePressSlots);

  const pulse = formatDropPulseLine({ playCount, previewCount, purchaseCount, loveCount: likeCount });
  const dropPath = dropPromotePath({ shareId, isAlbum, hasAudio, trackId });
  const dropUrl = typeof window !== 'undefined' ? `${window.location.origin}${dropPath}` : dropPath;
  const quotePollReady =
    !quotePollOpen ||
    (Boolean(quoteText.trim()) && quotePollOptions.every((option) => option.trim()));
  const quoteComposerReady =
    quotePollReady &&
    Boolean(quoteText.trim() || quoteVoice || quoteImage || quoteClip || quotePollOpen || imprintOn);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const [count, loved, replies] = await Promise.all([
        fetchDropLoveCount(shareId),
        fetchDropLoved(shareId),
        fetchDropCommentCount(shareId),
      ]);
      if (cancelled) return;
      setLikeCount(count);
      setLiked(loved);
      setCommentCount(replies);
    })();
    return () => {
      cancelled = true;
    };
  }, [shareId, user?.id]);

  useEffect(() => {
    if (!user?.id) {
      setWalled(false);
      setReverbPostId(null);
      return;
    }
    let cancelled = false;
    void fetchDropReverbWallPostId(shareId).then((postId) => {
      if (cancelled) return;
      setReverbPostId(postId);
      setWalled(Boolean(postId));
    });
    return () => {
      cancelled = true;
    };
  }, [shareId, user?.id]);

  const needAuth = () => {
    router.push(buildLoginUrl({ next: dropPath }));
  };

  const toggleLike = async () => {
    if (!user) {
      needAuth();
      return;
    }
    if (user.id === ownerId) {
      toast({ title: 'That\'s your drop', description: 'Fans love it — you already made it.' });
      return;
    }
    try {
      if (liked) {
        await unlikeDrop(shareId);
        setLiked(false);
        setLikeCount((n) => Math.max(0, n - 1));
      } else {
        await likeDrop(shareId, { name: user.displayName, slug: summary.profileSlug });
        setLiked(true);
        setLikeCount((n) => n + 1);
      }
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Could not love this drop',
        description: err instanceof Error ? err.message : undefined,
      });
    }
  };

  const openComments = async () => {
    setCommentsOpen((v) => !v);
    if (commentsLoaded) return;
    const list = await fetchDropComments(shareId);
    setComments(list);
    setCommentsLoaded(true);
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(dropUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
      toast({ title: 'Link copied', description: 'Send the release.' });
    } catch {
      toast({ variant: 'destructive', title: 'Could not copy link' });
    }
  };

  const nativeShare = async () => {
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({ title: `${title} · Release`, url: dropUrl });
        return;
      } catch {
        /* fall through to copy */
      }
    }
    await copyLink();
  };

  const resetQuoteComposer = () => {
    setQuoteText('');
    setQuoteVoice(null);
    revokePostImagePreview(quoteImage);
    setQuoteImage(null);
    revokeWallClipPreview(quoteClip);
    setQuoteClip(null);
    setQuotePollOpen(false);
    setQuotePollOptions(['', '']);
    setQuotePollVisibility('after_vote');
    resetImprint();
  };

  const showReverbToast = (quoted: boolean, postId: string) => {
    const href = profileHref(summary.profileSlug, `post-${postId}`);
    toast({
      title: quoted ? 'Quote Reverb posted' : 'Reverbed',
      action: href ? (
        <ToastAction altText="View on Scene" onClick={() => router.push(href)}>
          View on Scene
        </ToastAction>
      ) : undefined,
    });
  };

  const toggleReverb = async () => {
    if (!user) {
      needAuth();
      return;
    }
    setBusy(true);
    try {
      if (walled && reverbPostId) {
        await undoDropReverb(shareId);
        setWalled(false);
        setReverbPostId(null);
        toast({ title: 'Reverb removed' });
        return;
      }
      const kindLabel = isAlbum ? 'Album' : hasAudio ? 'Song' : 'Lyrics DNA Drop';
      const post = await createPost({
        text: [
          `${kindLabel} · ${title}`,
          ownerName ? `Original · ${ownerName}` : '',
          albumTitle ? `Album · ${albumTitle}` : '',
        ].filter(Boolean).join('\n'),
        embedUrl: dropPath,
        sourceKind: isAlbum || hasAudio ? 'song' : 'dna',
        ownerName: user.displayName || 'Artist',
        ownerSlug: summary.profileSlug,
        ...(albumShareId ? { albumShareId } : {}),
        ...(albumTitle ? { albumTitle } : {}),
      });
      await recordDropReverb(shareId, post.id);
      setWalled(true);
      setReverbPostId(post.id);
      showReverbToast(false, post.id);
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Could not Reverb',
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setBusy(false);
    }
  };

  const postQuoteReverb = async () => {
    if (!user) {
      needAuth();
      return;
    }
    if (walled) return;
    if (!quoteComposerReady) return;
    setBusy(true);
    try {
      const kindLabel = isAlbum ? 'Album' : hasAudio ? 'Song' : 'Lyrics DNA Drop';
      const post = await createPost({
        text: [
          quoteText.trim(),
          `${kindLabel} · ${title}`,
          ownerName ? `Original · ${ownerName}` : '',
          albumTitle ? `Album · ${albumTitle}` : '',
        ].filter(Boolean).join('\n'),
        embedUrl: dropPath,
        sourceKind: isAlbum || hasAudio ? 'song' : 'dna',
        ownerName: user.displayName || 'Artist',
        ownerSlug: summary.profileSlug,
        ...(albumShareId ? { albumShareId } : {}),
        ...(albumTitle ? { albumTitle } : {}),
        ...(quoteVoice ? { voice: quoteVoice } : {}),
        ...(quoteImage ? { image: quoteImage } : {}),
        ...(quoteClip ? { video: quoteClip } : {}),
        ...(quotePollOpen
          ? { poll: { options: quotePollOptions, resultsVisibility: quotePollVisibility } }
          : {}),
        ...imprintPayload,
      });
      await recordDropReverb(shareId, post.id);
      setWalled(true);
      setReverbPostId(post.id);
      setQuoteOpen(false);
      resetQuoteComposer();
      showReverbToast(true, post.id);
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Could not post',
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-xl border border-fuchsia-500/25 bg-fuchsia-500/[0.06] p-4 space-y-3">
      {(pulse || firstBuyerName) && (
        <p className="font-code text-[9px] font-bold uppercase tracking-[0.22em] text-fuchsia-300/90">
          {pulse || 'Release'}
          {firstBuyerName ? ` · first cop ${firstBuyerName}` : ''}
        </p>
      )}
      <div className="flex flex-wrap items-center gap-4">
        <button
          type="button"
          onClick={() => void toggleLike()}
          className={cn(
            'flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest transition-colors',
            liked ? 'text-accent' : 'text-muted-foreground hover:text-foreground'
          )}
        >
          <Heart className={cn('h-3.5 w-3.5', liked && 'fill-current')} />
          {likeCount > 0 ? likeCount : 'Love'}
        </button>
        <button
          type="button"
          onClick={() => void openComments()}
          className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-muted-foreground hover:text-foreground"
        >
          <MessageCircle className="h-3.5 w-3.5" />
          {commentCount > 0 ? commentCount : 'Reply'}
        </button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              disabled={busy}
              className={cn(
                'flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest transition-colors',
                walled ? 'text-violet-300' : 'text-muted-foreground hover:text-violet-300'
              )}
              title="Reverb — pass this onto your wall"
            >
              <Repeat2 className={cn('h-3.5 w-3.5', walled && 'stroke-[2.5]')} />
              {walled ? 'Reverbed' : 'Reverb'}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="min-w-44 border-violet-400/25">
            <DropdownMenuItem disabled={busy} onSelect={() => void toggleReverb()}>
              {walled ? 'Undo Reverb' : 'Reverb'}
            </DropdownMenuItem>
            {!walled ? (
              <DropdownMenuItem disabled={busy} onSelect={() => setQuoteOpen(true)}>
                Quote
              </DropdownMenuItem>
            ) : null}
          </DropdownMenuContent>
        </DropdownMenu>
        <button
          type="button"
          onClick={() => void nativeShare()}
          className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-muted-foreground hover:text-foreground"
        >
          {copied ? <Check className="h-3.5 w-3.5" /> : <Share2 className="h-3.5 w-3.5" />}
          Share
        </button>
        <button
          type="button"
          onClick={() => void copyLink()}
          className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-muted-foreground hover:text-foreground"
        >
          <Copy className="h-3.5 w-3.5" />
          Copy
        </button>
      </div>

      {commentsOpen && (
        <PostCommentThread
          shareId={shareId}
          comments={comments}
          commentsLoaded={commentsLoaded}
          commentCount={commentCount}
          onCommentsChange={setComments}
          onCommentCountChange={setCommentCount}
          user={user}
          viewerSlug={summary.profileSlug}
          isOwner={user?.id === ownerId}
        />
      )}
      <Dialog
        open={quoteOpen}
        onOpenChange={(open) => {
          if (busy) return;
          setQuoteOpen(open);
          if (!open) resetQuoteComposer();
        }}
      >
        <DialogContent className="border-violet-400/25 sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-headline text-xl uppercase">
              <Repeat2 className="h-5 w-5 text-violet-300" /> Quote Reverb
            </DialogTitle>
            <DialogDescription>
              Add your thought, voice, photo, poll, or Imprint above the original, then pass both to your wall.
            </DialogDescription>
          </DialogHeader>
          <div className="relative space-y-3">
            <MentionField value={quoteText} onChange={setQuoteText} excludeUserId={user?.id}>
              <Textarea
                ref={quoteTextRef}
                value={quoteText}
                onChange={(event) => setQuoteText(event.target.value.slice(0, 1000))}
                onPaste={(event) => {
                  void attachPastedImage(event, {
                    disabled: busy,
                    image: quoteImage,
                    onImageChange: setQuoteImage,
                    clip: quoteClip,
                    onClipChange: setQuoteClip,
                    onError: (message) =>
                      toast({
                        variant: 'destructive',
                        title: 'Could not attach photo',
                        description: message,
                      }),
                  });
                }}
                placeholder={
                  quoteVoice || quoteImage || quoteClip || quotePollOpen || imprintOn
                    ? 'Add a caption (optional)…'
                    : 'Add your quote… or paste a link or photo'
                }
                rows={4}
                maxLength={1000}
                className="resize-none border-violet-400/20 bg-black/30"
                autoFocus
              />
            </MentionField>
            {imprintOn && quoteText.trim() ? (
              <div className="space-y-2">
                <QuotePressCard text={quoteText} config={activeImprintConfig} withMentions />
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
            {quotePollOpen ? (
              <PollComposerFields
                options={quotePollOptions}
                onOptionsChange={setQuotePollOptions}
                resultsVisibility={quotePollVisibility}
                onResultsVisibilityChange={setQuotePollVisibility}
                onRemovePoll={() => {
                  setQuotePollOpen(false);
                  setQuotePollOptions(['', '']);
                  setQuotePollVisibility('after_vote');
                }}
                disabled={busy}
              />
            ) : null}
            <div className="flex min-w-0 flex-wrap items-center gap-1">
              <div className={cn('shrink-0', quoteVoice && 'min-w-0 max-w-full basis-full sm:basis-auto')}>
                <VoiceNoteComposer clip={quoteVoice} onClipChange={setQuoteVoice} disabled={busy} compact />
              </div>
              <div className="shrink-0">
                <ImageAttachComposer
                  image={quoteImage}
                  onImageChange={setQuoteImage}
                  clip={quoteClip}
                  onClipChange={setQuoteClip}
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
              <EmojiPickerButton compact disabled={busy} onInsert={insertQuoteEmoji} />
              <button
                type="button"
                onClick={() => setQuotePollOpen((value) => !value)}
                disabled={busy}
                className={cn(
                  'inline-flex shrink-0 items-center gap-1 whitespace-nowrap font-code text-[9px] font-bold uppercase tracking-wider transition-colors',
                  quotePollOpen ? 'text-cyan-300' : 'text-muted-foreground/70 hover:text-cyan-300'
                )}
              >
                <BarChart3 className="h-3.5 w-3.5" /> Poll
              </button>
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
            </div>
            <p className="text-xs text-muted-foreground">Original · {ownerName || 'Artist'} · {title}</p>
          </div>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={busy}
              onClick={() => setQuoteOpen(false)}
              className="font-bold uppercase"
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={busy || !quoteComposerReady}
              onClick={() => void postQuoteReverb()}
              className="gap-1.5 bg-violet-500 font-bold uppercase text-white hover:bg-violet-400"
            >
              <MessageCircle className="h-3.5 w-3.5" /> Quote + Reverb
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
