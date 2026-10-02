'use client';

/**
 * Guest front door — full Artist Home (same layout as a real profile).
 * Type the Pressing in the dock while the live page skins in real time.
 * Demo Wall includes samples + guest posts; claim saves pressing + user posts.
 */

import React, { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRight, ChevronUp, Globe, Music, PenLine, Sparkles, Wind } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { BrandLockup } from '@/components/brand-lockup';
import { LandingSignInLink, LandingSignupLink } from '@/components/marketing/landing-signup-link';
import { ArtistHome } from '@/components/profile/artist-home';
import { AppFeedChrome } from '@/components/site-chrome';
import type { PublicProfileData } from '@/components/profile/public-profile-showcase';
import {
  defaultArtistHomeConfig,
  type ArtistHomeConfig,
} from '@/lib/profile/modules';
import type { PressingFaders } from '@/lib/profile/pressing';
import {
  defaultGuestPressingDraft,
  persistGuestPressingDraft,
  readGuestPressingDraft,
  GUEST_SIZEABLE_MODULES,
  moduleSizeLabel,
  type GuestPressingDraft,
  type GuestWallDraftPost,
} from '@/lib/guest-pressing-session';
import type { ModuleSize } from '@/lib/profile/modules';
import { MODULE_META } from '@/lib/profile/modules';
import {
  bindPressingLeaveTracking,
  startPressingSandboxSession,
  trackPressingAction,
  trackPressingClaimCta,
  trackPressingTrySheet,
} from '@/lib/guest-pressing-analytics';
import type { ProfilePost } from '@/lib/profile/social-client';
import { normalizeVesperfoldSeed } from '@/lib/profile/vesperfold';
import type { PlaygroundProfilePhoto } from '@/components/profile/artist-home';
import { parseEmbedUrl } from '@/lib/profile/embeds';
import {
  NEOMAIYA_SOL,
  neomaiyaFriendChip,
} from '@/lib/profile/neomaiya-sol';
import {
  JORDIE_CRUZ,
  jordieFriendChip,
  jordiePlaygroundGuestbookEntry,
} from '@/lib/profile/jordie-cruz';
import { cn } from '@/lib/utils';
import { guestTryHref } from '@/lib/guest-try';
import {
  prefetchGuestTrySheetNow,
  prefetchGuestTrySheetWhenIdle,
} from '@/lib/prefetch-guest-try-sheet';
import { useFirstDropsFeature } from '@/hooks/use-first-drops-feature';
import { useIsMobile } from '@/hooks/use-mobile';
import { useLockBodyScrollWhileFocused } from '@/hooks/use-lock-body-scroll-while-focused';
import { useVisualViewportKeyboardInset } from '@/hooks/use-visual-viewport-keyboard-inset';

const PRESSING_TIP_KEY = 'b4b-guest-pressing-tip-seen';

const FADER_META: Array<{ key: keyof PressingFaders; label: string }> = [
  { key: 'heat', label: 'Color' },
  { key: 'grain', label: 'Texture' },
  { key: 'pace', label: 'Motion' },
  { key: 'ink', label: 'Depth' },
];

function draftToConfig(draft: GuestPressingDraft): ArtistHomeConfig {
  const base = defaultArtistHomeConfig();
  const barOfWeek = (draft.barOfWeek || '').trim().slice(0, 280);
  return {
    ...base,
    theme: {
      ...base.theme,
      seedText: draft.seedText,
      faders: { ...draft.faders },
      alive: draft.alive,
      autoDrift: draft.autoDrift,
    },
    featured: {
      ...base.featured,
      ...(draft.tagline ? { tagline: draft.tagline } : {}),
      ...(barOfWeek ? { barOfWeek } : {}),
    },
    modules: base.modules.map((m) => {
      if (m.id === 'openLock') return { ...m, enabled: false };
      if (m.id === 'dropShelf') return { ...m, enabled: false };
      const size = draft.moduleSizes[m.id] || m.size;
      if (m.id === 'barOfWeek') return { ...m, enabled: true, size };
      if (m.id === 'wall') return { ...m, enabled: true, size };
      if (m.id === 'friends' || m.id === 'guestbook') return { ...m, enabled: true, size };
      return { ...m, size };
    }),
  };
}

