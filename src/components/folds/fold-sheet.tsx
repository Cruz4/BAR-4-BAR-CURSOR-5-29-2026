'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, BarChart3, CornerUpLeft, Loader2, MoreHorizontal, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { StudioLoader } from '@/components/studio-loader';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { useGamification } from '@/context/gamification-context';
import { useArtistHomeEngagementGate } from '@/context/artist-home-engagement-context';
import { cn } from '@/lib/utils';
import { EmojiPickerButton, useEmojiInserter } from '@/components/ui/emoji-picker-button';
import { useLiveArtistHomeSlug } from '@/components/profile/artist-home-link';
import {
  acceptFoldClient,
  deleteFoldFromInboxClient,
  declineFoldClient,
  foldBackClient,
  markFoldReadClient,
  passBarClient,
  subscribeFoldBars,
  subscribeFoldDoc,
  subscribePeerPresence,
  writeFoldPresence,
} from '@/lib/folds/client';
import {
  FOLD_BAR_MAX_CHARS,
  peerIdOf,
  unreadFor,
  type FoldBar,
  type FoldBarReply,
  type FoldDoc,
  type FoldPresence,
} from '@/lib/folds/types';
import { foldBarPreviewText, foldImageStoragePath, foldVoiceStoragePath } from '@/lib/folds/attachments';
import { outgoingReadStatus } from '@/lib/folds/read-receipts';
import { foldMessageTimestamp, isSameMessageDay } from '@/lib/folds/message-dates';
import { FoldDateSeparator } from '@/components/folds/fold-date-separator';
import { FoldReadReceipt } from '@/components/folds/fold-read-receipt';
import { FoldPollCard } from '@/components/folds/fold-poll-card';
import { FoldReactions } from '@/components/folds/fold-reactions';
import { InboxPageAtmosphere } from '@/components/inbox/inbox-page-atmosphere';
import { MentionText } from '@/components/profile/mention-text';
import { ExpandableMedia } from '@/components/profile/expandable-image';
import { VoiceNotePlayer } from '@/components/profile/voice-note-player';
import { VoiceNoteComposer } from '@/components/profile/voice-note-composer';
import { ImageAttachComposer } from '@/components/profile/image-attach-composer';
import { PollComposerFields } from '@/components/profile/poll-composer-fields';
import { QuotePressCard } from '@/components/profile/quote-press-card';
import { QuotePressComposerPanel } from '@/components/profile/quote-press-composer-panel';
import { useImprintComposer } from '@/hooks/use-imprint-composer';
import { isProOrTrial } from '@/lib/subscription';
import { quotePressSlotLabel } from '@/lib/profile/quote-press';
import {
  extForVoiceType,
  revokeVoiceObjectUrl,
  uploadVoiceClip,
  type RecordedVoiceClip,
} from '@/lib/profile/voice-notes';
import {
  POST_POLL_MIN_OPTIONS,
  type PostPollResultsVisibility,
} from '@/lib/profile/post-polls';
import {
  revokePostImagePreview,
  uploadPostImage,
  type PendingPostImage,
} from '@/lib/profile/post-images';

