'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { StudioLoader } from '@/components/studio-loader';
import { Trophy, Flame, ChevronLeft, Sparkles, Zap, Crown } from 'lucide-react';
import { trackShareCardEvent } from '@/lib/gamification-client';
import { getAchievement } from '@/lib/gamification/achievements';
import { AlbumCoverCollage } from '@/components/gamification/album-cover-collage';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

type PublicProfile = {
  displayName: string;
  rankLabel: string;
  xp: number;
  currentStreak: number;
  longestStreak: number;
  badgeIds: string[];
  albumCoverUrls?: string[];
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
    <div className="relative min-h-screen overflow-hidden pb-16">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-32 left-1/2 h-[420px] w-[420px] -translate-x-1/2 rounded-full bg-primary/20 blur-[120px]" />
        <div className="absolute bottom-0 right-0 h-72 w-72 rounded-full bg-amber-500/10 blur-[100px]" />
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.08) 1px, transparent 1px)',
            backgroundSize: '48px 48px',
          }}
        />
      </div>

      <div className="relative container mx-auto max-w-2xl px-4 pt-8 space-y-8">
        <Link
          href="/"
          className="inline-flex items-center gap-1 text-muted-foreground hover:text-primary text-sm transition-colors"
        >
          <ChevronLeft className="h-4 w-4" /> Bar 4 Bar Studio
        </Link>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          className="relative"
        >
          <div className="absolute -inset-[1px] rounded-[1.75rem] bg-gradient-to-br from-primary via-sky-400/60 to-amber-400/40 opacity-80 blur-sm" />
          <div className="relative overflow-hidden rounded-[1.7rem] border border-white/10 bg-[#070d14]/90 backdrop-blur-xl shadow-[0_0_80px_rgba(59,130,246,0.15)]">
            <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-primary/15 to-transparent" />

            <div className="relative px-6 pt-8 pb-6 text-center space-y-5">
              <AlbumCoverCollage
                urls={profile.albumCoverUrls || []}
                displayName={profile.displayName}
                className="mx-auto h-28 w-28 sm:h-32 sm:w-32"
              />

              <div className="space-y-2">
                <p className="text-[10px] font-bold uppercase tracking-[0.35em] text-primary/80 flex items-center justify-center gap-2">
                  <Sparkles className="h-3 w-3" /> Studio Identity
                </p>
                <h1 className="font-headline text-4xl sm:text-5xl font-bold uppercase tracking-tight text-white">
                  {profile.displayName}
                </h1>
                <Badge className="bg-primary/15 text-primary border-primary/30 px-4 py-1 text-[10px] font-bold uppercase tracking-[0.25em]">
                  <Crown className="h-3 w-3 mr-1.5 inline" />
                  {profile.rankLabel}
                </Badge>
              </div>

              <div className="grid grid-cols-3 gap-3 pt-2">
                {[
                  { label: 'XP', value: profile.xp.toLocaleString(), icon: Zap, accent: 'text-sky-400' },
                  { label: 'Streak', value: `${profile.currentStreak}d`, icon: Flame, accent: 'text-amber-400' },
                  { label: 'Best', value: `${profile.longestStreak}d`, icon: Trophy, accent: 'text-primary' },
                ].map((stat) => (
                  <div
                    key={stat.label}
                    className="rounded-xl border border-white/10 bg-black/30 px-3 py-4 text-center"
                  >
                    <stat.icon className={cn('h-4 w-4 mx-auto mb-2', stat.accent)} />
                    <p className="font-headline text-xl sm:text-2xl text-white leading-none">{stat.value}</p>
                    <p className="text-[8px] font-bold uppercase tracking-widest text-muted-foreground mt-1.5">
                      {stat.label}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="border-t border-white/10 px-6 py-6 space-y-4">
              <div className="flex items-center justify-between gap-2">
                <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-muted-foreground">
                  Achievement Vault
                </p>
                <Badge variant="outline" className="text-[8px] border-primary/20 text-primary">
                  {badges.length} unlocked
                </Badge>
              </div>

              {badges.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {badges.map((b: any, i: number) => (
                    <motion.div
                      key={b.id}
                      initial={{ opacity: 0, scale: 0.92 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: i * 0.05 }}
                      className="group relative overflow-hidden rounded-xl border border-primary/20 bg-gradient-to-br from-primary/10 via-transparent to-amber-500/5 p-4 text-center transition-transform hover:scale-[1.03]"
                    >
                      <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                      <Trophy className="h-5 w-5 mx-auto text-primary mb-2 relative" />
                      <p className="text-[9px] font-bold uppercase leading-snug text-white relative">{b.title}</p>
                      {b.description && (
                        <p className="text-[8px] text-muted-foreground mt-1 line-clamp-2 relative">{b.description}</p>
                      )}
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-white/10 py-10 text-center">
                  <p className="text-xs text-muted-foreground">No badges unlocked yet — the grind continues.</p>
                </div>
              )}
            </div>
          </div>
        </motion.div>

        <p className="text-center text-[9px] font-code uppercase tracking-[0.35em] text-muted-foreground/50">
          Public studio profile · bar4bar.studio
        </p>
      </div>
    </div>
  );
}