function draftToProfile(draft: GuestPressingDraft): PublicProfileData {
  const slug =
    draft.displayName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 32) || 'your-name';
  const customPhoto =
    draft.profilePhotoMode === 'custom' && draft.profilePhotoDataUrl?.trim()
      ? draft.profilePhotoDataUrl.trim()
      : '';
  return {
    displayName: draft.displayName.trim() || 'Your Name',
    rankLabel: 'Open Mic',
    rankId: 'open_mic',
    xp: 0,
    currentStreak: 0,
    longestStreak: 0,
    albumCoverUrls: [],
    badges: [],
    unlockedAchievements: {},
    profilePhotoMode: customPhoto ? 'custom' : 'initials',
    profilePhotoUrl: customPhoto || undefined,
    starMarkUseStar: draft.starMarkUseStar === true,
    starMarkSeed: draft.starMarkSeed ?? 0,
    slug,
    userId: 'guest-playground',
  };
}

function toProfilePosts(
  posts: GuestWallDraftPost[],
  ownerName: string,
  ownerSlug: string
): ProfilePost[] {
  return posts.map((p) => {
    const parsed = p.embedUrl ? parseEmbedUrl(p.embedUrl) : null;
    return {
      id: p.id,
      ownerId: 'guest-playground',
      ownerName,
      ownerSlug,
      text: p.text,
      ...(p.embedUrl ? { embedUrl: p.embedUrl } : {}),
      ...(parsed ? { embedProvider: parsed.provider } : {}),
      ...(p.imageUrl ? { imageUrl: p.imageUrl } : {}),
      createdAt: p.createdAt,
    };
  });
}

