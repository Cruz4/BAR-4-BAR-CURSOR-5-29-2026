'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { StudioLoader } from '@/components/studio-loader';
import { ArtistHome } from '@/components/profile/artist-home';
import type { PublicProfileData } from '@/components/profile/public-profile-showcase';
import { trackShareCardEvent } from '@/lib/gamification-client';
import { getAchievement } from '@/lib/gamification/achievements';
import type { AchievementDef } from '@/lib/gamification/achievements';
import { normalizeArtistHomeConfig, type ArtistHomeConfig } from '@/lib/profile/modules';
import { useAuth } from '@/hooks/use-auth';

export function PublicProfilePageClient({ slug }: { slug: string }) {
  const { user } = useAuth();
  const [profile, setProfile] = useState<PublicProfileData | null>(null);
  const [config, setConfig] = useState<ArtistHomeConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!slug) return;
    const load = async () => {
      try {
        const res = await fetch(`/api/profile/${slug}`);
        if (!res.ok) {
          setError(true);
          return;
        }
        const data = await res.json();
        const badges: AchievementDef[] =
          data.badges ||
          (data.badgeIds || [])
            .map((id: string) => getAchievement(id))
            .filter(Boolean);

        setProfile({
          displayName: data.displayName,
          rankLabel: data.rankLabel,
          rankId: data.rankId,
          xp: data.xp,
          currentStreak: data.currentStreak,
          longestStreak: data.longestStreak,
          lifetimeBarsWritten:
            typeof data.lifetimeBarsWritten === 'number' ? data.lifetimeBarsWritten : undefined,
          lifetimeLinesGenerated:
            typeof data.lifetimeLinesGenerated === 'number'
              ? data.lifetimeLinesGenerated
              : undefined,
          albumCoverUrls: data.albumCoverUrls,
          badges,
          unlockedAchievements:
            data.unlockedAchievements && typeof data.unlockedAchievements === 'object'
              ? data.unlockedAchievements
              : undefined,
          userId: data.userId,
          profilePhotoMode:
            data.profilePhotoMode === 'custom'
              ? 'custom'
              : data.profilePhotoMode === 'initials'
                ? 'initials'
                : 'collage',
          profilePhotoUrl: data.profilePhotoUrl || null,
          starMarkUseStar: Boolean(data.starMarkUseStar),
          starMarkSeed:
            typeof data.starMarkSeed === 'number' ? data.starMarkSeed : undefined,
          referralCode:
            typeof data.referralCode === 'string' && data.referralCode.trim()
              ? data.referralCode.trim().toUpperCase()
              : undefined,
          liveDnaDrops: Array.isArray(data.liveDnaDrops)
            ? data.liveDnaDrops
                .filter(
                  (d: { shareId?: string }) =>
                    typeof d?.shareId === 'string' && d.shareId.trim().length > 0
                )
                .map((d: {
                  shareId: string;
                  title?: string;
                  type?: string;
                  albumTitle?: string;
                  albumShareId?: string;
                  trackIndex?: number;
                  trackCount?: number;
                }) => ({
                  shareId: d.shareId,
                  title: typeof d.title === 'string' && d.title.trim() ? d.title : 'Untitled drop',
                  type: d.type === 'album' ? ('album' as const) : ('track' as const),
                  ...(typeof d.albumTitle === 'string' && d.albumTitle.trim()
                    ? { albumTitle: d.albumTitle.trim() }
                    : {}),
                  ...(typeof d.albumShareId === 'string' && d.albumShareId.trim()
                    ? { albumShareId: d.albumShareId.trim() }
                    : {}),
                  ...(typeof d.trackIndex === 'number' ? { trackIndex: d.trackIndex } : {}),
                  ...(typeof d.trackCount === 'number' ? { trackCount: d.trackCount } : {}),
                }))
            : [],
          slug,
        });
        setConfig(normalizeArtistHomeConfig(data.artistHome));
        void trackShareCardEvent('share_card_opened', { slug });
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [slug]);

  if (loading) {
    return (
      <StudioLoader
        size="lg"
        fullscreen
        className="!bg-[hsl(216_28%_5%)]"
      />
    );
  }

  if (error || !profile || !config) {
    return (
      <div className="container mx-auto max-w-lg py-20 px-4 text-center space-y-4">
        <p className="text-muted-foreground">This public profile is not available.</p>
        <Link href="/" className="text-primary text-sm font-bold uppercase">
          Back to studio
        </Link>
      </div>
    );
  }

  const isOwner = Boolean(user?.id && profile.userId && user.id === profile.userId);

  return <ArtistHome profile={profile} config={config} isOwner={isOwner} />;
}
