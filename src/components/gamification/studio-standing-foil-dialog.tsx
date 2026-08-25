'use client';

/**
 * Clickable rank badge → Studio Standing foil plate dialog.
 * Used on Studio Progress (Vault/Scene), studio-progress board, and Artist Home.
 */

import React, { useRef, useState } from 'react';
import { Download, Radio, Share2 } from 'lucide-react';
import type { RankId } from '@/lib/gamification/types';
import { ACHIEVEMENTS } from '@/lib/gamification/achievements';
import { linesToRhymeBars } from '@/lib/lyrics-units';
import { StudioStandingFoilCard } from '@/components/gamification/studio-standing-foil-card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { createPost } from '@/lib/profile/social-client';
import {
  domNodeToFeedImageDataUrl,
  downloadDomNodePng,
} from '@/lib/gamification/feed-card-export';
import { cn } from '@/lib/utils';
import { Crown, Trophy } from 'lucide-react';

export type StudioStandingStats = {
  displayName: string;
  rankId: RankId;
  rankLabel: string;
  xp: number;
  streak: number;
  longestStreak: number;
  lifetimeBarsWritten?: number;
  lifetimeLinesGenerated?: number;
  badgeCount: number;
  totalBadges?: number;
  isPro?: boolean;
  profileSlug?: string;
};

type StudioStandingFoilDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  stats: StudioStandingStats;
  /** Owner actions: share to feed + download PNG. */
  allowShare?: boolean;
};

