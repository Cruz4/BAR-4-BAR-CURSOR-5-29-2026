'use client';

/**
 * Completed studio goal foil — share to wall / download PNG (owner actions).
 */

import React, { useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import { Download, Radio } from 'lucide-react';
import type { ChallengeDef } from '@/lib/gamification/challenges';
import { SCALE_LABELS, TIER_LABELS } from '@/lib/gamification/challenges';
import { ChallengeGoalFoilCard } from '@/components/gamification/challenge-goal-foil-card';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useAuth } from '@/hooks/use-auth';
import { useGamification } from '@/context/gamification-context';
import { useToast } from '@/hooks/use-toast';
import { createPost } from '@/lib/profile/social-client';
import {
  domNodeToFeedImageDataUrl,
  downloadDomNodePng,
} from '@/lib/gamification/feed-card-export';

export function ChallengeGoalFoilDialog({
  open,
  onOpenChange,
  challenge,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  challenge: ChallengeDef;
}) {
  const { user } = useAuth();
  const { summary, rankLabel } = useGamification();
  const { toast } = useToast();
  const cardRef = useRef<HTMLDivElement>(null);
  const [posting, setPosting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const displayName = user?.displayName || 'Studio Artist';

  const shareToFeed = async () => {
    if (!user) return;
    flushSync(() => setPosting(true));
    try {
      await new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
      );
      const cardEl = cardRef.current;
      if (!cardEl) throw new Error('Goal card not ready — try again.');
      const imageUrl = await domNodeToFeedImageDataUrl(cardEl);
      await createPost({
        text: [
          `🎯 ${SCALE_LABELS[challenge.scale]} goal complete: ${challenge.label}`,
          challenge.description.trim(),
          challenge.tier !== 'standard' ? TIER_LABELS[challenge.tier] : '',
          '#akasheet',
        ]
          .filter(Boolean)
          .join('\n'),
        imageUrl,
        ownerName: displayName,
        ownerSlug: summary.profileSlug,
      });
      toast({
        title: 'Shared to your feed',
        description: 'Goal card posted on your wall / The Scene.',
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
    const cardEl = cardRef.current;
    if (!cardEl) return;
    setExporting(true);
    try {
      await downloadDomNodePng(cardEl, `akasheet-goal-${challenge.id}.png`);
      toast({ title: 'Goal card downloaded' });
    } catch {
      toast({ variant: 'destructive', title: 'Download failed' });
    } finally {
      setExporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-headline uppercase tracking-wide">
            {challenge.label}
          </DialogTitle>
          <DialogDescription>
            Your foil goal card — post it to your wall, or download the PNG. No lyrics included.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <ChallengeGoalFoilCard
            ref={cardRef}
            challenge={challenge}
            displayName={displayName}
            rankLabel={rankLabel}
          />
          <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
            <Button
              variant="secondary"
              size="sm"
              disabled={posting || !user}
              onClick={() => void shareToFeed()}
            >
              <Radio className="mr-2 h-4 w-4" />
              {posting ? 'Posting foil…' : 'Share to feed'}
            </Button>
            <Button size="sm" disabled={exporting} onClick={() => void downloadPng()}>
              <Download className="mr-2 h-4 w-4" />
              {exporting ? 'Saving…' : 'Download PNG'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
