'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useGamification } from '@/context/gamification-context';
import { useAuth } from '@/hooks/use-auth';
import { pickFeaturedAchievementId } from '@/lib/gamification/achievement-card-theme';
import { patchGamificationSettings, trackShareCardEvent } from '@/lib/gamification-client';
import { useToast } from '@/hooks/use-toast';
import { Share2, Globe, Trophy, ExternalLink } from 'lucide-react';
import { AchievementShareCard } from '@/components/gamification/achievement-share-card';
import { ProfileShareDialog } from '@/components/profile/profile-share-dialog';

/** Sharing & visibility — lives on Studio Progress (not Settings). */
export function StudioSharingSection() {
  const { summary, rankLabel } = useGamification();
  const { user } = useAuth();
  const { toast } = useToast();
  const [publicProfile, setPublicProfile] = useState(summary.publicProfile);
  const [showOnLeaderboard, setShowOnLeaderboard] = useState(!summary.leaderboardHidden);
  const [shareOpen, setShareOpen] = useState(false);
  const [profileShareOpen, setProfileShareOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setPublicProfile(summary.publicProfile);
    setShowOnLeaderboard(!summary.leaderboardHidden);
  }, [summary.publicProfile, summary.leaderboardHidden]);

  const unlocked = summary.unlockedAchievements || {};

  const saveSettings = async (next: { publicProfile?: boolean; leaderboardHidden?: boolean }) => {
    setSaving(true);
    try {
      await patchGamificationSettings({
        ...next,
        displayName: user?.displayName,
      });
      toast({ title: 'Visibility updated' });
    } catch {
      toast({ variant: 'destructive', title: 'Could not save visibility settings' });
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
      <section
        id="sharing-visibility"
        className="rounded-xl border border-sky-500/20 bg-card/40 overflow-hidden scroll-mt-24"
      >
        <CardHeader className="pb-2 border-b border-white/5 bg-black/20">
          <CardTitle className="text-base font-headline uppercase flex items-center gap-2">
            <Globe className="h-5 w-5 text-sky-400" />
            Sharing &amp; visibility
          </CardTitle>
          <CardDescription className="text-[11px] leading-relaxed">
            Both switches off = fully private. Turn a switch on only when you want that surface public. Lyrics are never
            published — only stats you choose to share.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5 p-4 pt-5">
          <div className="flex items-center justify-between gap-4">
            <div className="space-y-1 min-w-0">
              <Label className="text-sm font-bold uppercase flex items-center gap-1.5">
                <Trophy className="h-3.5 w-3.5" /> Show on leaderboard
              </Label>
              <p className="text-sm text-muted-foreground leading-snug">
                Appear on the weekly public rankings (display name + studio stats).
              </p>
            </div>
            <Switch
              checked={showOnLeaderboard}
              disabled={saving}
              onCheckedChange={(c) => {
                setShowOnLeaderboard(c);
                void saveSettings({ leaderboardHidden: !c });
              }}
            />
          </div>
          <div className="flex items-center justify-between gap-4">
            <div className="space-y-1 min-w-0">
              <Label className="text-sm font-bold uppercase flex items-center gap-1.5">
                <Globe className="h-3.5 w-3.5" /> Public profile
              </Label>
              <p className="text-sm text-muted-foreground leading-snug">
                Share rank, streak, and badges on a profile page — never lyrics.
              </p>
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

          <div className="flex flex-wrap gap-3 border-t border-white/10 pt-5">
            <Button
              variant="outline"
              className="gap-2 h-11 text-sm font-bold"
              onClick={() => {
                setShareOpen(true);
                void trackShareCardEvent('share_card_generated');
              }}
            >
              <Share2 className="h-4 w-4" /> Share achievement card
            </Button>
            {profileUrl && (
              <>
                <Button
                  className="gap-2 h-11 text-sm font-bold bg-sky-500 hover:bg-sky-400 text-black shadow-[0_0_20px_rgba(14,165,233,0.3)]"
                  asChild
                >
                  <Link href={`/profile/${summary.profileSlug}`} target="_blank">
                    <ExternalLink className="h-4 w-4" /> View public profile
                  </Link>
                </Button>
                <Button
                  variant="secondary"
                  className="gap-2 h-11 text-sm font-bold"
                  onClick={() => setProfileShareOpen(true)}
                >
                  <Share2 className="h-4 w-4" /> Share profile
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </section>

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

      {profileUrl && (
        <ProfileShareDialog
          open={profileShareOpen}
          onOpenChange={setProfileShareOpen}
          profile={{
            displayName: user?.displayName || 'Artist',
            rankLabel,
            profileUrl,
          }}
        />
      )}
    </>
  );
}
