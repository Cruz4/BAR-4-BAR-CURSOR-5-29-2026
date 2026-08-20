'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check, Copy, Heart, MessageCircle, Repeat2, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PostCommentThread } from '@/components/profile/post-comment-thread';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { useGamification } from '@/context/gamification-context';
import { createPost } from '@/lib/profile/social-client';
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

type DropSocialPanelProps = {
  shareId: string;
  title: string;
  ownerId: string;
  playCount?: number;
  previewCount?: number;
  purchaseCount?: number;
  firstBuyerName?: string;
};

export function DropSocialPanel({
  shareId,
  title,
  ownerId,
  playCount,
  previewCount,
  purchaseCount,
  firstBuyerName,
}: DropSocialPanelProps) {
  const { user } = useAuth();
  const { summary } = useGamification();
  const { toast } = useToast();
  const router = useRouter();
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [commentCount, setCommentCount] = useState(0);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [comments, setComments] = useState<PostComment[]>([]);
  const [commentsLoaded, setCommentsLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [walled, setWalled] = useState(false);

  const pulse = formatDropPulseLine({ playCount, previewCount, purchaseCount, loveCount: likeCount });
  const dropUrl =
    typeof window !== 'undefined' ? `${window.location.origin}/share/${shareId}` : `/share/${shareId}`;

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

  const needAuth = () => {
    router.push(buildLoginUrl({ next: `/share/${shareId}` }));
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
      toast({ title: 'Link copied', description: 'Send the First Drop.' });
    } catch {
      toast({ variant: 'destructive', title: 'Could not copy link' });
    }
  };

  const nativeShare = async () => {
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({ title: `${title} · First Drop`, url: dropUrl });
        return;
      } catch {
        /* fall through to copy */
      }
    }
    await copyLink();
  };

  const postToWall = async () => {
    if (!user) {
      needAuth();
      return;
    }
    if (walled) return;
    setBusy(true);
    try {
      await createPost({
        text: `First Drop · ${title}`,
        embedUrl: dropUrl,
        ownerName: user.displayName || 'Artist',
        ownerSlug: summary.profileSlug,
      });
      setWalled(true);
      toast({ title: 'On your wall', description: 'Your circle can love and reply from there too.' });
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
          {pulse || 'First Drop'}
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
        <button
          type="button"
          disabled={busy || walled}
          onClick={() => void postToWall()}
          className={cn(
            'flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest transition-colors',
            walled ? 'text-violet-300' : 'text-muted-foreground hover:text-violet-300'
          )}
          title="Post this First Drop on your wall"
        >
          <Repeat2 className={cn('h-3.5 w-3.5', walled && 'stroke-[2.5]')} />
          {walled ? 'On your wall' : 'Post to wall'}
        </button>
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
    </div>
  );
}