function GuestPressingLandingInner() {
  const router = useRouter();
  const { enabled: firstDropsOn } = useFirstDropsFeature();
  const [draft, setDraft] = useState<GuestPressingDraft>(() => defaultGuestPressingDraft());
  const [mixOpen, setMixOpen] = useState(false);
  const [ready, setReady] = useState(false);
  const [tipOpen, setTipOpen] = useState(false);
  const [pressingPulse, setPressingPulse] = useState(false);
  const [neoSlug, setNeoSlug] = useState<string>(NEOMAIYA_SOL.slug);
  const [neoUserId, setNeoUserId] = useState<string | undefined>(undefined);
  const [neoDisplayName, setNeoDisplayName] = useState<string>(NEOMAIYA_SOL.displayName);
  const [jordieSlug, setJordieSlug] = useState<string>(JORDIE_CRUZ.slug);
  const [jordieUserId, setJordieUserId] = useState<string | undefined>(undefined);
  const [jordieDisplayName, setJordieDisplayName] = useState<string>(JORDIE_CRUZ.displayName);
  const seedRef = useRef<HTMLTextAreaElement>(null);
  const pressingDockRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();
  const keyboardInset = useVisualViewportKeyboardInset();
  useLockBodyScrollWhileFocused(pressingDockRef, isMobile);

  const warmTrySheet = useCallback(() => {
    prefetchGuestTrySheetNow((href) => router.prefetch(href));
  }, [router]);

  useEffect(() => {
    prefetchGuestTrySheetWhenIdle((href) => router.prefetch(href));
  }, [router]);

  useEffect(() => {
    const existing = readGuestPressingDraft();
    if (existing) setDraft(existing);
    setReady(true);
    startPressingSandboxSession();
    const unbindLeave = bindPressingLeaveTracking();
    try {
      if (sessionStorage.getItem(PRESSING_TIP_KEY) !== '1') {
        const t = window.setTimeout(() => setTipOpen(true), 600);
        return () => {
          window.clearTimeout(t);
          unbindLeave();
        };
      }
    } catch {
      const t = window.setTimeout(() => setTipOpen(true), 600);
      return () => {
        window.clearTimeout(t);
        unbindLeave();
      };
    }
    return () => unbindLeave();
  }, []);

  // Resolve Jordie (guestbook welcome) + Neo (auto-friend) for sandbox chips.
  useEffect(() => {
    let cancelled = false;
    void fetch('/api/profile/neomaiya')
      .then((r) => r.json())
      .then(async (data: { slug?: string; userId?: string; displayName?: string }) => {
        if (cancelled) return;
        const uid = typeof data?.userId === 'string' ? data.userId.trim() : '';
        if (uid) setNeoUserId(uid);
        const name =
          typeof data?.displayName === 'string' && data.displayName.trim()
            ? data.displayName.trim()
            : NEOMAIYA_SOL.displayName;
        setNeoDisplayName(name);

        const next = typeof data?.slug === 'string' ? data.slug.trim() : '';
        if (!next || next === NEOMAIYA_SOL.slug) {
          setNeoSlug(NEOMAIYA_SOL.slug);
          return;
        }
        try {
          const check = await fetch(`/api/profile/${encodeURIComponent(next)}`, { method: 'GET' });
          if (!cancelled && check.ok) {
            setNeoSlug(next);
            return;
          }
        } catch {
          /* keep canonical */
        }
        if (!cancelled) setNeoSlug(NEOMAIYA_SOL.slug);
      })
      .catch(() => undefined);

    void fetch('/api/profile/jordie')
      .then((r) => r.json())
      .then(async (data: { slug?: string; userId?: string; displayName?: string }) => {
        if (cancelled) return;
        const uid = typeof data?.userId === 'string' ? data.userId.trim() : '';
        if (uid) setJordieUserId(uid);
        const name =
          typeof data?.displayName === 'string' && data.displayName.trim()
            ? data.displayName.trim()
            : JORDIE_CRUZ.displayName;
        setJordieDisplayName(name);

        const next = typeof data?.slug === 'string' ? data.slug.trim() : '';
        if (!next || next === JORDIE_CRUZ.slug) {
          setJordieSlug(JORDIE_CRUZ.slug);
          return;
        }
        try {
          const check = await fetch(`/api/profile/${encodeURIComponent(next)}`, { method: 'GET' });
          if (!cancelled && check.ok) {
            setJordieSlug(next);
            return;
          }
        } catch {
          /* keep preferred */
        }
        if (!cancelled) setJordieSlug(JORDIE_CRUZ.slug);
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, []);

  // Keep draft warm in session so claim / refresh don't lose work.
  useEffect(() => {
    if (!ready) return;
    const t = window.setTimeout(() => persistGuestPressingDraft(draft), 400);
    return () => window.clearTimeout(t);
  }, [draft, ready]);

  const dismissTip = (focusPressing: boolean) => {
    setTipOpen(false);
    trackPressingAction('tip');
    try {
      sessionStorage.setItem(PRESSING_TIP_KEY, '1');
    } catch {
      /* ignore */
    }
    if (focusPressing) {
      setPressingPulse(true);
      window.setTimeout(() => {
        seedRef.current?.focus();
        seedRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }, 80);
      window.setTimeout(() => setPressingPulse(false), 2800);
    }
  };
  const config = useMemo(() => draftToConfig(draft), [draft]);
  const profile = useMemo(() => draftToProfile(draft), [draft]);

  const update = useCallback((patch: Partial<GuestPressingDraft>) => {
    if (patch.displayName !== undefined) trackPressingAction('name');
    if (patch.seedText !== undefined) trackPressingAction('pressing');
    if (patch.tagline !== undefined) trackPressingAction('tagline');
    if (patch.barOfWeek !== undefined) trackPressingAction('bar_of_week');
    if (patch.faders !== undefined) trackPressingAction('fader');
    if (patch.moduleSizes !== undefined) trackPressingAction('module_size');
    if (patch.alive !== undefined || patch.autoDrift !== undefined) trackPressingAction('mix');
    setDraft((prev) => ({ ...prev, ...patch }));
  }, []);

  const onWallPost = useCallback((input: { text: string; embedUrl?: string; imageUrl?: string }) => {
    const clean = input.text.trim().slice(0, 1000);
    const link = input.embedUrl?.trim().slice(0, 500);
    const imageUrl =
      typeof input.imageUrl === 'string' && input.imageUrl.startsWith('data:image/')
        ? input.imageUrl.slice(0, 350_000)
        : undefined;
    if (!clean && !link && !imageUrl) return;
    trackPressingAction('wall');
    const post: GuestWallDraftPost = {
      id: `guest-${Date.now().toString(36)}`,
      text: clean,
      ...(link ? { embedUrl: link } : {}),
      ...(imageUrl ? { imageUrl } : {}),
      createdAt: new Date().toISOString(),
    };
    setDraft((prev) => ({
      ...prev,
      wallPosts: [post, ...prev.wallPosts].slice(0, 20),
    }));
  }, []);

  const onWallDelete = useCallback((id: string) => {
    setDraft((prev) => ({
      ...prev,
      wallPosts: prev.wallPosts.filter((p) => p.id !== id),
    }));
  }, []);

  const playgroundWall = useMemo(
    () => ({
      posts: toProfilePosts(
        draft.wallPosts,
        draft.displayName.trim() || 'Your Name',
        profile.slug || 'your-name'
      ),
      onPost: onWallPost,
      onDelete: onWallDelete,
    }),
    [draft.wallPosts, draft.displayName, profile.slug, onWallPost, onWallDelete]
  );

  const playgroundFriends = useMemo(
    () => [
      jordieFriendChip({
        userId: jordieUserId,
        slug: jordieSlug,
        name: jordieDisplayName,
      }),
      neomaiyaFriendChip({
        userId: neoUserId,
        slug: neoSlug,
        name: neoDisplayName,
      }),
    ],
    [jordieUserId, jordieSlug, jordieDisplayName, neoUserId, neoSlug, neoDisplayName]
  );
  const playgroundGuestbook = useMemo(() => {
    let seed = 'guest-pressing';
    try {
      const existing = sessionStorage.getItem('b4b-jordie-guestbook-seed');
      if (existing) seed = existing;
      else {
        seed = `guest-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
        sessionStorage.setItem('b4b-jordie-guestbook-seed', seed);
      }
    } catch {
      /* ignore */
    }
    return [
      jordiePlaygroundGuestbookEntry(new Date(), seed, {
        userId: jordieUserId,
        slug: jordieSlug,
        name: jordieDisplayName,
      }),
    ];
  }, [jordieUserId, jordieSlug, jordieDisplayName]);

  const playgroundProfilePhoto = useMemo<PlaygroundProfilePhoto>(
    () => ({
      onCustomPhoto: (dataUrl) => {
        trackPressingAction('photo_upload');
        update({ profilePhotoMode: 'custom', profilePhotoDataUrl: dataUrl });
      },
      onUseInitials: () => {
        trackPressingAction('photo_initials');
        update({ profilePhotoMode: 'initials', profilePhotoDataUrl: undefined });
      },
      onShuffleStar: () => {
        trackPressingAction('photo_star');
        setDraft((prev) => ({
          ...prev,
          starMarkUseStar: true,
          starMarkSeed: normalizeVesperfoldSeed(
            (Date.now() ^ ((prev.starMarkSeed ?? 0) * 997)) >>> 0
          ),
        }));
      },
    }),
    [update]
  );

  const playgroundBarOfWeek = useMemo(
    () => ({
      text: draft.barOfWeek || '',
      onChange: (text: string) => update({ barOfWeek: text.slice(0, 280) }),
    }),
    [draft.barOfWeek, update]
  );

  const onClaim = () => {
    persistGuestPressingDraft(draft);
    trackPressingClaimCta('pressing_landing');
  };

  return (
    <div className="relative min-h-screen overflow-x-hidden selection:bg-primary/30">
      <Dialog
        open={tipOpen}
        onOpenChange={(open) => {
          if (!open) dismissTip(false);
          else setTipOpen(true);
        }}
      >
        <DialogContent className="z-[300] max-w-md border-white/15 bg-[#0c1018] text-zinc-100 sm:rounded-xl">
          <DialogHeader className="space-y-3 text-left">
            <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-primary">
              Your Public Music Home
            </p>
            <DialogTitle className="font-headline text-2xl font-bold tracking-tight">
              This would be your AKAsheet profile.
            </DialogTitle>
            <DialogDescription className="text-sm leading-relaxed text-zinc-400">
              Everything behind this tip is a live preview of your public page—Wall, friends,
              guestbook, the works. <span className="font-medium text-zinc-200">It is free for artists, creators, and Music Fans</span>
              {' '}— no Pro required to claim or go live. Add public identity and taste, feature a track you released or purchased, then use{' '}
              <span className="font-medium text-zinc-200">The Pressing</span> is the customization
              tool: type a bar or sentence and the whole page skins itself in real time.
            </DialogDescription>
          </DialogHeader>
          <ul className="mt-2 space-y-2 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-3 text-[13px] text-zinc-300">
            <li className="flex gap-2">
              <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
              Type in <span className="font-medium text-zinc-100">The Pressing</span> — skins this page live
            </li>
            <li className="flex gap-2">
              <PenLine className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
              Hit <span className="font-medium text-emerald-200">Write free</span> to try the rhyme sheet
            </li>
            <li className="flex gap-2">
              <Globe className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
              Claim free to keep this look on your real profile
            </li>
            {firstDropsOn ? (
              <li className="flex gap-2">
                <Music className="mt-0.5 h-3.5 w-3.5 shrink-0 text-fuchsia-400" />
                <span>
                  Creators can sell music releases here. Music Fans can feature a purchased track with their chosen 30-second excerpt.
                </span>
              </li>
            ) : null}
          </ul>
          <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="ghost"
              className="text-zinc-400"
              onClick={() => dismissTip(false)}
            >
              Got it
            </Button>
            <Button asChild variant="outline" className="border-emerald-500/40 bg-emerald-500/10 font-bold text-emerald-100">
              <Link
                href={guestTryHref('pressing_tip')}
                onPointerEnter={warmTrySheet}
                onFocus={warmTrySheet}
                onClick={() => {
                  trackPressingTrySheet('pressing_tip');
                  dismissTip(false);
                }}
              >
                Write free
              </Link>
            </Button>
            <Button type="button" className="font-bold gap-1.5" onClick={() => dismissTip(true)}>
              Try The Pressing
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <header className="fixed top-0 left-0 right-0 z-[200] grid h-14 grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-1.5 border-b border-white/[0.06] bg-background/55 px-3 backdrop-blur-xl sm:h-16 sm:gap-2 sm:px-6">
        <nav className="flex min-w-0 items-center justify-start">
          <LandingSignInLink className="truncate text-[10px] font-bold uppercase tracking-widest text-amber-300 transition-colors hover:text-amber-200 sm:hidden">
            Sign in
          </LandingSignInLink>
        </nav>

        <BrandLockup
          variant="app"
          titleTag="h1"
          className="justify-center max-w-[min(100%,11.5rem)] sm:max-w-none"
        />

        <nav className="flex min-w-0 shrink-0 items-center justify-end gap-2 sm:gap-4">
          <Link
            href="/welcome"
            className="hidden text-[10px] font-bold uppercase tracking-widest text-muted-foreground transition-colors hover:text-primary sm:inline"
          >
            About
          </Link>
          <Link
            href="/pricing"
            className="hidden text-[10px] font-bold uppercase tracking-widest text-muted-foreground transition-colors hover:text-primary sm:inline"
          >
            Pricing
          </Link>
          <LandingSignInLink className="hidden text-[10px] font-bold uppercase tracking-widest text-amber-300 transition-colors hover:text-amber-200 sm:inline">
            Sign in
          </LandingSignInLink>
          <Button
            asChild
            className="h-8 rounded-md bg-primary px-2.5 text-[11px] font-bold text-white hover:bg-primary/90 sm:h-9 sm:px-4 sm:text-sm"
            onClick={onClaim}
          >
            <LandingSignupLink intent="claim_artist_home">
              <span className="sm:hidden">Claim</span>
              <span className="hidden sm:inline">Claim profile</span>
            </LandingSignupLink>
          </Button>
        </nav>
      </header>

      {/* Profile framing strip */}
      <div className="fixed left-0 right-0 top-14 z-[195] border-b border-primary/25 bg-primary/15 px-3 py-1 backdrop-blur-md sm:top-16 sm:px-6 sm:py-2">
        <div className="mx-auto flex max-w-[1200px] items-center justify-between gap-2 sm:flex-wrap sm:gap-x-3 sm:gap-y-1">
          <p className="min-w-0 flex-1 text-[10px] leading-snug text-zinc-200 sm:text-xs">
            <span className="font-bold text-primary">Live preview</span>
            <span className="text-zinc-400"> — your free profile page.</span>
            <span className="hidden text-zinc-300 sm:inline">
              {' '}
              Try The Pressing at the bottom to customize the skin.
              {firstDropsOn ? ' Creators can sell releases; Music Fans can feature purchased music.' : ''}
            </span>
          </p>
          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            <Link
              href="/welcome"
              className="hidden text-[10px] font-bold uppercase tracking-wider text-zinc-300 hover:text-primary hover:underline sm:inline"
            >
              About
            </Link>
            <Link
              href="/pricing"
              className="hidden text-[10px] font-bold uppercase tracking-wider text-zinc-300 hover:text-primary hover:underline sm:inline"
            >
              Pricing
            </Link>
            <button
              type="button"
              onClick={() => {
                trackPressingAction('how_it_works');
                setTipOpen(true);
              }}
              className="shrink-0 text-[10px] font-bold uppercase tracking-wider text-primary hover:underline"
            >
              How it works
            </button>
          </div>
        </div>
      </div>

      {/* Full Artist Home — same composition as a real profile */}
      <div className="pb-[min(28vh,12.5rem)] pt-[4.85rem] sm:pb-[min(26vh,11rem)] sm:pt-[7.25rem]">
        <ArtistHome
          profile={profile}
          config={config}
          isOwner={false}
          previewMode
          playgroundWall={playgroundWall}
          playgroundFriends={playgroundFriends}
          playgroundGuestbook={playgroundGuestbook}
          playgroundBarOfWeek={playgroundBarOfWeek}
          playgroundProfilePhoto={playgroundProfilePhoto}
          studioHomeHref="/welcome"
          studioHomeLabel="About AKAsheet"
        />
        <div className="mx-auto max-w-[1200px] px-3 pt-6 sm:px-6">
          <AppFeedChrome />
        </div>
      </div>

      {/* Live Pressing dock — type here, page updates underneath */}
      <div
        ref={pressingDockRef}
        className="fixed inset-x-0 z-[190] border-t border-white/10 bg-black/80 backdrop-blur-xl max-sm:max-h-[min(100dvh,100%)] max-sm:overflow-y-auto max-sm:overscroll-contain"
        style={{
          bottom: keyboardInset > 0 ? keyboardInset : 0,
          paddingBottom:
            keyboardInset > 0 ? 0 : 'max(0px, env(safe-area-inset-bottom, 0px))',
          ...(isMobile && keyboardInset > 0
            ? { maxHeight: `calc(100dvh - ${keyboardInset}px - 3.5rem)` }
            : {}),
        }}
      >
        <div className="mx-auto max-w-[1200px] px-3 py-1.5 sm:px-6 sm:py-2.5">
          <div className="mb-1 flex flex-wrap items-center justify-between gap-1 sm:mb-1.5 sm:gap-2">
            <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-primary sm:text-[10px] sm:tracking-[0.2em]">
              <span className="sm:hidden">The Pressing</span>
              <span className="hidden sm:inline">Customize your profile — The Pressing</span>
            </p>
            <div className="flex items-center gap-0.5 sm:gap-2">
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="h-6 gap-0.5 px-1.5 text-[9px] font-bold uppercase tracking-wider sm:h-7 sm:gap-1 sm:px-2 sm:text-[10px]"
                onClick={() => {
                  trackPressingAction('tip');
                  setTipOpen(true);
                }}
              >
                <Sparkles className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                Tip
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="h-6 gap-0.5 px-1.5 text-[9px] font-bold uppercase tracking-wider sm:h-7 sm:gap-1 sm:px-2 sm:text-[10px]"
                onClick={() => {
                  trackPressingAction('mix');
                  setMixOpen((o) => !o);
                }}
              >
                <Wind className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                <span className="sm:hidden">Mix</span>
                <span className="hidden sm:inline">Mix &amp; sizes</span>
                <ChevronUp className={cn('h-3 w-3 transition-transform sm:h-3.5 sm:w-3.5', mixOpen ? '' : 'rotate-180')} />
              </Button>
              <Button
                asChild
                size="sm"
                variant="outline"
                className="h-6 gap-0.5 border-emerald-500/40 bg-emerald-500/10 px-1.5 text-[9px] font-bold text-emerald-100 sm:h-7 sm:gap-1 sm:px-2 sm:text-[10px]"
              >
                <Link
                  href={guestTryHref('pressing_landing')}
                  onPointerEnter={warmTrySheet}
                  onFocus={warmTrySheet}
                  onClick={() => trackPressingTrySheet('pressing_landing')}
                >
                  <PenLine className="h-3 w-3" />
                  <span className="sm:hidden">Write</span>
                  <span className="hidden sm:inline">Write free</span>
                </Link>
              </Button>
            </div>
          </div>

          {mixOpen ? (
            <div className="mb-2 max-h-[min(36vh,16rem)] space-y-2 overflow-y-auto rounded-lg border border-white/10 bg-black/40 p-2 sm:mb-3 sm:max-h-[min(42vh,22rem)] sm:space-y-3 sm:p-3">
              <div className="grid gap-2 sm:grid-cols-2 sm:gap-3">
                <div className="space-y-1 sm:space-y-1.5">
                  <label htmlFor="guest-tagline" className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                    Tagline
                  </label>
                  <Input
                    id="guest-tagline"
                    value={draft.tagline || ''}
                    onChange={(e) => update({ tagline: e.target.value.slice(0, 120) })}
                    placeholder="One line under your name"
                    className="h-8 border-white/15 bg-black/40 sm:h-9"
                  />
                </div>
                <div className="flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-1.5 sm:py-2">
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold uppercase tracking-widest">Alive</p>
                    <p className="text-[11px] text-muted-foreground">Page breathes with the bar.</p>
                  </div>
                  <Switch checked={draft.alive} onCheckedChange={(checked) => update({ alive: checked })} />
                </div>
              </div>

              <div className="space-y-1 sm:space-y-1.5">
                <label htmlFor="guest-bar-week" className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  Bar of the Week
                </label>
                <Textarea
                  id="guest-bar-week"
                  value={draft.barOfWeek || ''}
                  onChange={(e) => update({ barOfWeek: e.target.value.slice(0, 280) })}
                  rows={2}
                  placeholder="A featured bar for this week (separate from The Pressing)…"
                  className="min-h-[2.25rem] resize-none border-white/15 bg-black/40 text-sm sm:min-h-[2.5rem]"
                />
                <p className="hidden text-[10px] text-zinc-500 sm:block">
                  Shows as its own section on the page. Clear the text to hide it.
                </p>
              </div>

              <div className="space-y-2">
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  Mix faders
                </p>
                <div className="grid gap-2 sm:grid-cols-2">
                  {FADER_META.map(({ key, label }) => (
                    <div key={key} className="space-y-1">
                      <div className="flex justify-between text-[11px]">
                        <span>{label}</span>
                        <span className="font-code tabular-nums text-muted-foreground">{draft.faders[key]}</span>
                      </div>
                      <Slider
                        value={[draft.faders[key]]}
                        min={0}
                        max={100}
                        step={1}
                        onValueChange={([v]) =>
                          update({
                            faders: { ...draft.faders, [key]: v ?? draft.faders[key] },
                          })
                        }
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-2 border-t border-white/10 pt-2 sm:pt-3">
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  Section sizes (S / M / L)
                </p>
                <p className="hidden text-[10px] text-zinc-500 sm:block">
                  Resize the four sections visible in this preview and watch the layout reflow live.
                </p>
                <ul className="space-y-1.5 sm:space-y-2">
                  {GUEST_SIZEABLE_MODULES.map((id) => {
                    const size =
                      draft.moduleSizes[id] || MODULE_META[id]?.defaultSize || 'M';
                    return (
                      <li
                        key={id}
                        className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-white/10 bg-black/30 px-2 py-1.5 sm:px-2.5 sm:py-2"
                      >
                        <span className="text-[11px] font-medium text-zinc-200">
                          {moduleSizeLabel(id)}
                        </span>
                        <div className="flex gap-1">
                          {(['S', 'M', 'L'] as ModuleSize[]).map((s) => (
                            <button
                              key={s}
                              type="button"
                              onClick={() =>
                                update({
                                  moduleSizes: { ...draft.moduleSizes, [id]: s },
                                })
                              }
                              className={cn(
                                'h-7 min-w-[1.75rem] rounded px-2 text-[10px] font-bold tabular-nums transition-colors',
                                size === s
                                  ? 'bg-primary text-primary-foreground'
                                  : 'bg-white/5 text-zinc-400 hover:bg-white/10 hover:text-zinc-200'
                              )}
                            >
                              {s}
                            </button>
                          ))}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </div>
          ) : null}

          <div className="flex flex-col gap-2 sm:grid sm:grid-cols-[minmax(0,10.5rem)_minmax(0,1fr)_auto] sm:items-end sm:gap-3">
            <div className="min-w-0 space-y-0.5 sm:space-y-1">
              <label
                htmlFor="guest-name"
                className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground sm:text-[10px]"
              >
                Your name on the page
              </label>
              <Input
                id="guest-name"
                value={draft.displayName}
                onChange={(e) => update({ displayName: e.target.value.slice(0, 80) })}
                placeholder="Your name"
                className="h-9 w-full border-white/15 bg-black/50 text-sm sm:h-9"
              />
            </div>
            <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-end gap-2 sm:contents">
              <div className="min-w-0 space-y-0.5 sm:space-y-1">
                <label
                  htmlFor="guest-seed"
                  className="text-[9px] font-bold uppercase tracking-widest text-primary/90 sm:text-[10px]"
                >
                  The Pressing
                </label>
                <Textarea
                  ref={seedRef}
                  id="guest-seed"
                  value={draft.seedText}
                  onChange={(e) => update({ seedText: e.target.value.slice(0, 280) })}
                  rows={isMobile ? 2 : 1}
                  placeholder="Type here to skin your page…"
                  aria-label="The Pressing — skins this page"
                  className={cn(
                    'resize-none border-white/15 bg-black/50 text-sm leading-snug transition-shadow',
                    isMobile
                      ? 'min-h-[3rem] max-h-[4rem] overflow-y-auto py-1.5'
                      : 'min-h-9 max-h-9 overflow-y-auto py-2',
                    pressingPulse && 'ring-2 ring-primary/70 shadow-[0_0_24px_rgba(59,130,246,0.35)]'
                  )}
                />
              </div>
              <Button
                asChild
                size="sm"
                className="h-9 shrink-0 gap-1 self-end px-3 text-xs font-bold sm:h-9 sm:gap-2 sm:px-4"
                onClick={onClaim}
              >
                <LandingSignupLink intent="claim_artist_home">
                  <Globe className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  <span className="sm:hidden">Claim</span>
                  <span className="hidden sm:inline">Claim free</span>
                  <ArrowRight className="hidden h-4 w-4 sm:inline" />
                </LandingSignupLink>
              </Button>
            </div>
          </div>
          <p className="mt-2 hidden text-[11px] text-muted-foreground sm:block">
            Type in The Pressing to skin the preview. Mix &amp; sizes opens faders and section scale. Claim keeps your look.
          </p>
        </div>
      </div>
    </div>
  );
}

export function GuestPressingLanding() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-background text-sm text-muted-foreground">
          Loading…
        </div>
      }
    >
      <GuestPressingLandingInner />
    </Suspense>
  );
}
