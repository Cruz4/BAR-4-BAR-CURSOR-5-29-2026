'use client';

/**
 * Artist Home — master lacquer sheet.
 * Living Inkfilm field + die-cut module plates. No glassmorphism card grid.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ChevronLeft, Crown, Dna, Flame, Globe, PenLine, Repeat2, Settings2, Share2, Trophy, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import type { PublicProfileData } from '@/components/profile/public-profile-showcase';
import { ProfileShareDialog } from '@/components/profile/profile-share-dialog';
import { LiveDnaDropsGroupedList } from '@/components/profile/live-dna-drop-card';
import { AlbumCoverCollage } from '@/components/gamification/album-cover-collage';
import { ProfileInitialsStar } from '@/components/profile/profile-initials-star';
import { rankBadgeClass, rankIdFromLabel } from '@/lib/gamification/badge-styles';
import { FriendButton } from '@/components/profile/friend-button';
import {
  dieCutClip,
  pressTokens,
  pressingCssVars,
  pressingTypeClass,
  type PressingTokens,
} from '@/lib/profile/pressing';
import { LivingPressField } from '@/components/profile/living-press-field';
import type { ArtistHomeConfig } from '@/lib/profile/modules';
import {
  BarOfWeekModule,
  DnaStripModule,
  DropShelfModule,
  FriendsModule,
  GuestbookModule,
  NowPlayingModule,
  ProofWallModule,
  RhymeFingerprintModule,
  TheCatchModule,
  WallModule,
  type ModuleContext,
} from '@/components/profile/profile-modules';
import { useAuth } from '@/hooks/use-auth';
import { fetchGamificationSummary } from '@/lib/gamification-client';
import { trackGuestSignupCta } from '@/lib/guest-funnel-client';
import { ProfileSocialLinks } from '@/components/profile/profile-social-links';
import { ProfileMediaLightbox } from '@/components/profile/profile-media-lightbox';
import { ArtistHomeGuestClaim } from '@/components/profile/artist-home-guest-claim';
import { VesperfoldMark } from '@/components/profile/vesperfold-mark';
import { normalizeVesperfoldSeed } from '@/lib/profile/vesperfold';
import { buildLoginUrl } from '@/lib/login-links';

type ArtistHomeProps = {
  profile: PublicProfileData;
  config: ArtistHomeConfig;
  isOwner: boolean;
  /** Full-page draft preview from Edit Public Page (not the live URL). */
  previewMode?: boolean;
  onExitPreview?: () => void;
};

const MODULE_RENDERERS: Record<string, React.ComponentType<{ ctx: ModuleContext }>> = {
  nowPlaying: NowPlayingModule,
  barOfWeek: BarOfWeekModule,
  dnaStrip: DnaStripModule,
  rhymeFingerprint: RhymeFingerprintModule,
  theCatch: TheCatchModule,
  dropShelf: DropShelfModule,
  proofWall: ProofWallModule,
  wall: WallModule,
  friends: FriendsModule,
  guestbook: GuestbookModule,
};

