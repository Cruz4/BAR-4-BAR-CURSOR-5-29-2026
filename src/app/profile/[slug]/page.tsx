'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { StudioLoader } from '@/components/studio-loader';
import { Trophy, Flame, ChevronLeft } from 'lucide-react';
import { trackShareCardEvent } from '@/lib/gamification-client';
import { getAchievement } from '@/lib/gamification/achievements';

type PublicProfile = {
  displayName: string;
  rankLabel: string;
  xp: number;
  currentStreak: number;
  longestStreak: number;
  badgeIds: string[];
  badges?: Array<{ id: string; title: string; description: string }>;
};

export default function PublicProfilePage({ params }: { params: Promise<{ slug: string }> }) {
  const [slug, setSlug] = useState<string | null>(null);
  const [profile, setProfile] = useState<PublicProfile | null>(null);
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
        setProfile(await res.json());
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

  const badges =
    profile.badges ||
    (profile.badgeIds || []).map((id) => getAchievement(id)).filter(Boolean);

  return (
    <div className="container mx-auto max-w-lg py-10 px-4 space-y-6">
      <Link href="/" className="inline-flex items-center gap-1 text-muted-foreground hover:text-primary text-sm">
        <ChevronLeft className="h-4 w-4" /> Bar 4 Bar Studio
      </Link>

      <Card className="border-primary/30 bg-gradient-to-br from-[#0c1a26] to-background">
        <CardHeader className="text-center">
          <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-primary">Public Studio Profile</p>
          <CardTitle className="text-3xl font-headline uppercase">{profile.displayName}</CardTitle>
          <CardDescription className="text-primary font-bold">{profile.rankLabel}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex justify-center gap-8 text-sm font-code">
            <span>{profile.xp.toLocaleString()} XP</span>
            <span className="flex items-center gap-1">
              <Flame className="h-4 w-4 text-amber-400" /> {profile.currentStreak}d streak
            </span>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-3">Achievements</p>
            <div className="grid grid-cols-2 gap-2">
              {badges.map((b: any) => (
                <div key={b.id} className="rounded border border-primary/20 bg-primary/5 p-2 text-center">
                  <Trophy className="h-4 w-4 mx-auto text-primary mb-1" />
                  <p className="text-[9px] font-bold uppercase">{b.title}</p>
                </div>
              ))}
              {!badges.length && (
                <p className="col-span-2 text-center text-xs text-muted-foreground py-4">No badges yet.</p>
              )}
            </div>
          </div>
          <Badge variant="outline" className="w-full justify-center text-[9px]">
            Longest streak: {profile.longestStreak} days
          </Badge>
        </CardContent>
      </Card>
    </div>
  );
}
