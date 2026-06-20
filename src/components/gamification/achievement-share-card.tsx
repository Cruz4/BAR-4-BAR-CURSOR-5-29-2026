'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { AchievementFoilCard } from '@/components/gamification/achievement-foil-card';
import { getAchievement } from '@/lib/gamification/achievements';
import { pickFeaturedAchievementId } from '@/lib/gamification/achievement-card-theme';
import {
  buildAchievementShareText,
  downloadAchievementCardPng,
} from '@/lib/gamification/achievement-card-export';
import { Copy, Download } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

type AchievementShareCardProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  displayName: string;
  rankLabel: string;
  streak: number;
  xp: number;
  recentBadge?: string;
  unlockedAchievements?: Record<string, string>;
};

export function AchievementShareCard({
  open,
  onOpenChange,
  displayName,
  rankLabel,
  streak,
  xp,
  recentBadge,
  unlockedAchievements = {},
}: AchievementShareCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const unlockedIds = useMemo(() => Object.keys(unlockedAchievements), [unlockedAchievements]);
  const [selectedId, setSelectedId] = useState<string | undefined>(() =>
    pickFeaturedAchievementId(unlockedAchievements, recentBadge)
  );

  useEffect(() => {
    if (open) {
      setSelectedId(pickFeaturedAchievementId(unlockedAchievements, recentBadge));
    }
  }, [open, unlockedAchievements, recentBadge]);

  const badge = selectedId ? getAchievement(selectedId) : null;
  const unlockDate = selectedId ? unlockedAchievements[selectedId] : undefined;

  const copySummary = () => {
    const text = buildAchievementShareText(badge, displayName, rankLabel, xp, streak, unlockDate);
    void navigator.clipboard.writeText(text);
    toast({ title: 'Copied to clipboard' });
  };

  const downloadPng = async () => {
    if (!cardRef.current) return;
    try {
      await downloadAchievementCardPng(cardRef.current, badge);
      toast({ title: 'Card downloaded' });
    } catch {
      toast({ variant: 'destructive', title: 'Download failed — try copy instead' });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Share achievement card</DialogTitle>
          <DialogDescription>
            Your studio status with your latest milestone front and center. Pick a badge if you have several. No lyrics
            included.
          </DialogDescription>
        </DialogHeader>

        {unlockedIds.length > 1 && (
          <Select value={selectedId} onValueChange={setSelectedId}>
            <SelectTrigger className="h-9 text-xs font-bold uppercase">
              <SelectValue placeholder="Choose achievement" />
            </SelectTrigger>
            <SelectContent>
              {unlockedIds
                .sort((a, b) => unlockedAchievements[b].localeCompare(unlockedAchievements[a]))
                .map((id) => {
                  const def = getAchievement(id);
                  return (
                    <SelectItem key={id} value={id} className="text-xs">
                      {def?.title || id}
                    </SelectItem>
                  );
                })}
            </SelectContent>
          </Select>
        )}

        <AchievementFoilCard
          ref={cardRef}
          achievement={badge}
          displayName={displayName}
          rankLabel={rankLabel}
          xp={xp}
          streak={streak}
          unlockedAt={unlockDate}
        />

        <div className="flex gap-2 justify-end">
          <Button variant="outline" size="sm" onClick={copySummary}>
            <Copy className="h-4 w-4 mr-2" /> Copy text
          </Button>
          <Button size="sm" onClick={() => void downloadPng()}>
            <Download className="h-4 w-4 mr-2" /> Download PNG
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
