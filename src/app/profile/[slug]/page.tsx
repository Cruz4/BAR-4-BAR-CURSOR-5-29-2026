'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { StudioLoader } from '@/components/studio-loader';
import { PublicProfileShowcase, type PublicProfileData } from '@/components/profile/public-profile-showcase';
import { trackShareCardEvent } from '@/lib/gamification-client';
import { getAchievement } from '@/lib/gamification/achievements';
import type { AchievementDef } from '@/lib/gamification/achievements';

export default function PublicProfilePage({ params }: { params: Promise<{ slug: string }> }) {
  const [slug, setSlug] = useState<string | null>(null);
  const [profile, setProfile] = useState<PublicProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    void params.then((p) => setSlug(p.slug));
  }, [params]);

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
          xp: data.xp,
          currentStreak: data.currentStreak,
          longestStreak: data.longestStreak,
          albumCoverUrls: data.albumCoverUrls,
          badges,
        });
        void trackShareCardEvent('share_card_opened', { slug });
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [slug]);

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <StudioLoader />
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="container mx-auto max-w-lg py-20 px-4 text-center space-y-4">
        <p className="text-muted-foreground">This public profile is not available.</p>
        <Link href="/" className="text-primary text-sm font-bold uppercase">
          Back to studio
        </Link>
      </div>
    );
  }

  return <PublicProfileShowcase profile={profile} />;
}
