'use client';

import React, { useRef, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  Camera,
  ChevronLeft,
  Crown,
  Flame,
  LayoutGrid,
  Loader2,
  Share2,
  Sparkles,
  Trophy,
  Zap,
} from 'lucide-react';
import type { AchievementDef } from '@/lib/gamification/achievements';
import type { RankId } from '@/lib/gamification/types';
import { AlbumCoverCollage } from '@/components/gamification/album-cover-collage';
import { PublicAchievementFoil } from '@/components/profile/public-achievement-foil';
import { ProfileShareDialog } from '@/components/profile/profile-share-dialog';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { processProfilePhotoFile } from '@/lib/cover-art';
import { patchGamificationSettings } from '@/lib/gamification-client';
import { rankBadgeClass, rankIdFromLabel } from '@/lib/gamification/badge-styles';
import { useToast } from '@/hooks/use-toast';

export type PublicProfileData = {
  displayName: string;
  rankLabel: string;
  rankId?: RankId;
  xp: number;
  currentStreak: number;
  longestStreak: number;
  albumCoverUrls?: string[];
  badges: AchievementDef[];
  /** Achievement id → unlock ISO timestamp (for Proof Wall foil cards). */
  unlockedAchievements?: Record<string, string>;
  userId?: string;
  profilePhotoMode?: 'collage' | 'custom';
  profilePhotoUrl?: string | null;
  slug?: string;
  /** Owner's referral code — used when guests claim a profile from this page. */
  referralCode?: string;
  starMarkUseStar?: boolean;
  starMarkSeed?: number;
  /** Live public DNA Drops (share docs still online). */
  liveDnaDrops?: Array<{
    shareId: string;
    title: string;
    type: 'album' | 'track';
    albumTitle?: string;
    albumShareId?: string;
    trackCount?: number;
  }>;
};

type PublicProfileShowcaseProps = {
  profile: PublicProfileData;
  isOwner?: boolean;
  onProfilePhotoChange?: (next: {
    profilePhotoMode: 'collage' | 'custom';
    profilePhotoUrl?: string | null;
  }) => void;
};

function ProfileBackdrop({ urls }: { urls: string[] }) {
  const tiles = urls.length > 0 ? urls.slice(0, 12) : [];
  if (!tiles.length) {
    return (
      <div
        className="pointer-events-none absolute inset-0 opacity-30"
        style={{
          backgroundImage:
            'radial-gradient(circle at 20% 20%, rgba(59,130,246,0.25), transparent 45%), radial-gradient(circle at 80% 70%, rgba(251,191,36,0.12), transparent 40%)',
        }}
      />
    );
  }

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden opacity-[0.14]">
      <div className="grid h-full w-full grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-1 p-2 rotate-[-4deg] scale-110">
        {[...tiles, ...tiles].slice(0, 24).map((url, i) => (
          <div key={`${url}-${i}`} className="aspect-square overflow-hidden rounded-lg bg-black/40">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={url} alt="" className="h-full w-full object-cover blur-[1px] saturate-125" />
          </div>
        ))}
      </div>
      <div className="absolute inset-0 bg-gradient-to-b from-[#030712]/80 via-[#030712]/92 to-[#030712]" />
    </div>
  );
}