export function StudioStandingFoilDialog({
  open,
  onOpenChange,
  stats,
  allowShare = false,
}: StudioStandingFoilDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const cardRef = useRef<HTMLDivElement>(null);
  const [posting, setPosting] = useState(false);
  const [exporting, setExporting] = useState(false);

  const totalBadges = stats.totalBadges ?? ACHIEVEMENTS.length;
  const written = stats.lifetimeBarsWritten ?? 0;
  const generated = stats.lifetimeLinesGenerated ?? 0;

  const shareToFeed = async () => {
    if (!allowShare || !user) return;
    setPosting(true);
    try {
      await new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
      );
      const cardEl = cardRef.current;
      if (!cardEl) throw new Error('Standing card not ready — try again.');
      const imageUrl = await domNodeToFeedImageDataUrl(cardEl);
      await createPost({
        text: [
          `🎤 Studio Standing — ${stats.displayName}`,
          `${stats.rankLabel} · ${stats.xp.toLocaleString()} XP · ${stats.streak}d streak`,
          `${stats.badgeCount}/${totalBadges} trophies · ${linesToRhymeBars(written).toLocaleString()} bars written`,
          '#bar4bar.ink',
        ].join('\n'),
        imageUrl,
        ownerName: stats.displayName,
        ownerSlug: stats.profileSlug,
      });
      toast({
        title: 'Shared to your feed',
        description: 'Standing plate posted on your wall / The Scene.',
      });
      onOpenChange(false);
    } catch (e) {
      toast({
        variant: 'destructive',
        title: 'Could not share to feed',
        description: e instanceof Error ? e.message : undefined,
      });
    } finally {
      setPosting(false);
    }
  };

  const downloadPng = async () => {
    if (!allowShare) return;
    setExporting(true);
    try {
      await new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
      );
      const cardEl = cardRef.current;
      if (!cardEl) throw new Error('Standing card not ready — try again.');
      await downloadDomNodePng(
        cardEl,
        `bar4bar-standing-${stats.rankId}.png`
      );
      toast({ title: 'Standing plate downloaded' });
    } catch (e) {
      toast({
        variant: 'destructive',
        title: 'Download failed',
        description: e instanceof Error ? e.message : undefined,
      });
    } finally {
      setExporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-headline uppercase tracking-wide">
            Studio Standing plate
          </DialogTitle>
          <DialogDescription>
            {allowShare
              ? 'A unique level card for your current rank — share it to your wall or download the PNG.'
              : `${stats.displayName}'s studio standing — rank, XP, and streak plate.`}
          </DialogDescription>
        </DialogHeader>
        <StudioStandingFoilCard
          ref={cardRef}
          displayName={stats.displayName}
          rankId={stats.rankId}
          rankLabel={stats.rankLabel}
          xp={stats.xp}
          streak={stats.streak}
          longestStreak={stats.longestStreak}
          lifetimeBarsWritten={written}
          lifetimeLinesGenerated={generated}
          badgeCount={stats.badgeCount}
          totalBadges={totalBadges}
          isPro={stats.isPro}
        />
        {allowShare ? (
          <div className="flex flex-col sm:flex-row gap-2 sm:justify-end pt-1">
            <Button
              variant="secondary"
              size="sm"
              disabled={posting || !user}
              onClick={() => void shareToFeed()}
            >
              <Radio className="h-4 w-4 mr-2" />
              {posting ? 'Posting foil…' : 'Share to feed'}
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={exporting}
              onClick={() => void downloadPng()}
            >
              <Download className="h-4 w-4 mr-2" />
              {exporting ? 'Saving…' : 'Download PNG'}
            </Button>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

type StudioStandingRankBadgeProps = {
  stats: StudioStandingStats;
  allowShare?: boolean;
  className?: string;
  /** Extra classes for the badge chip. */
  badgeClassName?: string;
  showTrophy?: boolean;
  /** Profile-style crown chip instead of Badge. */
  variant?: 'badge' | 'pill';
  /** Use a centered crown-only control below the small breakpoint. */
  compactOnMobile?: boolean;
};

/** Rank chip that opens the Studio Standing foil plate. */
export function StudioStandingRankBadge({
  stats,
  allowShare = false,
  className,
  badgeClassName,
  showTrophy = true,
  variant = 'badge',
  compactOnMobile = false,
}: StudioStandingRankBadgeProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      {variant === 'pill' ? (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setOpen(true);
          }}
          className={cn(
            'inline-flex shrink-0 items-center justify-center gap-2 border px-4 py-2 transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
            compactOnMobile && 'h-10 w-10 gap-0 px-0 sm:h-auto sm:w-auto sm:gap-2 sm:px-4',
            badgeClassName,
            className
          )}
          aria-label={`View ${stats.rankLabel} Studio Standing plate`}
          title={`${stats.rankLabel} Studio Standing`}
        >
          <Crown className="h-4 w-4 shrink-0" />
          <span className={cn('text-xs font-bold uppercase tracking-[0.25em]', compactOnMobile && 'hidden sm:inline')}>
            {stats.rankLabel}
          </span>
        </button>
      ) : (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setOpen(true);
          }}
          className={cn('inline-flex rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring', className)}
          aria-label={`View ${stats.rankLabel} Studio Standing plate`}
        >
          <Badge
            variant="outline"
            className={cn(
              'pointer-events-none cursor-pointer font-bold uppercase gap-1',
              badgeClassName
            )}
          >
            {showTrophy ? <Trophy className="h-3 w-3" /> : null}
            {stats.rankLabel}
          </Badge>
        </button>
      )}
      <StudioStandingFoilDialog
        open={open}
        onOpenChange={setOpen}
        stats={stats}
        allowShare={allowShare}
      />
    </>
  );
}

/** Imperative open helper — for “Share standing” buttons next to a controlled dialog. */
export function StudioStandingShareButton({
  onClick,
  className,
}: {
  onClick: () => void;
  className?: string;
}) {
  return (
    <Button
      type="button"
      variant="secondary"
      size="sm"
      className={cn('h-8 gap-1.5 text-[10px] font-bold uppercase tracking-wide', className)}
      onClick={onClick}
    >
      <Share2 className="h-3.5 w-3.5" /> Share standing
    </Button>
  );
}
