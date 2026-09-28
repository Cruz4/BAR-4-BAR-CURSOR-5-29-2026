'use client';

/**
 * Artist Home — master lacquer sheet.
 * Living Inkfilm field + die-cut module plates. No glassmorphism card grid.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ChevronLeft, Compass, Dna, Flame, Gift, Globe, Music, PenLine, Repeat2, Settings2, Star, Trophy, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { parseActivityPostHash, scrollActivityPostTarget } from '@/lib/activity/post-deep-link';
import type { PublicProfileData } from '@/components/profile/public-profile-showcase';
import { CopyProfileLinkButton } from '@/components/profile/copy-profile-link-button';
import { FirstDropsStorefront, lyricDnaItems, musicReleaseItems } from '@/components/profile/live-dna-drop-card';
import { isHouseReleaseVisibleOnHome } from '@/lib/house-artist-link';
import { AlbumCoverCollage } from '@/components/gamification/album-cover-collage';
import { ProfileInitialsStar } from '@/components/profile/profile-initials-star';
import { rankBadgeClass, rankIdFromLabel } from '@/lib/gamification/badge-styles';
import { rankFromXp, STUDIO_RANKS } from '@/lib/gamification/ranks';
import { StudioStandingRankBadge } from '@/components/gamification/studio-standing-foil-dialog';
import { ACHIEVEMENTS } from '@/lib/gamification/achievements';
import { FriendButton } from '@/components/profile/friend-button';
import { SupportButton } from '@/components/profile/support-button';
import { PassBarButton } from '@/components/folds/pass-bar-dialog';
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
  DropShelfModule,
  ImprintShelfModule,
  FriendsModule,
  GuestbookModule,
  NowPlayingModule,
  OpenLockModule,
  ProofWallModule,
  RhymeFingerprintModule,
  BarBoardModule,
  WallModule,
  type ModuleContext,
} from '@/components/profile/profile-modules';
import { useAuth } from '@/hooks/use-auth';
import { resolveLiveDnaDropItemHref } from '@/lib/dna-drop-access';
import { fetchGamificationSummary } from '@/lib/gamification-client';
import { trackGuestSignupCta } from '@/lib/guest-funnel-client';
import { guestTryHref } from '@/lib/guest-try';
import { prefetchGuestTrySheetNow, prefetchGuestTrySheetWhenIdle } from '@/lib/prefetch-guest-try-sheet';
import { ProfileSocialExampleBadges, ProfileSocialLinks } from '@/components/profile/profile-social-links';
import { ProfileContactChip } from '@/components/profile/profile-contact-chip';
import { ProfileMediaLightbox } from '@/components/profile/profile-media-lightbox';
import { ArtistHomeGuestClaim } from '@/components/profile/artist-home-guest-claim';
import { VesperfoldMark } from '@/components/profile/vesperfold-mark';
import { normalizeVesperfoldSeed } from '@/lib/profile/vesperfold';
import { profileHref, profileDnaHref, profileReverbsHref } from '@/lib/profile/profile-slug';
import { buildLoginUrl } from '@/lib/login-links';
import { useLockFeature } from '@/hooks/use-lock-feature';
import { useFirstDropsFeature } from '@/hooks/use-first-drops-feature';
import { parseStudioBadge } from '@/lib/studio-tier-chrome';
import { Hint } from '@/components/ui/tooltip';
import { SoundIdentityStrip } from '@/components/profile/sound-identity-strip';
import { ArtistHomeBackButton } from '@/components/profile/artist-home-back-button';
import { ProfileSectionTabs } from '@/components/profile/profile-section-tabs';
import type { PublicWallPostsPage } from '@/lib/server/public-post';
import type { ProfilePost } from '@/lib/profile/social-client';
import { DoorKnockHomeListener } from '@/components/profile/door-knock-home-listener';
import { ProfileReachStrip } from '@/components/reach/profile-reach-strip';

type ArtistHomeProps = {
  profile: PublicProfileData;
  config: ArtistHomeConfig;
  isOwner: boolean;
  /** Server-rendered first wall page for crawlers and instant paint. */
  initialWallPosts?: PublicWallPostsPage | null;
  /** Server-rendered imprint shelf posts when configured. */
  initialImprintPosts?: ProfilePost[];
  /** Full-page draft preview from Edit Public Page (not the live URL). */
  previewMode?: boolean;
  previewViewport?: 'phone' | 'tablet' | 'desktop';
  /** Keep the animated Pressing background inside an embedded preview frame. */
  embeddedPreview?: boolean;
  onExitPreview?: () => void;
  /**
   * Guest landing playground — local Wall posts (no Firestore).
   * Wired into WallModule via ModuleContext.
   */
  playgroundWall?: ModuleContext['playgroundWall'];
  playgroundFriends?: ModuleContext['playgroundFriends'];
  playgroundGuestbook?: ModuleContext['playgroundGuestbook'];
  playgroundBarOfWeek?: ModuleContext['playgroundBarOfWeek'];
  /** Where the top-left studio / about control goes (guest sandbox → `/welcome`). */
  studioHomeHref?: string;
  studioHomeLabel?: string;
};