function BarStanza({
  bar,
  mine,
  peerName,
  foldId,
  viewerId,
  onAnswer,
  readStatus,
  timestamp,
}: {
  bar: FoldBar;
  mine: boolean;
  peerName: string;
  foldId: string;
  viewerId: string;
  onAnswer: (bar: FoldBar) => void;
  readStatus?: import('@/lib/folds/read-receipts').OutgoingReadStatus | null;
  timestamp: string;
}) {
  const senderLabel = mine ? '[you]' : `[${peerName}]`;
  return (
    <div
      className={cn(
        'group relative flex min-w-0 max-w-full animate-in flex-col fade-in slide-in-from-bottom-2 duration-300',
        mine ? 'ml-4 items-end sm:ml-10' : 'mr-4 items-start sm:mr-10'
      )}
    >
      <div className={cn('flex min-w-0 max-w-full items-baseline gap-2', mine ? 'justify-end' : 'justify-start')}>
        <span className="shrink-0 font-code text-[9px] font-bold uppercase tracking-[0.18em] text-amber-200/70">
          {senderLabel}
        </span>
        <span className="shrink-0 font-code text-[9px] text-muted-foreground/80">
          {timestamp}
        </span>
      </div>
      {bar.replyTo ? (
        <p
          className={cn(
            'mt-1 max-w-full break-words font-serif text-[12px] italic text-amber-100/40 [overflow-wrap:anywhere]',
            mine ? 'text-right' : 'text-left'
          )}
        >
          replying to “<MentionText text={bar.replyTo.text} />”
        </p>
      ) : null}
      <div
        className={cn(
          'mt-1 max-w-full min-w-0 rounded-2xl bg-amber-950/25 px-3 py-2 shadow-[inset_0_1px_0_rgba(255,236,210,0.08)]',
          mine ? 'text-right' : 'text-left'
        )}
      >
        {bar.quotePress && bar.text.trim() ? (
          <div className={cn(mine ? 'ml-auto' : 'mr-auto', 'max-w-sm')}>
            <QuotePressCard text={bar.text} config={bar.quotePress} compact withMentions />
          </div>
        ) : bar.text.trim() ? (
          <p className="whitespace-pre-wrap break-words font-serif text-[17px] leading-relaxed text-amber-50 [overflow-wrap:anywhere]">
            <MentionText text={bar.text} />
          </p>
        ) : null}
        {bar.image ? (
          <div className={cn('mt-2 max-w-xs', mine ? 'ml-auto' : 'mr-auto')}>
            <ExpandableMedia src={bar.image.url} alt="Attached photo" className="overflow-hidden rounded-xl" />
          </div>
        ) : null}
        {bar.voice ? (
          <div className={cn('mt-2 max-w-sm', mine ? 'ml-auto' : 'mr-auto')}>
            <VoiceNotePlayer
              src={bar.voice.url}
              contentType={bar.voice.contentType}
              transcript={bar.voice.transcript}
              durationSec={bar.voice.durationSec}
              compact
            />
          </div>
        ) : null}
        {bar.poll ? (
          <FoldPollCard foldId={foldId} barId={bar.id} poll={bar.poll} viewerId={viewerId} />
        ) : null}
      </div>
      <FoldReactions
        foldId={foldId}
        barId={bar.id}
        reactions={bar.reactions}
        viewerId={viewerId}
        mine={mine}
      />
      {!mine ? (
        <button
          type="button"
          onClick={() => onAnswer(bar)}
          className="mt-1 inline-flex items-center gap-1 font-code text-[9px] font-bold uppercase tracking-widest text-amber-200/50 opacity-0 transition-opacity hover:text-amber-100 group-hover:opacity-100"
        >
          <CornerUpLeft className="h-3 w-3" />
          Reply
        </button>
      ) : null}
      {readStatus ? <FoldReadReceipt status={readStatus} /> : null}
    </div>
  );
}