export function ArtistHome({
  profile,
  config,
  isOwner,
  previewMode = false,
  onExitPreview,
}: ArtistHomeProps) {
  const { user } = useAuth();
  const [shareOpen, setShareOpen] = useState(false);
  const [dropsOpen, setDropsOpen] = useState(false);
  const [photoOpen, setPhotoOpen] = useState(false);
  const [viewerSlug, setViewerSlug] = useState<string | undefined>(undefined);
  const [tokens, setTokens] = useState<PressingTokens>(() => pressTokens(config.theme));

  useEffect(() => {
    setTokens(pressTokens(config.theme));
  }, [config.theme]);

  const onTokensChange = useCallback((next: PressingTokens) => {
    setTokens(next);
  }, []);

  useEffect(() => {
    if (!user?.id) return;
    if (isOwner) {
      setViewerSlug(profile.slug);
      return;
    }
    void fetchGamificationSummary(user.id).then((summary) => {
      // Prefer a slug for comment/name links even if Artist Home is private.
      if (summary?.profileSlug) setViewerSlug(summary.profileSlug);
    });
  }, [user?.id, isOwner, profile.slug]);

  const cssVars = useMemo(() => pressingCssVars(tokens), [tokens]);
  const rankId = profile.rankId ?? rankIdFromLabel(profile.rankLabel);
  const liveDnaDrops = profile.liveDnaDrops || [];

  const useCustomPhoto =
    profile.profilePhotoMode === 'custom' &&
    typeof profile.profilePhotoUrl === 'string' &&
    profile.profilePhotoUrl.trim().length > 0;
  const useInitialsHero = profile.profilePhotoMode === 'initials';
  const useStarMark = Boolean(profile.starMarkUseStar);
  const starSeed = normalizeVesperfoldSeed(profile.starMarkSeed ?? 0);

  const profileUrl =
    typeof window !== 'undefined' && profile.slug
      ? `${window.location.origin}/profile/${profile.slug}`
      : undefined;

  const plateChrome = useMemo(
    () => ({
      serial: tokens.plateSerial,
      cutStyle: tokens.cutStyle,
      ghostText: tokens.ghostText,
    }),
    [tokens.plateSerial, tokens.cutStyle, tokens.ghostText]
  );

  const enabledModules = useMemo(() => {
    // Respect Edit Public Page toggles — never force-show a disabled module.
    return config.modules.filter((m) => m.enabled);
  }, [config.modules]);

  const showLiveDnaDrops = useMemo(
    () =>
      liveDnaDrops.length > 0 &&
      config.modules.some((m) => m.id === 'dropShelf' && m.enabled),
    [config.modules, liveDnaDrops.length]
  );

  // Deep-link from Activity Open → #post-{id}
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const hash = window.location.hash;
    if (!hash.startsWith('#post-')) return;
    const id = hash.slice(1);
    const tryScroll = () => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    const t1 = window.setTimeout(tryScroll, 80);
    const t2 = window.setTimeout(tryScroll, 450);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, [profile.slug, enabledModules.length]);

  return (
    <div
      className="relative min-h-screen overflow-x-hidden pb-24 text-[var(--ph-text)]"
      style={{ ...(cssVars as React.CSSProperties), backgroundColor: 'var(--ph-bg)' }}
    >
      <style>{`
        @keyframes ph-hero-breath {
          0%, 100% { opacity: 0.4; transform: scale(1); }
          50% { opacity: 0.8; transform: scale(1.035); }
        }
        @media (prefers-reduced-motion: reduce) {
          .ph-hero-breath { animation: none !important; }
        }
      `}</style>

      <LivingPressField config={config.theme} onTokensChange={onTokensChange} />

      <div className="relative z-10 mx-auto w-full max-w-[1200px] px-4 pt-6 sm:px-6 sm:pt-10">
        {/* Sheet header */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-dashed border-[var(--ph-border)] pb-4">
          <div className="flex flex-wrap items-center gap-3">
            <Button
              size="sm"
              variant="outline"
              className="h-8 gap-1.5 border-[var(--ph-accent)]/45 bg-[var(--ph-accent)]/12 px-3 text-[11px] font-bold uppercase tracking-widest text-[var(--ph-accent)] shadow-none hover:bg-[var(--ph-accent)]/22 hover:text-[var(--ph-accent)]"
              asChild
            >
              <Link href="/">
                <ChevronLeft className="h-4 w-4" /> Bar 4 Bar Studio
              </Link>
            </Button>
            <span className="hidden font-code text-[9px] uppercase tracking-[0.3em] text-[var(--ph-muted)] sm:inline">
              {tokens.plateSerial}
              {tokens.autoDrift ? ' · restless' : ''}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {previewMode ? (
              <Button
                size="sm"
                variant="outline"
                className="h-9 gap-1.5 font-bold uppercase"
                onClick={onExitPreview}
              >
                <PenLine className="h-3.5 w-3.5" /> Back to edit
              </Button>
            ) : isOwner ? (
              <>
                <Button size="sm" variant="outline" className="h-9 gap-1.5 font-bold uppercase" asChild>
                  <Link href="/profile/customize">
                    <Settings2 className="h-3.5 w-3.5" /> Edit Public Page
                  </Link>
                </Button>
                <Button
                  size="sm"
                  className="h-9 gap-1.5 bg-[var(--ph-accent)] font-bold uppercase text-black hover:opacity-90"
                  onClick={() => setShareOpen(true)}
                >
                  <Share2 className="h-3.5 w-3.5" /> Share
                </Button>
              </>
            ) : (
              profile.userId && (
                <FriendButton
                  targetUserId={profile.userId}
                  targetName={profile.displayName}
                  targetSlug={profile.slug}
                  viewerSlug={viewerSlug}
                />
              )
            )}
          </div>
        </div>

        {/* Hero — original scale */}
        <motion.section
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mt-8 grid gap-8 lg:grid-cols-12 lg:items-end"
        >
          <div className="space-y-5 lg:col-span-7">
            {config.featured.tagline && (
              <p className="text-[11px] font-bold uppercase tracking-[0.4em] text-[var(--ph-accent)]">
                {config.featured.tagline}
              </p>
            )}
            <h1
              className={cn(
                'text-[clamp(2.4rem,7.5vw,5rem)] font-bold leading-[0.94] text-[var(--ph-text)]',
                pressingTypeClass(tokens.typeVariant)
              )}
            >
              {profile.displayName}
            </h1>
            <div className="flex flex-wrap items-center gap-3">
              <div
                className={cn(
                  'inline-flex items-center gap-2 border px-4 py-2',
                  rankBadgeClass(rankId)
                )}
              >
                <Crown className="h-4 w-4" />
                <span className="text-xs font-bold uppercase tracking-[0.25em]">{profile.rankLabel}</span>
              </div>
              {showLiveDnaDrops && (() => {
                const albumCount = liveDnaDrops.filter((d) => d.type === 'album').length;
                const trackCount = liveDnaDrops.filter((d) => d.type === 'track').length;
                if (liveDnaDrops.length === 1) {
                  return (
                    <Button
                      asChild
                      variant="outline"
                      size="sm"
                      className="h-8 gap-1.5 border-[var(--ph-border)] bg-[var(--ph-plate)] px-3 font-bold uppercase tracking-wider text-[var(--ph-accent)] hover:border-[var(--ph-accent)]"
                    >
                      <Link href={`/share/${liveDnaDrops[0].shareId}`}>
                        <Dna className="h-3.5 w-3.5" />
                        {liveDnaDrops[0].type === 'album' ? '1 album DNA live' : '1 track DNA live'}
                      </Link>
                    </Button>
                  );
                }
                const label =
                  albumCount > 0 && trackCount > 0
                    ? `${albumCount} album${albumCount === 1 ? '' : 's'} · ${trackCount} track${trackCount === 1 ? '' : 's'} live`
                    : albumCount > 0
                      ? `${albumCount} album DNA live`
                      : `${trackCount} track DNA live`;
                return (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8 gap-1.5 border-[var(--ph-border)] bg-[var(--ph-plate)] px-3 font-bold uppercase tracking-wider text-[var(--ph-accent)] hover:border-[var(--ph-accent)]"
                    onClick={() => setDropsOpen(true)}
                  >
                    <Dna className="h-3.5 w-3.5" />
                    {label}
                  </Button>
                );
              })()}
            </div>
            {config.featured.bio && (
              <p className="max-w-xl text-sm leading-relaxed text-[var(--ph-muted)]">{config.featured.bio}</p>
            )}

            <div className="max-w-md space-y-3">
              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: 'Total XP', value: profile.xp.toLocaleString(), icon: Zap },
                  { label: 'Live streak', value: `${profile.currentStreak}d`, icon: Flame },
                  { label: 'Best streak', value: `${profile.longestStreak}d`, icon: Trophy },
                ].map((stat) => (
                  <div
                    key={stat.label}
                    className="flex flex-col items-center justify-center border border-[var(--ph-border)] bg-[var(--ph-plate)] px-2 py-2.5 text-center"
                  >
                    <stat.icon className="mb-1 h-3.5 w-3.5 text-[var(--ph-accent)]" />
                    <p className="font-code text-base font-bold leading-none tracking-tight text-[var(--ph-text)] tabular-nums sm:text-lg">
                      {stat.value}
                    </p>
                    <p className="mt-1.5 text-[9px] font-bold uppercase tracking-[0.14em] text-[var(--ph-muted)] sm:text-[10px]">
                      {stat.label}
                    </p>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-3 gap-2">
                <Link
                  href={`/profile/${profile.slug}/reverbs`}
                  className="inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-full border border-violet-400/40 bg-violet-500/15 px-3 text-[10px] font-bold uppercase tracking-[0.18em] text-violet-200 shadow-[0_0_0_1px_rgba(167,139,250,0.12)] transition-all hover:border-violet-300/70 hover:bg-violet-500/25 hover:text-violet-100 hover:shadow-[0_0_16px_rgba(139,92,246,0.25)]"
                >
                  <Repeat2 className="h-3.5 w-3.5 shrink-0" />
                  Reverbs
                </Link>
              </div>
            </div>
          </div>

          <div className="flex justify-center lg:col-span-5 lg:justify-end">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.55, delay: 0.08 }}
              className="relative w-full max-w-sm"
            >
              {tokens.alive && (
                <div
                  aria-hidden
                  className="ph-hero-breath pointer-events-none absolute -inset-5"
                  style={{
                    background: `radial-gradient(circle, hsl(${tokens.hue} 70% 60% / 0.2), transparent 70%)`,
                    animation: `ph-hero-breath var(--ph-breath) ease-in-out infinite`,
                  }}
                />
              )}
              <div
                className="absolute -inset-3 opacity-60 blur-xl"
                style={{
                  background: `linear-gradient(135deg, var(--ph-accent-soft), var(--ph-accent2-soft))`,
                }}
              />
              <button
                type="button"
                onClick={() => setPhotoOpen(true)}
                aria-label={`View ${profile.displayName}'s profile photo`}
                className="relative aspect-square w-full cursor-zoom-in overflow-hidden border border-[var(--ph-border)] shadow-[0_24px_80px_rgba(0,0,0,0.55)] transition-transform hover:scale-[1.01] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ph-accent,#7dd3fc)]"
                style={{ clipPath: dieCutClip(((tokens.cutStyle + 1) % 6) as 0 | 1 | 2 | 3 | 4 | 5) }}
              >
                {useCustomPhoto ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={profile.profilePhotoUrl!} alt="" className="h-full w-full object-cover" />
                ) : useInitialsHero ? (
                  <ProfileInitialsStar
                    displayName={profile.displayName}
                    className="h-full w-full border-0"
                  />
                ) : (
                  <AlbumCoverCollage
                    urls={profile.albumCoverUrls || []}
                    displayName={profile.displayName}
                    className="h-full w-full border-0 shadow-none"
                  />
                )}
              </button>
              {useStarMark && (
                <div
                  className="pointer-events-none absolute bottom-3 right-3 z-10 flex h-11 w-11 items-center justify-center sm:bottom-4 sm:right-4 sm:h-[3.25rem] sm:w-[3.25rem]"
                  title="Feed star mark"
                  aria-hidden
                >
                  <span className="flex h-full w-full items-center justify-center overflow-hidden rounded-full border border-white/20 bg-black/70 shadow-[0_8px_24px_rgba(0,0,0,0.45)] ring-2 ring-black/40">
                    <VesperfoldMark seed={starSeed} size={52} />
                  </span>
                </div>
              )}
              <ProfileSocialLinks
                socials={config.featured.socials}
                className="relative z-20 mt-3 pointer-events-auto"
              />
            </motion.div>
          </div>
        </motion.section>

        {/* Module deck — original width, masonry so S/M don't leave holes */}
        <div className="mt-12 columns-1 gap-5 lg:columns-2 lg:gap-5">
          {enabledModules.map((setting, i) => {
            const Renderer = MODULE_RENDERERS[setting.id];
            if (!Renderer) return null;
            const ctx: ModuleContext = {
              profileUserId: profile.userId || '',
              profileName: profile.displayName,
              profileSlug: profile.slug,
              isOwner,
              viewerSlug,
              featured: config.featured,
              badges: profile.badges,
              unlockedAchievements: profile.unlockedAchievements,
              rankLabel: profile.rankLabel,
              xp: profile.xp,
              currentStreak: profile.currentStreak,
              liveDnaDrops,
              plate: plateChrome,
              moduleIndex: i,
            };
            const fullBleed = setting.size === 'L';
            return (
              <motion.div
                key={setting.id}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-40px' }}
                transition={{ duration: 0.4, delay: Math.min(i * 0.04, 0.2) }}
                className={cn(
                  'mb-5 break-inside-avoid',
                  fullBleed && 'lg:[column-span:all]'
                )}
              >
                <Renderer ctx={ctx} />
              </motion.div>
            );
          })}
        </div>

        <footer className="mt-16 flex flex-col items-center gap-3 border-t border-dashed border-[var(--ph-border)] pt-8 text-center">
          <p className="font-code text-[9px] uppercase tracking-[0.35em] text-[var(--ph-muted)]">
            Written in Bar 4 Bar · {tokens.plateSerial}
          </p>
          {!user && (
            <div className="flex flex-wrap items-center justify-center gap-2">
              <Button
                size="sm"
                className="h-9 gap-1.5 bg-[var(--ph-accent)] font-bold uppercase text-black hover:opacity-90"
                asChild
              >
                <Link
                  href={buildLoginUrl({
                    mode: 'signup',
                    next: '/',
                    intent: 'claim_artist_home',
                    referralCode: profile.referralCode,
                  })}
                  onClick={() => trackGuestSignupCta('artist_home_footer')}
                >
                  <Globe className="h-3.5 w-3.5" /> Claim your free profile
                </Link>
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="h-9 gap-1.5 border-[var(--ph-border)] font-bold uppercase"
                asChild
              >
                <Link href="/try?src=profile" onClick={() => trackGuestSignupCta('artist_home')}>
                  <PenLine className="h-3.5 w-3.5" /> Try writing free
                </Link>
              </Button>
            </div>
          )}
        </footer>
      </div>

      <ArtistHomeGuestClaim
        artistName={profile.displayName}
        referralCode={profile.referralCode}
      />

      <ProfileMediaLightbox
        open={photoOpen}
        onOpenChange={setPhotoOpen}
        title={profile.displayName}
        src={useCustomPhoto ? profile.profilePhotoUrl : null}
        fit="contain"
      >
        {!useCustomPhoto ? (
          <AlbumCoverCollage
            urls={profile.albumCoverUrls || []}
            displayName={profile.displayName}
            className="mx-auto w-full max-w-md border-white/20 shadow-[0_0_60px_rgba(59,130,246,0.2)]"
          />
        ) : null}
      </ProfileMediaLightbox>

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

      <Dialog open={dropsOpen && showLiveDnaDrops} onOpenChange={setDropsOpen}>
        <DialogContent className="max-w-md border-[var(--ph-border)] bg-[hsl(216_28%_7%)] text-[var(--ph-text,#fff)]">
          <DialogHeader>
            <DialogTitle className="font-headline text-xl uppercase tracking-tight">
              Live DNA Drops
            </DialogTitle>
          </DialogHeader>
          <div className="max-h-[60vh] overflow-y-auto pr-1">
            <LiveDnaDropsGroupedList
              drops={liveDnaDrops}
              layout="dialog"
              onNavigate={() => setDropsOpen(false)}
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
