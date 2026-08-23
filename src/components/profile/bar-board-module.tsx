'use client';

/**
 * The Board — pinned bars on Artist Home. Read, share, open Drop, reply under a pin.
 */

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { ClipboardCopy, LayoutGrid, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { useGamification } from '@/context/gamification-context';
import { BOARD_REPLY_MAX, type BarBoard, type BarBoardPin } from '@/lib/profile/bar-board';
import {
  deleteBoardPinReply,
  fetchBoardPinReplies,
  setBoardPinReply,
  type BoardPinReply,
} from '@/lib/profile/social-client';
import { ArtistHomeLink } from '@/components/profile/artist-home-link';
import { cn } from '@/lib/utils';
import { SCENE_BOOTH_ID } from '@/lib/scene-home';
import { isMasterAdminEmail } from '@/lib/master-admin';

export function BarBoardView({
  data,
  profileUserId,
  viewerSlug,
  compact,
}: {
  data: BarBoard;
  profileUserId: string;
  viewerSlug?: string;
  compact?: boolean;
}) {
  return (
    <div className={cn('space-y-4', compact && 'space-y-3')}>
      {data.pins.map((pin) => (
        <BoardPinCard
          key={pin.id}
          pin={pin}
          profileUserId={profileUserId}
          viewerSlug={viewerSlug}
          compact={compact}
        />
      ))}
    </div>
  );
}

function BoardPinCard({
  pin,
  profileUserId,
  viewerSlug,
  compact,
}: {
  pin: BarBoardPin;
  profileUserId: string;
  viewerSlug?: string;
  compact?: boolean;
}) {
  const { user } = useAuth();
  const { summary, loading: profileLoading } = useGamification();
  const { toast } = useToast();
  const [replies, setReplies] = useState<BoardPinReply[]>([]);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [showReplies, setShowReplies] = useState(!compact);

  useEffect(() => {
    if (!showReplies) return;
    fetchBoardPinReplies(profileUserId, pin.id)
      .then(setReplies)
      .catch(() => undefined);
  }, [profileUserId, pin.id, showReplies]);

  const profileLive = Boolean(summary.publicProfile && summary.profileSlug);
  const canReplyIdentity = Boolean(user && user.id !== profileUserId);
  const canReply = canReplyIdentity && !profileLoading && profileLive;
  const isAdmin = Boolean(
    user && (user.role === 'admin' || isMasterAdminEmail(user.email))
  );
  const myReply = user ? replies.find((r) => r.authorId === user.id) : undefined;

  const copyBar = async () => {
    try {
      await navigator.clipboard.writeText(pin.text);
      toast({ title: 'Bar copied' });
    } catch {
      toast({ variant: 'destructive', title: 'Could not copy' });
    }
  };

  const postReply = async () => {
    if (!user) return;
    setBusy(true);
    try {
      const entry = await setBoardPinReply(profileUserId, pin.id, draft, {
        name: user.displayName || 'Artist',
        slug: viewerSlug,
      });
      setReplies((prev) => [entry, ...prev.filter((r) => r.id !== entry.id)]);
      setDraft('');
      toast({ title: 'Reply posted' });
    } catch (e) {
      toast({
        variant: 'destructive',
        title: 'Could not reply',
        description: e instanceof Error ? e.message : undefined,
      });
    } finally {
      setBusy(false);
    }
  };

  const removeReply = async (entryId: string) => {
    setBusy(true);
    try {
      await deleteBoardPinReply(profileUserId, pin.id, entryId);
      setReplies((prev) => prev.filter((r) => r.id !== entryId));
      toast({ title: 'Reply removed' });
    } catch (e) {
      toast({
        variant: 'destructive',
        title: 'Could not delete',
        description: e instanceof Error ? e.message : undefined,
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-lg border border-[var(--ph-border,rgba(255,255,255,0.12))] bg-black/25 p-3.5 space-y-2.5">
      {pin.sourceLabel ? (
        <p className="text-[10px] uppercase tracking-wider text-[var(--ph-muted,rgba(255,255,255,0.45))]">
          {pin.sourceLabel}
        </p>
      ) : null}
      <p className="text-sm sm:text-base leading-snug text-[var(--ph-text,#fff)]">“{pin.text}”</p>
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="h-7 px-2 text-[10px] uppercase font-bold"
          onClick={() => void copyBar()}
        >
          <ClipboardCopy className="h-3 w-3 mr-1" />
          Copy
        </Button>
        {pin.shareId ? (
          <Button asChild size="sm" variant="ghost" className="h-7 px-2 text-[10px] uppercase font-bold">
            <Link href={`/share/${pin.shareId}`}>Open Drop</Link>
          </Button>
        ) : null}
        {!compact ? (
          <button
            type="button"
            className="text-[10px] uppercase tracking-wider text-[var(--ph-muted,rgba(255,255,255,0.5))] hover:text-[var(--ph-accent,#7dd3fc)]"
            onClick={() => setShowReplies((v) => !v)}
          >
            {showReplies ? 'Hide replies' : 'Replies'}
          </button>
        ) : null}
      </div>

      {showReplies ? (
        <div className="pt-2 border-t border-white/10 space-y-2">
          {canReply ? (
            <div className="flex gap-2">
              <Input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                maxLength={BOARD_REPLY_MAX}
                placeholder={myReply ? 'Rewrite your reply…' : 'Leave a short reply…'}
                className="h-8 text-xs bg-black/30 border-white/15"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    void postReply();
                  }
                }}
              />
              <Button
                type="button"
                size="sm"
                className="h-8 shrink-0 text-[10px] uppercase font-bold"
                disabled={busy || !draft.trim()}
                onClick={() => void postReply()}
              >
                Reply
              </Button>
            </div>
          ) : canReplyIdentity && !profileLoading && !profileLive ? (
            <p className="text-[11px] text-[var(--ph-muted,rgba(255,255,255,0.55))]">
              Your Artist Home is offline.{' '}
              <Link
                href={`/#${SCENE_BOOTH_ID}`}
                className="font-semibold text-[var(--ph-accent,#7dd3fc)] hover:underline"
              >
                Turn it live in Your Booth
              </Link>{' '}
              to reply. Existing replies stay visible.
            </p>
          ) : !user ? (
            <p className="text-[11px] text-[var(--ph-muted,rgba(255,255,255,0.5))]">
              <Link href="/login" className="text-[var(--ph-accent,#7dd3fc)] hover:underline">
                Sign in
              </Link>{' '}
              to reply under this bar.
            </p>
          ) : null}

          <ul className="space-y-1.5">
            {replies.slice(0, 8).map((r) => (
              <li key={r.id} className="flex items-start gap-2 text-xs">
                <div className="min-w-0 flex-1">
                  <ArtistHomeLink
                    userId={r.authorId}
                    slug={r.authorSlug}
                    className="mr-1.5 font-semibold text-[var(--ph-accent2,#fbbf24)] hover:underline"
                  >
                    {r.authorName}
                  </ArtistHomeLink>
                  <span className="text-[var(--ph-muted,rgba(255,255,255,0.7))]">{r.text}</span>
                </div>
                {user && (user.id === r.authorId || user.id === profileUserId || isAdmin) ? (
                  <button
                    type="button"
                    disabled={busy}
                    className="text-[var(--ph-muted,rgba(255,255,255,0.4))] hover:text-rose-400"
                    onClick={() => void removeReply(r.id)}
                    aria-label={
                      isAdmin && user.id !== r.authorId && user.id !== profileUserId
                        ? 'Admin: delete reply'
                        : 'Delete reply'
                    }
                    title={
                      isAdmin && user.id !== r.authorId && user.id !== profileUserId
                        ? 'Admin: delete reply'
                        : 'Delete reply'
                    }
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                ) : null}
              </li>
            ))}
            {replies.length === 0 ? (
              <li className="text-[11px] text-[var(--ph-muted,rgba(255,255,255,0.4))]">No replies yet.</li>
            ) : null}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

export { LayoutGrid as BarBoardIcon };