export function FoldSheet({ foldId }: { foldId: string }) {
  const { user } = useAuth();
  const { summary } = useGamification();
  const { toast } = useToast();
  const { ensureEngagement } = useArtistHomeEngagementGate();
  const router = useRouter();
  const [fold, setFold] = useState<FoldDoc | null>(null);
  const [bars, setBars] = useState<FoldBar[]>([]);
  const [localBars, setLocalBars] = useState<FoldBar[]>([]);
  const [presence, setPresence] = useState<FoldPresence | null>(null);
  const [text, setText] = useState('');
  const [replyTo, setReplyTo] = useState<FoldBarReply | undefined>(undefined);
  const [busy, setBusy] = useState(false);
  const [missing, setMissing] = useState(false);
  const [voice, setVoice] = useState<RecordedVoiceClip | null>(null);
  const [image, setImage] = useState<PendingPostImage | null>(null);
  const [pollOpen, setPollOpen] = useState(false);
  const [pollOptions, setPollOptions] = useState(['', '']);
  const [pollVisibility, setPollVisibility] = useState<PostPollResultsVisibility>('after_vote');
  const scrollerRef = useRef<HTMLDivElement>(null);
  const composeRef = useRef<HTMLTextAreaElement>(null);
  const typingTimer = useRef<number | null>(null);
  const typingRef = useRef(false);
  const lastReadBarRef = useRef<string | null>(null);
  const markedOpenRef = useRef(false);
  const isPro = isProOrTrial(user);
  const {
    imprintOn,
    showImprintToggle,
    toggleImprint,
    resetImprint,
    imprintFaders,
    setImprintFaders,
    imprintSlots,
    slotBusy,
    activeImprintConfig,
    persistImprintSlots,
  } = useImprintComposer(text, isPro, summary.quotePressSlots);

  const onType = useCallback((value: string) => {
    setText(value.slice(0, FOLD_BAR_MAX_CHARS));
    const typing = value.trim().length > 0;
    typingRef.current = typing;
    if (typingTimer.current) window.clearTimeout(typingTimer.current);
    void writeFoldPresence(foldId, { viewing: true, typing }).catch(() => undefined);
    typingTimer.current = window.setTimeout(() => {
      typingRef.current = false;
      void writeFoldPresence(foldId, { viewing: true, typing: false }).catch(() => undefined);
    }, 1600);
  }, [foldId]);

  const insertEmoji = useEmojiInserter(text, onType, composeRef);

  const me = user?.id || '';
  const peerId = fold ? peerIdOf(fold.memberIds, me) : '';
  const peer = fold && peerId ? fold.members[peerId] : undefined;
  const { href: peerArtistHomeHref, isLive: peerArtistHomeLive } = useLiveArtistHomeSlug(
    peerId || undefined,
    peer?.slug
  );
  const waitingOnThem = fold?.status === 'pending' && fold.initiatedBy === me;
  const sealedForMe = fold?.status === 'pending' && fold.initiatedBy !== me;
  const inkMoving =
    presence?.typing && presence.at && Date.now() - Date.parse(presence.at) < 6000;
  const pollReady =
    !pollOpen ||
    (pollOptions.length >= POST_POLL_MIN_OPTIONS && pollOptions.every((option) => option.trim()));
  const imprintReady = !imprintOn || Boolean(text.trim());
  const canSend = Boolean(text.trim() || voice || image || pollOpen) && pollReady && imprintReady;

  const shownBars = useMemo(() => {
    const ids = new Set(bars.map((b) => b.clientId).filter(Boolean));
    const extras = localBars.filter((b) => !ids.has(b.clientId) && !bars.some((x) => x.id === b.id));
    return [...bars, ...extras];
  }, [bars, localBars]);

  useEffect(() => {
    if (!user?.id) return;
    const unsubFold = subscribeFoldDoc(
      foldId,
      (next) => {
        if (!next || !next.memberIds.includes(user.id)) {
          setMissing(true);
          setFold(null);
          return;
        }
        setMissing(false);
        setFold(next);
      },
      () => setMissing(true)
    );
    const unsubBars = subscribeFoldBars(foldId, setBars);
    return () => {
      unsubFold();
      unsubBars();
    };
  }, [foldId, user?.id]);

  useEffect(() => {
    if (!peerId) return;
    return subscribePeerPresence(foldId, peerId, setPresence);
  }, [foldId, peerId]);

  useEffect(() => {
    markedOpenRef.current = false;
    lastReadBarRef.current = null;
  }, [foldId]);

  /** Stamp peer read receipts while this thread is open — not only when unread > 0. */
  useEffect(() => {
    if (!fold || !me || sealedForMe) return;
    markedOpenRef.current = true;
    if (fold.lastSenderId === me || !fold.lastBarId) return;
    if (lastReadBarRef.current === fold.lastBarId) return;
    lastReadBarRef.current = fold.lastBarId;
    void markFoldReadClient(foldId).catch(() => undefined);
  }, [fold?.lastBarId, fold?.lastSenderId, fold?.id, foldId, me, sealedForMe]);

  const foldStatus = fold?.status;
  useEffect(() => {
    if (!foldStatus || foldStatus === 'declined') return;
    const pulse = () => {
      void writeFoldPresence(foldId, { viewing: true, typing: typingRef.current }).catch(
        () => undefined
      );
    };
    pulse();
    const tick = window.setInterval(pulse, 7000);
    return () => {
      window.clearInterval(tick);
      typingRef.current = false;
      void writeFoldPresence(foldId, { viewing: false, typing: false }).catch(() => undefined);
    };
  }, [foldId, foldStatus]);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [shownBars.length, inkMoving]);

  const clearComposerAttachments = () => {
    revokePostImagePreview(image);
    setImage(null);
    revokeVoiceObjectUrl(voice);
    setVoice(null);
    setPollOpen(false);
    setPollOptions(['', '']);
    setPollVisibility('after_vote');
    resetImprint();
  };

  const send = async () => {
    if (!user || !peerId || busy || !canSend) return;
    if (!ensureEngagement({ intent: 'message', next: `/msgs/${foldId}` })) return;
    if (fold?.status === 'declined') return;
    const clientId = `local_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
    const outgoing = text;
    const quote = replyTo;
    const outgoingVoice = voice;
    const outgoingImage = image;
    const outgoingPoll = pollOpen
      ? { options: pollOptions.map((option) => option.trim()), resultsVisibility: pollVisibility }
      : undefined;
    const outgoingPress = imprintOn && outgoing.trim() ? activeImprintConfig : undefined;
    setBusy(true);
    try {
      let sentImage: FoldBar['image'];
      let sentVoice: FoldBar['voice'];
      if (outgoingImage) {
        sentImage = await uploadPostImage({
          storagePath: foldImageStoragePath(foldId, clientId),
          image: outgoingImage,
          kind: 'fold_image',
        });
      }
      if (outgoingVoice) {
        sentVoice = await uploadVoiceClip({
          storagePath: foldVoiceStoragePath(foldId, clientId, extForVoiceType(outgoingVoice.contentType)),
          clip: outgoingVoice,
        });
      }
      const optimistic: FoldBar = {
        id: clientId,
        senderId: user.id,
        text: outgoing.trim(),
        createdAt: new Date().toISOString(),
        clientId,
        replyTo: quote,
        ...(sentImage ? { image: sentImage } : {}),
        ...(sentVoice ? { voice: sentVoice } : {}),
        ...(outgoingPress ? { quotePress: outgoingPress } : {}),
      };
      setLocalBars((prev) => [...prev, optimistic]);
      setText('');
      setReplyTo(undefined);
      clearComposerAttachments();
      typingRef.current = false;
      await passBarClient({
        peerId,
        text: outgoing,
        senderName: user.displayName || 'Artist',
        senderSlug: summary.profileSlug || undefined,
        clientId,
        replyTo: quote,
        image: sentImage,
        voice: sentVoice,
        poll: outgoingPoll,
        quotePress: outgoingPress,
      });
      void writeFoldPresence(foldId, { viewing: true, typing: false }).catch(() => undefined);
    } catch (error) {
      setLocalBars((prev) => prev.filter((b) => b.clientId !== clientId));
      setText(outgoing);
      setReplyTo(quote);
      toast({
        variant: 'destructive',
        title: 'Bar didn’t land',
        description: error instanceof Error ? error.message : undefined,
      });
    } finally {
      setBusy(false);
    }
  };

  if (!user) {
    return <StudioLoader size="lg" fullscreen message="Opening…" />;
  }
  if (missing) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <p className="font-headline text-2xl uppercase">Conversation not found</p>
        <Button asChild variant="outline" className="mt-4 rounded-none">
          <Link href="/msgs">Back to Msgs</Link>
        </Button>
      </div>
    );
  }
  if (!fold) {
    return <StudioLoader size="lg" fullscreen message="Opening…" />;
  }

  const peerName = peer?.name || 'Artist';

  return (
    <div className="relative flex h-[calc(100dvh-3.5rem)] max-h-[calc(100dvh-3.5rem)] w-full flex-col overflow-hidden">
      <InboxPageAtmosphere variant="msgs" />
      <div className="relative z-10 mx-auto flex h-full min-h-0 w-full min-w-0 max-w-4xl flex-col overflow-hidden px-4 py-4 sm:px-6 sm:py-5 lg:max-w-5xl">
      <header className="mb-3 flex shrink-0 items-center gap-2">
        <Button variant="ghost" size="icon" className="h-9 w-9 text-amber-100" asChild>
          <Link href="/msgs" aria-label="Back to Msgs">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="min-w-0 flex-1">
          <p className="truncate font-headline text-2xl uppercase leading-none tracking-tight text-amber-50 sm:text-3xl">
            {peer?.name || 'Artist'}
          </p>
          <p className="mt-1 font-code text-[10px] font-bold uppercase tracking-[0.2em] text-amber-200/65">
            {fold.status === 'declined'
              ? 'Closed'
              : sealedForMe
                ? 'New message'
                : waitingOnThem
                  ? 'Waiting on them'
                  : inkMoving
                    ? 'Typing…'
                    : presence?.viewing
                      ? 'Active'
                      : 'Messages'}
          </p>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-9 w-9 text-amber-100">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="rounded-none">
            {peerArtistHomeLive && peerArtistHomeHref ? (
              <DropdownMenuItem onClick={() => router.push(peerArtistHomeHref)}>Artist Home</DropdownMenuItem>
            ) : null}
            <DropdownMenuItem
              onClick={() =>
                void foldBackClient(foldId)
                  .then(() => toast({ title: 'Marked unread' }))
                  .catch((e) =>
                    toast({
                      variant: 'destructive',
                      title: 'Could not mark unread',
                      description: e instanceof Error ? e.message : undefined,
                    })
                  )
              }
            >
              Mark unread
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-destructive"
              onClick={() =>
                void deleteFoldFromInboxClient(foldId)
                  .then(() => {
                    toast({ title: 'Deleted from inbox' });
                    router.push('/msgs');
                  })
                  .catch((e) =>
                    toast({
                      variant: 'destructive',
                      title: 'Could not delete',
                      description: e instanceof Error ? e.message : undefined,
                    })
                  )
              }
            >
              Delete from inbox
            </DropdownMenuItem>
            {sealedForMe ? (
              <DropdownMenuItem
                onClick={() => {
                  if (!ensureEngagement({ intent: 'message', next: `/msgs/${foldId}` })) return;
                  void acceptFoldClient(foldId);
                }}
              >
                Accept
              </DropdownMenuItem>
            ) : null}
            {fold.status !== 'declined' ? (
              <DropdownMenuItem
                className="text-destructive"
                onClick={() =>
                  void declineFoldClient(foldId)
                    .then(() => {
                      toast({ title: 'Conversation closed' });
                      router.push('/msgs');
                    })
                    .catch((e) =>
                      toast({
                        variant: 'destructive',
                        title: 'Could not close',
                        description: e instanceof Error ? e.message : undefined,
                      })
                    )
                }
              >
                Close
              </DropdownMenuItem>
            ) : null}
          </DropdownMenuContent>
        </DropdownMenu>
      </header>

      <article
        className="relative flex min-h-0 flex-1 flex-col overflow-hidden border border-amber-500/15 bg-[#14110d]/75 shadow-[inset_0_0_40px_rgba(251,191,36,0.04)] backdrop-blur-sm"
      >
      <div
        ref={scrollerRef}
        className="relative min-h-0 min-w-0 flex-1 overflow-x-hidden overflow-y-auto px-4 py-5 sm:px-5"
      >
        {sealedForMe ? (
          <div className="mb-6 border border-amber-400/30 bg-amber-500/10 px-4 py-3">
            <p className="font-headline text-sm uppercase">New message</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Accept to keep this conversation, or decline.
            </p>
            <div className="mt-3 flex gap-2">
              <Button
                size="sm"
                className="h-8 rounded-none bg-amber-700 text-[10px] font-bold uppercase tracking-widest hover:bg-amber-600"
                onClick={() => {
                  if (!ensureEngagement({ intent: 'message', next: `/msgs/${foldId}` })) return;
                  void acceptFoldClient(foldId);
                }}
              >
                Accept
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-8 rounded-none text-[10px] font-bold uppercase tracking-widest"
                onClick={() =>
                  void declineFoldClient(foldId).then(() => router.push('/msgs'))
                }
              >
                Decline
              </Button>
            </div>
          </div>
        ) : null}

        <div className="space-y-6">
          {shownBars.map((bar, index) => {
            const prev = shownBars[index - 1];
            const firstOfDay = !prev || !isSameMessageDay(bar.createdAt, prev.createdAt);
            const readStatus =
              fold && peerId ? outgoingReadStatus(fold, peerId, shownBars, bar, me) : null;
            return (
              <React.Fragment key={bar.id}>
                {firstOfDay ? <FoldDateSeparator iso={bar.createdAt} /> : null}
                <BarStanza
                  bar={bar}
                  mine={bar.senderId === me}
                  peerName={peerName}
                  foldId={foldId}
                  viewerId={me}
                  readStatus={readStatus}
                  timestamp={foldMessageTimestamp(bar.createdAt, firstOfDay)}
                  onAnswer={(next) =>
                    setReplyTo({
                      barId: next.id,
                      text: foldBarPreviewText(next),
                      senderId: next.senderId,
                    })
                  }
                />
              </React.Fragment>
            );
          })}
          {inkMoving ? (
            <p className="font-code text-[10px] uppercase tracking-[0.25em] text-amber-300/80">
              Typing…
            </p>
          ) : null}
        </div>
      </div>

      {fold.status === 'declined' ? (
        <div className="px-4 py-3 text-center text-xs text-muted-foreground">
          This conversation is closed. Send a new message from their Artist Home to try again.
        </div>
      ) : (
        <form
          className="shrink-0 border-t border-amber-500/15 bg-[#14110d]/90 px-3 pb-3 pt-2"
          onSubmit={(e) => {
            e.preventDefault();
            void send();
          }}
        >
          {replyTo ? (
            <div className="mb-2 flex items-center justify-between gap-2 border-l-2 border-amber-400/40 bg-amber-500/5 px-2 py-1.5">
              <p className="min-w-0 truncate font-serif text-xs italic text-amber-100/70">
                replying to “{replyTo.text}”
              </p>
              <button
                type="button"
                className="font-code text-[9px] uppercase tracking-widest text-muted-foreground"
                onClick={() => setReplyTo(undefined)}
              >
                Clear
              </button>
            </div>
          ) : null}
          {imprintOn && text.trim() ? (
            <div className="mb-2 space-y-2">
              <QuotePressCard text={text} config={activeImprintConfig} compact withMentions />
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
                  void persistImprintSlots([
                    ...imprintSlots,
                    {
                      id: `qp-${Date.now()}`,
                      faders: { ...imprintFaders },
                      lockedAt: new Date().toISOString(),
                      label: quotePressSlotLabel(imprintFaders),
                    },
                  ]);
                }}
                onLoadSlot={(slot) => {
                  if (!isPro) return;
                  setImprintFaders(slot.faders);
                }}
                onClearSlot={(slotId) => {
                  void persistImprintSlots(imprintSlots.filter((slot) => slot.id !== slotId));
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
          <div className="flex min-w-0 items-center gap-1 overflow-x-auto pb-1">
            <div className={cn('shrink-0', voice && 'min-w-0 max-w-full basis-full sm:basis-auto')}>
              <VoiceNoteComposer clip={voice} onClipChange={setVoice} disabled={busy} compact />
            </div>
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
            <EmojiPickerButton
              compact
              disabled={busy}
              onInsert={insertEmoji}
              className="shrink-0 text-amber-200/80 hover:text-amber-100"
            />
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className={cn('h-8 gap-1 px-2 text-[10px] font-bold uppercase tracking-wider', pollOpen && 'text-amber-200')}
              onClick={() => setPollOpen((value) => !value)}
              disabled={busy}
            >
              <BarChart3 className="h-3.5 w-3.5" /> Poll
            </Button>
            {showImprintToggle ? (
              <button
                type="button"
                onClick={toggleImprint}
                disabled={busy}
                className={cn(
                  'inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-md border px-1.5 py-1 font-code text-[9px] font-bold uppercase tracking-wider transition-all',
                  imprintOn
                    ? 'border-amber-400/55 bg-amber-500/20 text-amber-100'
                    : 'border-transparent text-amber-200/60 hover:border-amber-500/35 hover:text-amber-100'
                )}
              >
                <Sparkles className="h-3.5 w-3.5" />
                Imprint
              </button>
            ) : null}
          </div>
          <div className="flex items-end gap-2" data-composer-field>
            <textarea
              ref={composeRef}
              value={text}
              onChange={(e) => onType(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  void send();
                }
              }}
              rows={2}
              placeholder={waitingOnThem ? 'Waiting — you can still send' : 'Write a message…'}
              className="min-h-[52px] flex-1 resize-none border-0 bg-transparent font-serif text-base leading-relaxed text-amber-50 outline-none placeholder:text-amber-100/30"
              maxLength={FOLD_BAR_MAX_CHARS}
            />
            <Button
              type="submit"
              disabled={busy || !canSend}
              className="h-10 rounded-none bg-amber-700 px-4 font-bold uppercase tracking-[0.22em] text-amber-50 hover:bg-amber-600"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Send'}
            </Button>
          </div>
        </form>
      )}
      </article>
      </div>
    </div>
  );
}