const MODULE_RENDERERS: Record<string, React.ComponentType<{ ctx: ModuleContext }>> = {
  nowPlaying: NowPlayingModule,
  barOfWeek: BarOfWeekModule,
  rhymeFingerprint: RhymeFingerprintModule,
  barBoard: BarBoardModule,
  theCatch: BarBoardModule,
  openLock: OpenLockModule,
  dropShelf: DropShelfModule,
  imprintShelf: ImprintShelfModule,
  proofWall: ProofWallModule,
  wall: WallModule,
  friends: FriendsModule,
  guestbook: GuestbookModule,
};

export function ArtistHome({
  profile,
  config,
  isOwner,
  initialWallPosts = null,
  initialImprintPosts = [],
  previewMode = false,
  previewViewport = 'desktop',
  embeddedPreview = false,
  onExitPreview,
  playgroundWall,
  playgroundFriends,
  playgroundGuestbook,
  playgroundBarOfWeek,
  studioHomeHref = '/',
  studioHomeLabel = 'AKAsheet',
}: ArtistHomeProps) {
  const { user } = useAuth();
  const { enabled: lockOn } = useLockFeature();
  const { enabled: firstDropsOn } = useFirstDropsFeature();
  const [photoOpen, setPhotoOpen] = useState(false);
  const [viewerSlug, setViewerSlug] = useState<string | undefined>(undefined);
  const [tokens, setTokens] = useState<PressingTokens>(() => pressTokens(config.theme));

  useEffect(() => {
    setTokens(pressTokens(config.theme));
  }, [config.theme]);

  useEffect(() => {
    if (user) return;
    prefetchGuestTrySheetWhenIdle();
  }, [user]);

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
  const totalXp = Number(profile.xp) || 0;
  const computedRank = rankFromXp(totalXp, parseStudioBadge(profile.studioBadge) === 'pro');
  const savedRankLabel = profile.rankLabel?.trim();
  const rankId =
    profile.rankId ?? (savedRankLabel ? rankIdFromLabel(savedRankLabel) : computedRank.id);
  const rankLabel =
    savedRankLabel || STUDIO_RANKS.find((rank) => rank.id === rankId)?.label || computedRank.label;
  const liveDnaDrops = useMemo(() => {
    const hidden = config.featured.hiddenHouseReleaseShareIds;
    return (profile.liveDnaDrops || []).filter(
      (drop) => !(drop.houseRelease && !isHouseReleaseVisibleOnHome(drop.shareId, hidden))
    );
  }, [profile.liveDnaDrops, config.featured.hiddenHouseReleaseShareIds]);
  const saleDrops = useMemo(
    () => (firstDropsOn ? musicReleaseItems(liveDnaDrops) : []),
    [firstDropsOn, liveDnaDrops]
  );
  const dnaDrops = useMemo(() => lyricDnaItems(liveDnaDrops), [liveDnaDrops]);
  const houseDrops = useMemo(
    () => musicReleaseItems(liveDnaDrops).filter((drop) => drop.houseRelease),
    [liveDnaDrops]
  );
  const artistSaleDrops = useMemo(() => saleDrops.filter((drop) => !drop.houseRelease), [saleDrops]);

  const useCustomPhoto =
    profile.profilePhotoMode === 'custom' &&
    typeof profile.profilePhotoUrl === 'string' &&
    profile.profilePhotoUrl.trim().length > 0;
  // Retroactive: old accounts often still say "collage" with zero covers → stock star.
  const collageUrls = (profile.albumCoverUrls || []).filter(
    (u) => typeof u === 'string' && u.trim().length > 0
  );
  const useCollageHero = profile.profilePhotoMode === 'collage' && collageUrls.length > 0;
  const useInitialsHero = !useCustomPhoto && !useCollageHero;
  const useStarMark = Boolean(profile.starMarkUseStar);
  const starSeed = normalizeVesperfoldSeed(profile.starMarkSeed ?? 0);
  const liveStreak = Number(profile.currentStreak) || 0;
  const bestStreak = Number(profile.longestStreak) || 0;
  const displayNameWords = useMemo(
    () =>
      profile.displayName
        .trim()
        // Treat a colon as a name separator even when imported account data omitted the space.
        .replace(/:\s*/g, ': ')
        .split(/\s+/)
        .filter(Boolean),
    [profile.displayName]
  );
  const longestDisplayNameWord = Math.max(
    0,
    ...displayNameWords.map((word) => Array.from(word).length)
  );
  const displayNameScale =
    longestDisplayNameWord >= 17 ? 'long' : longestDisplayNameWord >= 12 ? 'medium' : 'default';
  const displayNameSizeClass =
    displayNameScale === 'long'
      ? 'text-[clamp(1.7rem,4.5vw,3.5rem)]'
      : displayNameScale === 'medium'
        ? 'text-[clamp(2rem,5.5vw,4.25rem)]'
        : 'text-[clamp(2.4rem,7.5vw,5rem)]';

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
    return config.modules.filter((m) => {
      if (!m.enabled) return false;
      if (m.id === 'openLock' && !lockOn) return false;
      return true;
    });
  }, [config.modules, lockOn]);

  const showLiveDnaDrops = useMemo(
    () => config.modules.some((m) => m.id === 'dropShelf' && m.enabled),
    [config.modules]
  );
  const showFirstDropsStorefront = artistSaleDrops.length > 0 || houseDrops.length > 0;

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const hash = window.location.hash.replace(/^#/, '');
    if (parseActivityPostHash(window.location.hash)) return;
    if (hash.startsWith('artist-home-')) return;
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }, [profile.slug]);

  // Deep-link from Activity Open → #post-{id}[:comments|:c-{commentId}]
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const run = () => {
      const target = parseActivityPostHash(window.location.hash);
      if (!target) return;
      const tryScroll = () => scrollActivityPostTarget(target);
      window.setTimeout(tryScroll, 80);
      window.setTimeout(tryScroll, 450);
      window.setTimeout(tryScroll, 900);
      window.setTimeout(tryScroll, 1600);
    };
    run();
    window.addEventListener('hashchange', run);
    return () => window.removeEventListener('hashchange', run);
  }, [profile.slug, enabledModules.length]);

  return (
    <div
      data-preview-viewport={previewMode ? previewViewport : undefined}
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
        .ph-artist-name {
          hyphens: none;
          overflow-wrap: normal;
          text-wrap: balance;
          word-break: normal;
        }
        [data-preview-viewport='phone'] .ph-hero-grid,
        [data-preview-viewport='tablet'] .ph-hero-grid {
          grid-template-columns: minmax(0, 1fr) !important;
        }
        [data-preview-viewport='phone'] .ph-artist-name {
          font-size: clamp(2rem, 10vw, 3.1rem) !important;
        }
        [data-preview-viewport='tablet'] .ph-artist-name {
          font-size: clamp(2.4rem, 7vw, 4.6rem) !important;
        }
        [data-preview-viewport='phone'] .ph-hero-grid > *,
        [data-preview-viewport='tablet'] .ph-hero-grid > * {
          grid-column: auto !important;
        }
        [data-preview-viewport='phone'] .ph-module-deck {
          column-count: initial !important;
          display: grid;
          grid-template-columns: minmax(0, 1fr) !important;
        }
        [data-preview-viewport='tablet'] .ph-module-deck {
          column-count: initial !important;
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
        }
        [data-preview-viewport='tablet'] .ph-module-deck > .ph-module-item[data-full-bleed='true'] {
          grid-column: 1 / -1;
        }
        [data-preview-viewport='tablet'] .ph-module-deck > .ph-module-item[data-module-size='S'] {
          justify-self: start;
          width: 78%;
        }
        /*
         * iPadOS/WebKit can leave stale hit-test regions when transformed,
         * clipped cards are fragmented across CSS columns. Keep the desktop
         * masonry, but use a real grid anywhere touch is available so every
         * module control remains the topmost tappable target.
         */
        @media (any-pointer: coarse) {
          .ph-artist-name[data-name-scale='default'] {
            font-size: clamp(2.2rem, 6vw, 4.35rem);
          }
          .ph-artist-name[data-name-scale='medium'] {
            font-size: clamp(1.9rem, 5vw, 3.75rem);
          }
          .ph-artist-name[data-name-scale='long'] {
            font-size: clamp(1.6rem, 4vw, 3.15rem);
          }
          .ph-module-deck {
            column-count: initial !important;
            display: grid;
            grid-template-columns: minmax(0, 1fr);
          }
          .ph-module-deck > .ph-module-item {
            break-inside: auto;
            isolation: isolate;
            margin-bottom: 0;
            min-width: 0;
            position: relative;
          }
          .ph-module-deck a,
          .ph-module-deck button,
          .ph-module-deck input,
          .ph-module-deck textarea,
          .ph-module-deck [role='button'] {
            touch-action: manipulation;
          }
        }
        @media (any-pointer: coarse) and (min-width: 1024px) {
          .ph-module-deck {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
          .ph-module-deck > .ph-module-item[data-full-bleed='true'] {
            grid-column: 1 / -1;
          }
          .ph-module-deck > .ph-module-item[data-module-size='S'] {
            justify-self: start;
            width: 78%;
          }
        }
        @media (any-pointer: fine) and (min-width: 1024px) {
          .ph-module-deck > .ph-module-item[data-module-size='S'] {
            width: 78%;
          }
        }
      `}</style>

      <LivingPressField
        config={config.theme}
        compact={embeddedPreview}
        onTokensChange={onTokensChange}
      />

      <div className="relative z-10 mx-auto w-full max-w-[1200px] px-4 pt-3 sm:px-6 sm:pt-10">
        {/* Sheet header */}
        <div className="flex items-center gap-1.5 border-b border-dashed border-[var(--ph-border)] pb-3 sm:gap-2 sm:pb-4">
          <div className="flex min-w-0 shrink items-center gap-1.5 sm:gap-3">
            {studioHomeHref === '/' && !previewMode && !playgroundWall ? (
              <ArtistHomeBackButton label="Back" profileSlug={profile.slug} />
            ) : (
              <Button
                size="sm"
                variant="outline"
                className="h-8 gap-1.5 border-[var(--ph-accent)]/45 bg-[var(--ph-accent)]/12 px-3 text-[11px] font-bold uppercase tracking-widest text-[var(--ph-accent)] shadow-none hover:bg-[var(--ph-accent)]/22 hover:text-[var(--ph-accent)]"
                asChild
              >
                <Link href={studioHomeHref}>
                  <ChevronLeft className="h-4 w-4" /> <span className="hidden sm:inline">{studioHomeLabel}</span>
                </Link>
              </Button>
            )}
            <span className="hidden font-code text-[9px] uppercase tracking-[0.3em] text-[var(--ph-muted)] min-[420px]:inline">
              {tokens.plateSerial}
              {tokens.autoDrift ? ' · restless' : ''}
            </span>
          </div>
          <div className="ml-auto flex min-w-0 items-center justify-end gap-1 sm:gap-2 [&_button]:shrink-0">
            {previewMode && onExitPreview ? (
              <Button
                size="sm"
                variant="outline"
                className="h-9 gap-1.5 font-bold uppercase"
                onClick={onExitPreview}
              >
                <PenLine className="h-3.5 w-3.5" /> Back to edit
              </Button>
            ) : previewMode ? null : (
              <>
                {isOwner ? (
                  <Button size="sm" variant="outline" className="h-8 gap-1 px-2 font-bold uppercase sm:h-9 sm:gap-1.5 sm:px-3" asChild>
                    <Link href="/profile/customize">
                      <Settings2 className="h-3.5 w-3.5 shrink-0" />
                      <span className="text-[9px] tracking-wide sm:text-xs sm:tracking-widest">Edit Public Page</span>
                    </Link>
                  </Button>
                ) : profile.userId ? (
                  <>
                    <PassBarButton
                      peerId={profile.userId}
                      peerName={profile.displayName}
                      senderSlug={viewerSlug}
                    />
                    <SupportButton
                      targetUserId={profile.userId}
                      targetName={profile.displayName}
                    />
                    <FriendButton
                      targetUserId={profile.userId}
                      targetName={profile.displayName}
                      targetSlug={profile.slug}
                      viewerSlug={viewerSlug}
                    />
                  </>
                ) : null}
                {profile.slug ? (
                  <CopyProfileLinkButton slug={profile.slug} displayName={profile.displayName} />
                ) : null}
              </>
            )}
          </div>
        </div>

        {!previewMode && !playgroundWall ? (
          <ProfileSectionTabs slug={profile.slug} className="mt-3" />
        ) : null}

        {/* Hero — original scale; preview/sandbox centers shorter copy with the photo column */}
        <section
          className={cn(
            'ph-hero-grid mt-8 grid gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500 lg:grid-cols-12',
            previewMode ? 'lg:items-center' : 'lg:items-end'
          )}
        >
          <div className="min-w-0 space-y-5 lg:col-span-7">
            {config.featured.tagline || (isOwner && profile.slug && !previewMode) ? (
              <div className="flex items-center justify-between gap-3">
                {config.featured.tagline ? (
                  <p className="min-w-0 text-[11px] font-bold uppercase tracking-[0.4em] text-[var(--ph-accent)]">
                    {config.featured.tagline}
                  </p>
                ) : (
                  <span className="min-w-0" />
                )}
                {profile.slug && !previewMode ? (
                  <ProfileReachStrip
                    slug={profile.slug}
                    ownerId={profile.userId}
                    profileViewCount={profile.profileViewCount ?? profile.ownerProfileViewCount}
                    profileViewCountUnique={profile.profileViewCountUnique}
                    legacyProfilePageLoads={profile.legacyProfilePageLoads}
                    className="shrink-0 text-[var(--ph-muted)]"
                  />
                ) : null}
              </div>
            ) : null}
            <h1
              data-profile-safe-check
              data-name-scale={displayNameScale}
              className={cn(
                'ph-artist-name whitespace-normal font-bold leading-[0.94] text-[var(--ph-text)]',
                displayNameSizeClass,
                pressingTypeClass(tokens.typeVariant)
              )}
            >
              {displayNameWords.map((word, index) => (
                <React.Fragment key={`${word}-${index}`}>
                  {index > 0 ? ' ' : null}
                  <span className="inline-block whitespace-nowrap">{word}</span>
                </React.Fragment>
              ))}
              {parseStudioBadge(profile.studioBadge) === 'pro' ? (
                <Hint content="Studio Pro" skipOnTouch>
                  <span
                    className="ml-[0.35em] inline-flex translate-y-[-0.12em] items-center gap-0.5 align-middle text-[10px] font-bold uppercase tracking-[0.22em] text-accent"
                    aria-label="Studio Pro"
                  >
                    <Star className="h-2.5 w-2.5 fill-accent" />
                    Pro
                  </span>
                </Hint>
              ) : null}
            </h1>
            <SoundIdentityStrip identity={config.featured.soundIdentity} />
            <div data-profile-safe-check className="flex min-w-0 flex-row flex-wrap items-center gap-2 sm:gap-3">
              <StudioStandingRankBadge
                variant="pill"
                allowShare={isOwner}
                compactOnMobile={showFirstDropsStorefront}
                className="self-start"
                badgeClassName={cn(
                  rankBadgeClass(rankId),
                  'border-white/35 bg-black/80 text-white shadow-[0_8px_24px_rgba(0,0,0,0.55)] backdrop-blur-md'
                )}
                stats={{
                  displayName: profile.displayName,
                  rankId,
                  rankLabel,
                  xp: profile.xp,
                  streak: profile.currentStreak,
                  longestStreak: profile.longestStreak,
                  lifetimeBarsWritten: profile.lifetimeBarsWritten,
                  lifetimeLinesGenerated: profile.lifetimeLinesGenerated,
                  badgeCount: profile.badges?.length || Object.keys(profile.unlockedAchievements || {}).length,
                  totalBadges: ACHIEVEMENTS.length,
                  profileSlug: profile.slug,
                }}
              />
              {artistSaleDrops.length > 0 && (
                artistSaleDrops.length === 1 ? (
                  <Button
                    asChild
                    size="sm"
                    className="h-10 min-w-0 flex-1 gap-1.5 overflow-hidden whitespace-nowrap bg-fuchsia-400 px-3 text-center font-bold uppercase leading-tight tracking-wider text-black hover:bg-fuchsia-300 sm:h-9 sm:w-auto sm:flex-none sm:px-4"
                  >
                    <Link
                      href={artistSaleDrops[0].type === 'album' ? `/share/${artistSaleDrops[0].shareId}` : `/song/${artistSaleDrops[0].shareId}`}
                      className="inline-flex max-w-full items-center gap-1.5"
                      aria-label={`Listen to or buy ${artistSaleDrops[0].title}${artistSaleDrops[0].dropPriceSummary ? ` · ${artistSaleDrops[0].dropPriceSummary}` : ''}`}
                      title={artistSaleDrops[0].dropPriceSummary ? `Listen / buy · ${artistSaleDrops[0].dropPriceSummary}` : 'Listen / buy'}
                    >
                      <Music className="h-3.5 w-3.5 shrink-0" />
                      <span className="min-w-0 truncate sm:hidden">Listen / buy</span>
                      <span className="hidden min-w-0 truncate sm:inline">
                        Listen
                        {artistSaleDrops[0].dropPriceSummary ? ` · ${artistSaleDrops[0].dropPriceSummary}` : ''}
                      </span>
                    </Link>
                  </Button>
                ) : (
                  <Button
                    asChild
                    size="sm"
                    className="h-10 min-w-0 flex-1 gap-1.5 overflow-hidden whitespace-nowrap bg-fuchsia-400 px-3 text-center font-bold uppercase leading-tight tracking-wider text-black hover:bg-fuchsia-300 sm:h-9 sm:w-auto sm:flex-none sm:px-4"
                  >
                    <a
                      href="#first-drops"
                      className="inline-flex max-w-full items-center gap-1.5"
                      aria-label={`Listen to or buy from ${artistSaleDrops.length} releases`}
                      title={`Listen / buy · ${artistSaleDrops.length} releases`}
                    >
                      <Music className="h-3.5 w-3.5 shrink-0" />
                      <span className="min-w-0 truncate sm:hidden">Listen / buy</span>
                      <span className="hidden min-w-0 truncate sm:inline">Listen · {artistSaleDrops.length} releases</span>
                    </a>
                  </Button>
                )
              )}
              {houseDrops.length > 0 ? (
                <Button
                  asChild
                  size="sm"
                  variant="outline"
                  className="h-9 max-w-full gap-1.5 border-cyan-300/45 bg-cyan-400/10 px-3 font-bold uppercase tracking-wider text-cyan-100 hover:border-cyan-200 hover:bg-cyan-400/20 hover:text-white"
                >
                  <Link
                    href={houseDrops.length === 1
                      ? houseDrops[0].type === 'album' ? `/share/${houseDrops[0].shareId}` : `/song/${houseDrops[0].shareId}`
                      : '#first-drops'}
                    className="inline-flex max-w-full items-center gap-1.5"
                  >
                    <Gift className="h-3.5 w-3.5 shrink-0" />
                    <span className="min-w-0 truncate">
                      House free · {houseDrops.length} {houseDrops.length === 1 ? 'release' : 'releases'}
                    </span>
                  </Link>
                </Button>
              ) : null}
              {showLiveDnaDrops && dnaDrops.length > 0 && (() => {
                const dnaTabHref = profileDnaHref(profile.slug) || `/${profile.slug}/dna`;
                if (dnaDrops.length === 1) {
                  return (
                    <Button
                      asChild
                      variant="outline"
                      size="sm"
                      className={cn(
                        'h-8 max-w-full gap-1.5 border-[var(--ph-border)] bg-[var(--ph-plate)] px-3 font-bold uppercase tracking-wider text-[var(--ph-accent)] hover:border-[var(--ph-accent)]',
                        showFirstDropsStorefront && 'max-sm:w-full max-sm:basis-full'
                      )}
                    >
                      <Link href={resolveLiveDnaDropItemHref(dnaDrops[0], Boolean(user))} className="inline-flex max-w-full items-center gap-1.5">
                        <Dna className="h-3.5 w-3.5 shrink-0" />
                        <span className="min-w-0 truncate">Lyric DNA Drop</span>
                      </Link>
                    </Button>
                  );
                }
                const label = `${dnaDrops.length} Lyric DNA Drops`;
                return (
                  <Button
                    asChild
                    variant="outline"
                    size="sm"
                    className={cn(
                      'h-8 max-w-full gap-1.5 border-[var(--ph-border)] bg-[var(--ph-plate)] px-3 font-bold uppercase tracking-wider text-[var(--ph-accent)] hover:border-[var(--ph-accent)]',
                      showFirstDropsStorefront && 'max-sm:w-full max-sm:basis-full'
                    )}
                  >
                    <Link href={dnaTabHref} className="inline-flex max-w-full items-center gap-1.5">
                      <Dna className="h-3.5 w-3.5 shrink-0" />
                      <span className="min-w-0 truncate">{label}</span>
                    </Link>
                  </Button>
                );
              })()}
            </div>
            {config.featured.bio && (
              <p className="max-w-xl text-sm leading-relaxed text-[var(--ph-muted)]">{config.featured.bio}</p>
            )}

            <div className="w-full max-w-md min-w-0 space-y-3">
              <div className="grid min-w-0 grid-cols-2 gap-1.5 sm:grid-cols-3 sm:gap-2">
                {[
                  { label: 'Total XP', value: totalXp.toLocaleString(), icon: Zap },
                  { label: 'Live streak', value: `${liveStreak}d`, icon: Flame },
                  { label: 'Best streak', value: `${bestStreak}d`, icon: Trophy },
                ].map((stat) => (
                  <div
                    key={stat.label}
                    className="flex min-w-0 flex-col items-center justify-center border border-[var(--ph-border)] bg-[var(--ph-plate)] px-1.5 py-2.5 text-center sm:px-2"
                  >
                    <stat.icon className="mb-1 h-3.5 w-3.5 shrink-0 text-[var(--ph-accent)]" />
                    <p className="max-w-full truncate font-code text-sm font-bold leading-none tracking-tight text-[var(--ph-text)] tabular-nums sm:text-base md:text-lg">
                      {stat.value}
                    </p>
                    <p className="mt-1.5 max-w-full break-words text-[8px] font-bold uppercase leading-tight tracking-[0.08em] text-[var(--ph-muted)] sm:text-[9px] sm:tracking-[0.12em] md:text-[10px]">
                      {stat.label}
                    </p>
                  </div>
                ))}
              </div>
              {(!previewMode || config.featured.contact) && (
                <div
                  className={cn(
                    'grid min-w-0 gap-2',
                    !previewMode && config.featured.contact ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1'
                  )}
                >
                  {!previewMode ? (
                    <Link
                      href={profileReverbsHref(profile.slug) || `/${profile.slug}/reverbs`}
                      className="inline-flex h-9 w-full min-w-0 items-center justify-center gap-1.5 rounded-full border border-violet-400/40 bg-violet-500/15 px-3 text-[10px] font-bold uppercase tracking-[0.18em] text-violet-200 shadow-[0_0_0_1px_rgba(167,139,250,0.12)] transition-all hover:border-violet-300/70 hover:bg-violet-500/25 hover:text-violet-100 hover:shadow-[0_0_16px_rgba(139,92,246,0.25)]"
                    >
                      <Repeat2 className="h-3.5 w-3.5 shrink-0" />
                      Reverbs
                    </Link>
                  ) : null}
                  {config.featured.contact ? (
                    <div className="min-w-0">
                      <ProfileContactChip
                        artistId={profile.userId}
                        artistSlug={profile.slug}
                        contact={config.featured.contact}
                        isOwner={isOwner}
                        previewMode={previewMode}
                        viewerName={user?.displayName || undefined}
                        viewerSlug={viewerSlug}
                      />
                    </div>
                  ) : null}
                </div>
              )}
            </div>
          </div>

          <div className="flex min-w-0 justify-center overflow-visible lg:col-span-5 lg:justify-end">
            <div className="relative w-full max-w-[20rem] animate-in fade-in zoom-in-95 duration-500 sm:max-w-96">
              {tokens.alive && (
                <div
                  aria-hidden
                  className="ph-hero-breath pointer-events-none absolute inset-0 sm:-inset-5"
                  style={{
                    background: `radial-gradient(circle, hsl(${tokens.hue} 70% 60% / 0.2), transparent 70%)`,
                    animation: `ph-hero-breath var(--ph-breath) ease-in-out infinite`,
                  }}
                />
              )}
              <div
                className="absolute inset-0 opacity-60 blur-xl sm:-inset-3"
                style={{
                  background: `linear-gradient(135deg, var(--ph-accent-soft), var(--ph-accent2-soft))`,
                }}
              />
              <button
                type="button"
                onClick={() => setPhotoOpen(true)}
                aria-label={`View ${profile.displayName}'s profile photo`}
                className="relative aspect-square w-full max-w-full cursor-zoom-in overflow-hidden border border-[var(--ph-border)] shadow-[0_24px_80px_rgba(0,0,0,0.55)] transition-transform hover:scale-[1.01] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ph-accent,#7dd3fc)]"
                style={{ clipPath: dieCutClip(((tokens.cutStyle + 1) % 6) as 0 | 1 | 2 | 3 | 4 | 5) }}
              >
                {useCustomPhoto ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={profile.profilePhotoUrl!} alt="" className="h-full w-full object-cover" />
                ) : useInitialsHero ? (
                  <ProfileInitialsStar
                    displayName={profile.displayName}
                    className="h-full w-full border-0"
                    studioChrome={parseStudioBadge(profile.studioBadge)}
                  />
                ) : (
                  <AlbumCoverCollage
                    urls={collageUrls}
                    displayName={profile.displayName}
                    className="h-full w-full border-0 shadow-none"
                    studioChrome={parseStudioBadge(profile.studioBadge)}
                  />
                )}
                {useStarMark && (
                  <span
                    className="pointer-events-none absolute bottom-3 right-3 z-10 flex h-9 w-9 items-center justify-center overflow-hidden rounded-full border border-white/20 bg-black/70 shadow-[0_8px_24px_rgba(0,0,0,0.45)] ring-2 ring-black/40"
                    title="Feed star mark"
                    aria-hidden
                  >
                    <VesperfoldMark seed={starSeed} size={34} />
                  </span>
                )}
              </button>
              {previewMode && !isOwner ? (
                <div className="relative z-20 mt-3 space-y-1.5 text-center">
                  <ProfileSocialExampleBadges />
                  <p className="text-[10px] leading-snug text-[var(--ph-muted)]">
                    (example socials — upload or change your picture once you sign in)
                  </p>
                </div>
              ) : (
                <ProfileSocialLinks
                  socials={config.featured.socials}
                  voiceMemo={config.featured.voiceMemo}
                  className="relative z-20 mt-3 pointer-events-auto"
                />
              )}
            </div>
          </div>
        </section>

        {showFirstDropsStorefront ? (
          <FirstDropsStorefront drops={liveDnaDrops} isOwner={isOwner} />
        ) : null}

        {/* Module deck — original width, masonry so S/M don't leave holes */}
        <div className="ph-module-deck mt-12 columns-1 gap-5 lg:columns-2 lg:gap-5">
          {enabledModules.map((setting, i) => {
            const Renderer = MODULE_RENDERERS[setting.id];
            if (!Renderer) return null;
            const ctx: ModuleContext = {
              profileUserId: profile.userId || '',
              profileName: profile.displayName,
              profileSlug: profile.slug,
              activityFromPath: profile.slug
                ? profileHref(profile.slug) ?? `/${profile.slug}`
                : undefined,
              isOwner,
              previewMode,
              viewerSlug,
              featured: config.featured,
              badges: profile.badges,
              unlockedAchievements: profile.unlockedAchievements,
              rankLabel,
              xp: profile.xp,
              currentStreak: profile.currentStreak,
              liveDnaDrops,
              plate: plateChrome,
              moduleIndex: i,
              size: setting.size,
              ...(playgroundWall ? { playgroundWall } : {}),
              ...(initialWallPosts ? { initialWallPosts } : {}),
              ...(previewMode
                ? { initialImprintPosts }
                : initialImprintPosts.length
                  ? { initialImprintPosts }
                  : {}),
              ...(playgroundFriends ? { playgroundFriends } : {}),
              ...(playgroundGuestbook ? { playgroundGuestbook } : {}),
              ...(playgroundBarOfWeek ? { playgroundBarOfWeek } : {}),
            };
            const fullBleed =
              setting.size === 'L' || (setting.id === 'proofWall' && setting.size === 'M');
            return (
              <div
                key={setting.id}
                data-full-bleed={fullBleed ? 'true' : undefined}
                data-module-size={setting.size}
                className={cn(
                  'ph-module-item mb-5 break-inside-avoid animate-in fade-in slide-in-from-bottom-2 duration-500',
                  fullBleed && 'lg:[column-span:all]'
                )}
                style={{ animationDelay: `${Math.min(i * 40, 200)}ms` }}
              >
                <Renderer ctx={ctx} />
              </div>
            );
          })}
        </div>

        <footer className="mt-16 flex flex-col items-center gap-3 border-t border-dashed border-[var(--ph-border)] pt-8 text-center">
          <p className="font-code text-[9px] uppercase tracking-[0.35em] text-[var(--ph-muted)]">
            Written in AKAsheet · {tokens.plateSerial}
          </p>
          {!user && (
            <div className="flex flex-col items-center gap-2">
              <div className="flex flex-wrap items-center justify-center gap-2">
                <Button
                  size="sm"
                  className="h-9 gap-1.5 bg-[var(--ph-accent)] font-bold uppercase text-black hover:opacity-90"
                  asChild
                >
                  <Link
                    href={buildLoginUrl({
                      mode: 'signup',
                      next: profileHref(profile.slug) || '/',
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
                  <Link
                    href={guestTryHref('profile')}
                    onClick={() => trackGuestSignupCta('artist_home')}
                    onMouseEnter={() => prefetchGuestTrySheetNow()}
                    onFocus={() => prefetchGuestTrySheetNow()}
                  >
                    <PenLine className="h-3.5 w-3.5" /> Try writing free
                  </Link>
                </Button>
              </div>
              <Button
                size="sm"
                variant="outline"
                className="h-9 gap-1.5 border-sky-400/35 bg-sky-500/[0.08] font-bold uppercase text-sky-200 hover:bg-sky-500/15 hover:text-white"
                asChild
              >
                <Link href="/discover?entry=profile" scroll>
                  <Compass className="h-3.5 w-3.5" /> See what others are doing on AKAsheet
                </Link>
              </Button>
            </div>
          )}
        </footer>
      </div>

      {!previewMode ? (
        <ArtistHomeGuestClaim
          artistName={profile.displayName}
          referralCode={profile.referralCode}
          nextPath={profileHref(profile.slug) || '/'}
        />
      ) : null}

      <ProfileMediaLightbox
        open={photoOpen}
        onOpenChange={setPhotoOpen}
        title={profile.displayName}
        src={useCustomPhoto ? profile.profilePhotoUrl : null}
        fit="contain"
      >
        {!useCustomPhoto ? (
          useInitialsHero ? (
            <ProfileInitialsStar
              displayName={profile.displayName}
              className="mx-auto w-full max-w-md border-white/20"
              studioChrome={parseStudioBadge(profile.studioBadge)}
            />
          ) : (
            <AlbumCoverCollage
              urls={collageUrls}
              displayName={profile.displayName}
              className="mx-auto w-full max-w-md border-white/20 shadow-[0_0_60px_rgba(59,130,246,0.2)]"
              studioChrome={parseStudioBadge(profile.studioBadge)}
            />
          )
        ) : null}
      </ProfileMediaLightbox>

      {isOwner && profile.userId && !previewMode ? (
        <DoorKnockHomeListener
          ownerUserId={profile.userId}
          ownerSlug={profile.slug}
          enabled
        />
      ) : null}
    </div>
  );
}
