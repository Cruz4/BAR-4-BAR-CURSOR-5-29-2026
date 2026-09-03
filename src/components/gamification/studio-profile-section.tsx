'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { useGamification } from '@/context/gamification-context';
import { useAuth } from '@/hooks/use-auth';
import { pickFeaturedAchievementId } from '@/lib/gamification/achievement-card-theme';
import { patchGamificationSettings, trackShareCardEvent } from '@/lib/gamification-client';
import { blockFeedHref } from '@/lib/scene-home';
import { useToast } from '@/hooks/use-toast';
import { Share2, Globe, Trophy, ExternalLink, Settings2, Users, Link2 } from 'lucide-react';
import { AchievementShareCard } from '@/components/gamification/achievement-share-card';
import {
  NEOMAIYA_CANONICAL_SLUG,
  normalizeProfileSlugInput,
  profileHref,
  profileSlugError,
} from '@/lib/profile/profile-slug';
import { isNeomaiyaSolViewer } from '@/lib/profile/neomaiya-sol';

/** Sharing & visibility — lives on Studio Progress (not Settings). */
export function StudioSharingSection() {
  const { summary, rankLabel } = useGamification();
  const { user } = useAuth();
  const { toast } = useToast();
  const [publicProfile, setPublicProfile] = useState(summary.publicProfile);
  const [showOnLeaderboard, setShowOnLeaderboard] = useState(!summary.leaderboardHidden);
  const [shareOpen, setShareOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [slugDraft, setSlugDraft] = useState(summary.profileSlug || '');
  const [slugSaving, setSlugSaving] = useState(false);

  const isNeo = isNeomaiyaSolViewer({ email: user?.email, displayName: user?.displayName });

  useEffect(() => {
    setPublicProfile(summary.publicProfile);
    setShowOnLeaderboard(!summary.leaderboardHidden);
    setSlugDraft(summary.profileSlug || '');
  }, [summary.publicProfile, summary.leaderboardHidden, summary.profileSlug]);

  const unlocked = summary.unlockedAchievements || {};

  const saveSettings = async (next: {
    publicProfile?: boolean;
    leaderboardHidden?: boolean;
    profileSlug?: string;
  }): Promise<boolean> => {
    setSaving(true);
    try {
      await patchGamificationSettings({
        ...next,
        displayName: user?.displayName,
      });
      toast({ title: next.profileSlug ? 'Profile link saved' : 'Visibility updated' });
      return true;
    } catch (err) {
      toast({
        variant: 'destructive',
        title: err instanceof Error ? err.message : 'Could not save visibility settings',
      });
      return false;
    } finally {
      setSaving(false);
    }
  };

  const saveSlug = async () => {
    const clean = normalizeProfileSlugInput(slugDraft);
    const err = profileSlugError(clean, {
      allowReserved: isNeo ? [NEOMAIYA_CANONICAL_SLUG] : [],
    });
    if (err) {
      toast({ variant: 'destructive', title: err });
      return;
    }
    if (clean === (summary.profileSlug || '')) {
      toast({ title: 'Link unchanged' });
      return;
    }
    setSlugSaving(true);
    try {
      const ok = await saveSettings({ profileSlug: clean, publicProfile: true });
      if (ok) setPublicProfile(true);
    } finally {
      setSlugSaving(false);
    }
  };

  const profileUrl =
    summary.profileSlug && publicProfile
      ? `${typeof window !== 'undefined' ? window.location.origin : ''}${profileHref(summary.profileSlug) || `/${summary.profileSlug}`}`
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
            published — only the Artist Home modules and stats you choose to share.
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
              <Button
                variant="link"
                className="h-auto px-0 py-0 text-[11px] font-bold uppercase tracking-wide text-amber-400/90"
                asChild
              >
                <Link href="/leaderboard">Open leaderboard →</Link>
              </Button>
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
                <Globe className="h-3.5 w-3.5" /> Artist Home (public profile)
              </Label>
              <p className="text-sm text-muted-foreground leading-snug">
                Your public page — a core shareable surface: modules, social links, Album Rooms, live DNA Drops. Never
                private lyrics.
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

          <div className="space-y-2 rounded-xl border border-sky-500/20 bg-sky-500/5 p-3.5">
            <Label className="flex items-center gap-1.5 text-sm font-bold uppercase">
              <Link2 className="h-3.5 w-3.5 text-sky-400" /> Your profile link
            </Label>
            <p className="text-xs text-muted-foreground leading-snug">
              Choose a clean name link — no random codes. Letters, numbers, and underscores.
            </p>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <div className="flex min-w-0 flex-1 items-center gap-1.5 rounded-lg border border-border/70 bg-background/60 px-2.5 py-2 font-code text-xs">
                <span className="shrink-0 text-muted-foreground">akasheet.com/</span>
                <Input
                  value={slugDraft}
                  disabled={saving || slugSaving}
                  onChange={(e) => setSlugDraft(normalizeProfileSlugInput(e.target.value))}
                  className="h-8 border-0 bg-transparent px-0 font-code text-sm shadow-none focus-visible:ring-0"
                  placeholder="your_artist_name"
                  maxLength={32}
                  aria-label="Profile link slug"
                />
              </div>
              <Button
                type="button"
                variant="secondary"
                className="h-10 shrink-0 font-bold uppercase"
                disabled={saving || slugSaving}
                onClick={() => void saveSlug()}
              >
                {slugSaving ? 'Saving…' : 'Save link'}
              </Button>
            </div>
            {summary.profileSlug && (
              <p className="font-code text-[11px] text-sky-300/90">
                Live:{' '}
                <Link
                  href={profileHref(summary.profileSlug) || '/'}
                  className="underline underline-offset-2 hover:text-sky-200"
                  target="_blank"
                >
                  akasheet.com/{summary.profileSlug}
                </Link>
              </p>
            )}
          </div>

          <div className="flex flex-wrap gap-3 border-t border-white/10 pt-5">
            <Button variant="outline" className="gap-2 h-11 text-sm font-bold" asChild>
              <Link href="/leaderboard">
                <Trophy className="h-4 w-4 text-amber-400" /> Leaderboard
              </Link>
            </Button>
            <Button variant="outline" className="gap-2 h-11 text-sm font-bold" asChild>
              <Link href={blockFeedHref()}>
                <Users className="h-4 w-4 text-emerald-400" /> The Block
              </Link>
            </Button>
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
                  <Link href={profileHref(summary.profileSlug) || '/'} target="_blank">
                    <ExternalLink className="h-4 w-4" /> View Artist Home
                  </Link>
                </Button>
                <Button variant="outline" className="gap-2 h-11 text-sm font-bold" asChild>
                  <Link href="/profile/customize">
                    <Settings2 className="h-4 w-4" /> Edit Public Page
                  </Link>
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
    </>
  );
}