export function PublicProfileShowcase({
  profile,
  isOwner = false,
  onProfilePhotoChange,
}: PublicProfileShowcaseProps) {
  const sortedBadges = [...profile.badges].sort((a, b) => b.xpReward - a.xpReward);
  const rankId = profile.rankId ?? rankIdFromLabel(profile.rankLabel);
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [shareOpen, setShareOpen] = useState(false);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [localMode, setLocalMode] = useState<'collage' | 'custom'>(
    profile.profilePhotoMode === 'custom' ? 'custom' : 'collage'
  );
  const [localPhotoUrl, setLocalPhotoUrl] = useState<string | null>(profile.profilePhotoUrl || null);

  const useCustom =
    localMode === 'custom' && typeof localPhotoUrl === 'string' && localPhotoUrl.trim().length > 0;

  const profileUrl =
    typeof window !== 'undefined' && profile.slug
      ? `${window.location.origin}/profile/${profile.slug}`
      : profile.slug
        ? `https://bar4bar.ink/profile/${profile.slug}`
        : undefined;

  const savePhoto = async (next: {
    profilePhotoMode: 'collage' | 'custom';
    profilePhotoUrl?: string | null;
  }) => {
    setPhotoBusy(true);
    try {
      await patchGamificationSettings(next);
      setLocalMode(next.profilePhotoMode);
      setLocalPhotoUrl(next.profilePhotoUrl ?? null);
      onProfilePhotoChange?.(next);
      toast({
        title: next.profilePhotoMode === 'collage' ? 'Using album collage' : 'Profile photo updated',
      });
    } catch {
      toast({ variant: 'destructive', title: 'Could not save profile photo' });
    } finally {
      setPhotoBusy(false);
    }
  };

  const handleUpload = async (file: File) => {
    setPhotoBusy(true);
    try {
      const { dataUrl } = await processProfilePhotoFile(file);
      await savePhoto({ profilePhotoMode: 'custom', profilePhotoUrl: dataUrl });
    } catch (e) {
      toast({
        variant: 'destructive',
        title: 'Image not accepted',
        description: e instanceof Error ? e.message : 'Could not process image.',
      });
      setPhotoBusy(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-x-hidden pb-20">
      <ProfileBackdrop urls={profile.albumCoverUrls || []} />

      <div className="relative z-10 mx-auto w-full max-w-[1400px] px-4 sm:px-6 lg:px-10 pt-6 sm:pt-10">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Button
            size="sm"
            variant="outline"
            className="h-8 gap-1.5 border-primary/45 bg-primary/12 px-3 text-[11px] font-bold uppercase tracking-widest text-primary shadow-none hover:bg-primary/22 hover:text-primary"
            asChild
          >
            <Link href="/">
              <ChevronLeft className="h-4 w-4" /> Bar 4 Bar Studio
            </Link>
          </Button>

          {isOwner && (
            <Button
              size="sm"
              className="h-9 font-bold uppercase gap-1.5 bg-sky-500 hover:bg-sky-400 text-black"
              onClick={() => setShareOpen(true)}
            >
              <Share2 className="h-3.5 w-3.5" /> Share profile
            </Button>
          )}
        </div>

        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55 }}
          className="mt-6 grid gap-8 lg:grid-cols-12 lg:items-end lg:gap-10"
        >
          <div className="lg:col-span-7 space-y-6">
            <p className="text-[10px] font-bold uppercase tracking-[0.4em] text-primary/80 flex items-center gap-2">
              <Sparkles className="h-3.5 w-3.5" /> Public studio dossier
            </p>
            <h1 className="font-headline text-[clamp(2.5rem,8vw,5.5rem)] font-bold uppercase leading-[0.92] tracking-tight text-white">
              {profile.displayName}
            </h1>
            <div
              className={cn(
                'inline-flex items-center gap-2 rounded-full border px-4 py-2',
                rankBadgeClass(rankId)
              )}
            >
              <Crown className="h-4 w-4" />
              <span className="text-xs font-bold uppercase tracking-[0.25em]">
                {profile.rankLabel}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-3 sm:gap-4 max-w-xl">
              {[
                {
                  label: 'Total XP',
                  value: profile.xp.toLocaleString(),
                  icon: Zap,
                  tone: 'text-sky-400 border-sky-500/30 bg-sky-500/10',
                },
                {
                  label: 'Live streak',
                  value: `${profile.currentStreak}d`,
                  icon: Flame,
                  tone: 'text-amber-400 border-amber-500/30 bg-amber-500/10',
                },
                {
                  label: 'Best streak',
                  value: `${profile.longestStreak}d`,
                  icon: Trophy,
                  tone: 'text-violet-300 border-violet-500/30 bg-violet-500/10',
                },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className={cn('rounded-2xl border px-3 py-4 sm:px-4 sm:py-5 backdrop-blur-sm', stat.tone)}
                >
                  <stat.icon className="h-4 w-4 mb-2 opacity-90" />
                  <p className="font-headline text-2xl sm:text-3xl text-white leading-none tabular-nums">
                    {stat.value}
                  </p>
                  <p className="mt-2 text-[9px] font-bold uppercase tracking-widest text-white/50">
                    {stat.label}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="lg:col-span-5 flex flex-col items-center lg:items-end gap-3">
            <motion.div
              initial={{ opacity: 0, scale: 0.94, rotate: -3 }}
              animate={{ opacity: 1, scale: 1, rotate: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="relative w-full max-w-md"
            >
              <div className="absolute -inset-3 rounded-[2rem] bg-gradient-to-br from-primary/50 via-sky-400/30 to-amber-400/25 blur-xl opacity-70" />
              {useCustom ? (
                <div className="relative aspect-square w-full max-w-md overflow-hidden rounded-[1.75rem] border border-primary/30 shadow-[0_24px_80px_rgba(0,0,0,0.55)]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={localPhotoUrl!} alt="" className="h-full w-full object-cover" />
                </div>
              ) : (
                <AlbumCoverCollage
                  urls={profile.albumCoverUrls || []}
                  displayName={profile.displayName}
                  className="relative h-auto w-full max-w-md aspect-square rounded-[1.75rem] shadow-[0_24px_80px_rgba(0,0,0,0.55)]"
                />
              )}
            </motion.div>

            {isOwner && (
              <div className="flex flex-wrap justify-center lg:justify-end gap-2 w-full max-w-md">
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) void handleUpload(file);
                    e.target.value = '';
                  }}
                />
                <Button
                  size="sm"
                  variant="outline"
                  className="h-9 font-bold uppercase gap-1.5"
                  disabled={photoBusy}
                  onClick={() => fileRef.current?.click()}
                >
                  {photoBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Camera className="h-3.5 w-3.5" />}
                  Change photo
                </Button>
                <Button
                  size="sm"
                  variant={localMode === 'collage' ? 'default' : 'ghost'}
                  className="h-9 font-bold uppercase gap-1.5"
                  disabled={photoBusy || localMode === 'collage'}
                  onClick={() => void savePhoto({ profilePhotoMode: 'collage', profilePhotoUrl: null })}
                >
                  <LayoutGrid className="h-3.5 w-3.5" /> Use album collage
                </Button>
              </div>
            )}
          </div>
        </motion.section>

        <section className="mt-14 sm:mt-20 space-y-6">
          <div className="flex flex-wrap items-end justify-between gap-4 border-b border-white/10 pb-4">
            <div>
              <h2 className="font-headline text-2xl sm:text-3xl font-bold uppercase tracking-tight text-white">
                Trophy wall
              </h2>
              <p className="mt-1 text-sm text-muted-foreground max-w-xl">
                Each badge is a foil press — category color, unique watermark, and serial. No lyrics, only studio proof.
              </p>
            </div>
            <span className="rounded-full border border-white/15 bg-black/40 px-4 py-1.5 text-[10px] font-bold uppercase tracking-widest text-primary">
              {sortedBadges.length} unlocked
            </span>
          </div>

          {sortedBadges.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 auto-rows-[minmax(148px,auto)] gap-4 sm:gap-5">
              {sortedBadges.map((badge, i) => (
                <PublicAchievementFoil
                  key={badge.id}
                  achievement={badge}
                  displayName={profile.displayName}
                  index={i}
                  rankLabel={profile.rankLabel}
                  xp={profile.xp}
                  streak={profile.currentStreak}
                  unlockedAt={profile.unlockedAchievements?.[badge.id]}
                />
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-white/15 bg-black/30 py-16 text-center">
              <p className="text-sm text-muted-foreground">No badges unlocked yet — the booth is warming up.</p>
            </div>
          )}
        </section>

        <p className="mt-16 text-center text-[9px] font-code uppercase tracking-[0.35em] text-muted-foreground/45">
          Public studio profile · bar4bar.ink
        </p>
      </div>

      {isOwner && profileUrl && (
        <ProfileShareDialog
          open={shareOpen}
          onOpenChange={setShareOpen}
          profile={{
            displayName: profile.displayName,
            rankLabel: profile.rankLabel,
            profileUrl,
          }}
        />
      )}
    </div>
  );
}
