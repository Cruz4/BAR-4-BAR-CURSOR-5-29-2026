'use client';

import React, { useMemo, useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useGamification } from '@/context/gamification-context';
import { useAuth } from '@/hooks/use-auth';
import { ACHIEVEMENTS } from '@/lib/gamification/achievements';
import { pickFeaturedAchievementId } from '@/lib/gamification/achievement-card-theme';
import { isProUser } from '@/lib/subscription';
import { patchGamificationSettings, trackShareCardEvent } from '@/lib/gamification-client';
import { useToast } from '@/hooks/use-toast';
import { Share2, Trophy, ExternalLink } from 'lucide-react';
import { AchievementShareCard } from '@/components/gamification/achievement-share-card';
import { AchievementBadgeCell } from '@/components/gamification/achievement-badge-cell';
import { TooltipProvider } from '@/components/ui/tooltip';

export function StudioProfileSection() {
  const { summary, rankLabel } = useGamification();
  const { user } = useAuth();
  const { toast } = useToast();
  const isPro = isProUser(user);
  const [publicProfile, setPublicProfile] = useState(summary.publicProfile);
  const [leaderboardHidden, setLeaderboardHidden] = useState(summary.leaderboardHidden);
  const [shareOpen, setShareOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setPublicProfile(summary.publicProfile);
    setLeaderboardHidden(summary.leaderboardHidden);
  }, [summary.publicProfile, summary.leaderboardHidden]);

  const unlocked = summary.unlockedAchievements || {};
  const badgeGrid = useMemo(
    () =>
      ACHIEVEMENTS.map((a) => ({
        ...a,
        unlocked: Boolean(unlocked[a.id]),
        lockedPro: a.proOnly && !isPro,
      })),
    [unlocked, isPro]
  );

  const saveSettings = async (next: { publicProfile?: boolean; leaderboardHidden?: boolean }) => {
    setSaving(true);
    try {
      await patchGamificationSettings({
        ...next,
        displayName: user?.displayName,
      });
      toast({ title: 'Studio profile updated' });
    } catch {
      toast({ variant: 'destructive', title: 'Could not save profile settings' });
    } finally {
      setSaving(false);
    }
  };

  const profileUrl =
    summary.profileSlug && publicProfile
      ? `${typeof window !== 'undefined' ? window.location.origin : ''}/profile/${summary.profileSlug}`
      : null;

  return (
    <>
      <Card className="border-white/10 bg-card/60">
        <CardHeader>
          <CardTitle className="font-headline flex items-center gap-2">
            <Trophy className="h-5 w-5 text-primary" /> Studio Profile
          </CardTitle>
          <CardDescription>
            Rank: <strong>{rankLabel}</strong> · {summary.xp.toLocaleString()} XP · Longest streak{' '}
            {summary.longestStreak}d
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <p className="text-[10px] text-muted-foreground -mt-2">
            Hover any trophy for how to unlock.{' '}
            <Link href="/studio-progress" className="text-primary hover:underline font-bold">
              View full progress board →
            </Link>
          </p>
          <TooltipProvider delayDuration={200}>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
              {badgeGrid.map((b) => (
                <AchievementBadgeCell
                  key={b.id}
                  achievement={b}
                  unlocked={b.unlocked}
                  lockedPro={b.lockedPro}
                  unlockedAt={unlocked[b.id]}
                />
              ))}
            </div>
          </TooltipProvider>

          <div className="space-y-4 border-t border-white/10 pt-4">
            <div className="flex items-center justify-between gap-4">
              <div className="space-y-0.5">
                <Label className="text-xs font-bold uppercase">Public profile</Label>
                <p className="text-[10px] text-muted-foreground">Share rank, streak, and badges — never lyrics.</p>
              </div>
              <Switch
                checked={publicProfile}
                disabled={saving}
                onCheckedChange={(c) => {
                  setPublicProfile(c);
                  void saveSettings({ publicProfile: c });
                }}
              />
            </div>
            <div className="flex items-center justify-between gap-4">
              <div className="space-y-0.5">
                <Label className="text-xs font-bold uppercase">Hide from leaderboard</Label>
                <p className="text-[10px] text-muted-foreground">Opt out of public weekly rankings.</p>
              </div>
              <Switch
                checked={leaderboardHidden}
                disabled={saving}
                onCheckedChange={(c) => {
                  setLeaderboardHidden(c);
                  void saveSettings({ leaderboardHidden: c });
                }}
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="outline"
              className="gap-2"
              onClick={() => {
                setShareOpen(true);
                void trackShareCardEvent('share_card_generated');
              }}
            >
              <Share2 className="h-4 w-4" /> Share achievement card
            </Button>
            {profileUrl && (
              <Button size="sm" variant="ghost" className="gap-2" asChild>
                <Link href={`/profile/${summary.profileSlug}`} target="_blank">
                  <ExternalLink className="h-4 w-4" /> View public profile
                </Link>
              </Button>
            )}
            <Button size="sm" variant="ghost" asChild>
              <Link href="/studio-progress">Progress board</Link>
            </Button>
            <Button size="sm" variant="ghost" asChild>
              <Link href="/leaderboard">Leaderboard</Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      <AchievementShareCard
        open={shareOpen}
        onOpenChange={setShareOpen}
        displayName={user?.displayName || 'Artist'}
        rankLabel={rankLabel}
        streak={summary.currentStreak}
        xp={summary.xp}
        recentBadge={pickFeaturedAchievementId(unlocked)}
        unlockedAchievements={unlocked}
      />
    </>
  );
}
