'use client';

/**
 * Guest front door — full Artist Home (same layout as a real profile).
 * Type the Pressing in the dock while the live page skins in real time.
 * Demo Wall includes samples + guest posts; claim saves pressing + user posts.
 */

import React, { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, ChevronUp, Globe, PenLine, Sparkles, Wind } from 'lucide-react';
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
import { StudioThemeControls } from '@/components/studio-theme-controls';
import { ArtistHome } from '@/components/profile/artist-home';
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
import { trackGuestFunnelEvent } from '@/lib/guest-funnel-client';
import { GUEST_FUNNEL_EVENTS } from '@/lib/guest-funnel-events';
import type { ProfilePost } from '@/lib/profile/social-client';
import { parseEmbedUrl } from '@/lib/profile/embeds';
import {
  NEOMAIYA_PLAYGROUND_FRIEND,
  NEOMAIYA_SOL,
  neomaiyaPlaygroundGuestbookEntry,
} from '@/lib/profile/neomaiya-sol';
import { cn } from '@/lib/utils';

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
    profilePhotoMode: 'initials',
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
      createdAt: p.createdAt,
    };
  });
}

function GuestPressingLandingInner() {
  const [draft, setDraft] = useState<GuestPressingDraft>(() => defaultGuestPressingDraft());
  const [mixOpen, setMixOpen] = useState(false);
  const [ready, setReady] = useState(false);
  const [tipOpen, setTipOpen] = useState(false);
  const [pressingPulse, setPressingPulse] = useState(false);
  const [neoSlug, setNeoSlug] = useState<string>(NEOMAIYA_SOL.slug);
  const seedRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const existing = readGuestPressingDraft();
    if (existing) setDraft(existing);
    setReady(true);
    trackGuestFunnelEvent(GUEST_FUNNEL_EVENTS.PRESSING_OPEN, {}, { oncePerSession: true, markTrySession: false });
    try {
      if (sessionStorage.getItem(PRESSING_TIP_KEY) !== '1') {
        const t = window.setTimeout(() => setTipOpen(true), 600);
        return () => window.clearTimeout(t);
      }
    } catch {
      const t = window.setTimeout(() => setTipOpen(true), 600);
      return () => window.clearTimeout(t);
    }
  }, []);

  // Resolve Neomaiya's live public profile slug for guestbook / friends links.
  useEffect(() => {
    let cancelled = false;
    void fetch('/api/profile/neomaiya')
      .then((r) => r.json())
      .then((data: { slug?: string }) => {
        if (cancelled) return;
        if (typeof data?.slug === 'string' && data.slug.trim()) {
          setNeoSlug(data.slug.trim());
        }
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
    setDraft((prev) => ({ ...prev, ...patch }));
  }, []);

  const onWallPost = useCallback((input: { text: string; embedUrl?: string }) => {
    const clean = input.text.trim().slice(0, 1000);
    const link = input.embedUrl?.trim().slice(0, 500);
    if (!clean && !link) return;
    const post: GuestWallDraftPost = {
      id: `guest-${Date.now().toString(36)}`,
      text: clean,
      ...(link ? { embedUrl: link } : {}),
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
    () => [{ ...NEOMAIYA_PLAYGROUND_FRIEND, slug: neoSlug }],
    [neoSlug]
  );
  const playgroundGuestbook = useMemo(() => {
    let seed = 'guest-pressing';
    try {
      const existing = sessionStorage.getItem('b4b-neo-guestbook-seed');
      if (existing) seed = existing;
      else {
        seed = `guest-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
        sessionStorage.setItem('b4b-neo-guestbook-seed', seed);
      }
    } catch {
      /* ignore */
    }
    const entry = neomaiyaPlaygroundGuestbookEntry(new Date(), seed);
    return [{ ...entry, authorSlug: neoSlug }];
  }, [neoSlug]);

  const playgroundBarOfWeek = useMemo(
    () => ({
      text: draft.barOfWeek || '',
      onChange: (text: string) => update({ barOfWeek: text.slice(0, 280) }),
    }),
    [draft.barOfWeek, update]
  );

  const onClaim = () => {
    persistGuestPressingDraft(draft);
    trackGuestFunnelEvent(
      GUEST_FUNNEL_EVENTS.PRESSING_CLAIM_CTA,
      { source: 'pressing_landing' },
      { markTrySession: false }
    );
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
              Your Artist Home
            </p>
            <DialogTitle className="font-headline text-2xl font-bold tracking-tight">
              This would be your Bar 4 Bar profile.
            </DialogTitle>
            <DialogDescription className="text-sm leading-relaxed text-zinc-400">
              Everything behind this tip is a live preview of your public page — Wall, friends,
              guestbook, the works. At the bottom,{' '}
              <span className="font-medium text-zinc-200">The Pressing</span> is the customization
              tool: type a bar or sentence and the whole page skins itself in real time.
            </DialogDescription>
          </DialogHeader>
          <ul className="mt-2 space-y-2 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-3 text-[13px] text-zinc-300">
            <li className="flex gap-2">
              <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
              Type in <span className="font-medium text-zinc-100">The Pressing — skins this page</span>
            </li>
            <li className="flex gap-2">
              <PenLine className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
              Watch color, motion, and chrome shift as you write
            </li>
            <li className="flex gap-2">
              <Globe className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
              Claim free to keep this look on your real profile
            </li>
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
            <Button type="button" className="font-bold gap-1.5" onClick={() => dismissTip(true)}>
              Try The Pressing
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <header className="fixed top-0 left-0 right-0 z-[200] flex h-14 items-center justify-between gap-2 border-b border-white/[0.06] bg-background/55 px-3 backdrop-blur-xl sm:h-16 sm:px-6">
        <BrandLockup variant="marketing" titleTag="h1" linkHref="/" className="max-w-[10rem] sm:max-w-none" />
        <nav className="flex shrink-0 items-center gap-2 sm:gap-4">
          <Link
            href="/pricing"
            className="hidden text-[10px] font-bold uppercase tracking-widest text-muted-foreground transition-colors hover:text-primary sm:inline"
          >
            Pricing
          </Link>
          <LandingSignInLink className="hidden text-[10px] font-bold uppercase tracking-widest text-muted-foreground transition-colors hover:text-primary sm:inline">
            Sign in
          </LandingSignInLink>
          <StudioThemeControls className="hidden sm:inline-flex" />
          <Button
            asChild
            className="h-9 rounded-md bg-primary px-3 text-xs font-bold text-white hover:bg-primary/90 sm:px-4 sm:text-sm"
            onClick={onClaim}
          >
            <LandingSignupLink intent="claim_artist_home">Claim profile</LandingSignupLink>
          </Button>
        </nav>
      </header>

      {/* Profile framing strip */}
      <div className="fixed left-0 right-0 top-14 z-[195] border-b border-primary/25 bg-primary/15 px-3 py-2 backdrop-blur-md sm:top-16 sm:px-6">
        <div className="mx-auto flex max-w-[1200px] flex-wrap items-center justify-between gap-2">
          <p className="text-[11px] leading-snug text-zinc-200 sm:text-xs">
            <span className="font-bold text-primary">Live preview</span>
            <span className="text-zinc-400"> — this is what your Bar 4 Bar profile page would look like.</span>
            {' '}
            <span className="hidden text-zinc-300 sm:inline">
              Try The Pressing at the bottom to customize the skin.
            </span>
          </p>
          <button
            type="button"
            onClick={() => setTipOpen(true)}
            className="shrink-0 text-[10px] font-bold uppercase tracking-wider text-primary hover:underline"
          >
            How it works
          </button>
        </div>
      </div>

      {/* Full Artist Home — same composition as a real profile */}
      <div className="pb-[min(42vh,22rem)] pt-[6.5rem] sm:pt-[7.25rem]">
        <ArtistHome
          profile={profile}
          config={config}
          isOwner={false}
          previewMode
          playgroundWall={playgroundWall}
          playgroundFriends={playgroundFriends}
          playgroundGuestbook={playgroundGuestbook}
          playgroundBarOfWeek={playgroundBarOfWeek}
        />
      </div>

      {/* Live Pressing dock — type here, page updates underneath */}
      <div className="fixed inset-x-0 bottom-0 z-[190] border-t border-white/10 bg-black/80 backdrop-blur-xl">
        <div className="mx-auto max-w-[1200px] px-3 py-3 sm:px-6 sm:py-4">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-primary">
              Customize your profile — The Pressing
            </p>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="h-7 gap-1 px-2 text-[10px] font-bold uppercase tracking-wider"
                onClick={() => setTipOpen(true)}
              >
                <Sparkles className="h-3.5 w-3.5" />
                Tip
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="h-7 gap-1 px-2 text-[10px] font-bold uppercase tracking-wider"
                onClick={() => setMixOpen((o) => !o)}
              >
                <Wind className="h-3.5 w-3.5" />
                Mix & sizes
                <ChevronUp className={cn('h-3.5 w-3.5 transition-transform', mixOpen ? '' : 'rotate-180')} />
              </Button>
              <Button asChild size="sm" variant="outline" className="h-7 gap-1 border-emerald-500/40 bg-emerald-500/10 px-2 text-[10px] font-bold text-emerald-100">
                <Link href="/try?src=pressing_landing">
                  <PenLine className="h-3 w-3" /> Write free
                </Link>
              </Button>
            </div>
          </div>

          {mixOpen ? (
            <div className="mb-3 max-h-[min(42vh,22rem)] space-y-3 overflow-y-auto rounded-lg border border-white/10 bg-black/40 p-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label htmlFor="guest-tagline" className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                    Tagline
                  </label>
                  <Input
                    id="guest-tagline"
                    value={draft.tagline || ''}
                    onChange={(e) => update({ tagline: e.target.value.slice(0, 120) })}
                    placeholder="One line under your name"
                    className="h-9 border-white/15 bg-black/40"
                  />
                </div>
                <div className="flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2">
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold uppercase tracking-widest">Alive</p>
                    <p className="text-[11px] text-muted-foreground">Page breathes with the bar.</p>
                  </div>
                  <Switch checked={draft.alive} onCheckedChange={(checked) => update({ alive: checked })} />
                </div>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="guest-bar-week" className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  Bar of the Week
                </label>
                <Textarea
                  id="guest-bar-week"
                  value={draft.barOfWeek || ''}
                  onChange={(e) => update({ barOfWeek: e.target.value.slice(0, 280) })}
                  rows={2}
                  placeholder="A featured bar for this week (separate from The Pressing)…"
                  className="min-h-[2.5rem] resize-none border-white/15 bg-black/40 text-sm"
                />
                <p className="text-[10px] text-zinc-500">
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

              <div className="space-y-2 border-t border-white/10 pt-3">
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  Section sizes (S / M / L)
                </p>
                <p className="text-[10px] text-zinc-500">
                  Same controls as Edit Public Page. Watch the layout reflow live.
                </p>
                <ul className="space-y-2">
                  {GUEST_SIZEABLE_MODULES.map((id) => {
                    const size =
                      draft.moduleSizes[id] || MODULE_META[id]?.defaultSize || 'M';
                    return (
                      <li
                        key={id}
                        className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-white/10 bg-black/30 px-2.5 py-2"
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

          <div className="grid gap-2 sm:grid-cols-[minmax(0,180px)_minmax(0,1fr)_auto] sm:items-end sm:gap-3">
            <div className="space-y-1">
              <label htmlFor="guest-name" className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                Your name on the page
              </label>
              <Input
                id="guest-name"
                value={draft.displayName}
                onChange={(e) => update({ displayName: e.target.value.slice(0, 80) })}
                placeholder="Artist name"
                className="h-10 border-white/15 bg-black/50"
              />
            </div>
            <div className="space-y-1">
              <label
                htmlFor="guest-seed"
                className="text-[10px] font-bold uppercase tracking-widest text-primary/90"
              >
                The Pressing — skins this page
              </label>
              <Textarea
                ref={seedRef}
                id="guest-seed"
                value={draft.seedText}
                onChange={(e) => update({ seedText: e.target.value.slice(0, 280) })}
                rows={2}
                placeholder="Type a bar or sentence — the profile skins itself live…"
                className={cn(
                  'min-h-[2.75rem] resize-none border-white/15 bg-black/50 text-sm transition-shadow',
                  pressingPulse && 'ring-2 ring-primary/70 shadow-[0_0_24px_rgba(59,130,246,0.35)]'
                )}
              />
            </div>
            <Button
              asChild
              size="lg"
              className="h-10 gap-2 font-bold sm:h-[2.75rem]"
              onClick={onClaim}
            >
              <LandingSignupLink intent="claim_artist_home">
                <Globe className="h-4 w-4" />
                Claim free
                <ArrowRight className="h-4 w-4" />
              </LandingSignupLink>
            </Button>
          </div>
          <p className="mt-2 text-[11px] text-muted-foreground">
            This preview is your Artist Home. Type above for The Pressing. Click Bar of the Week on
            the page to edit it. Mix & sizes still has faders and S/M/L. Claim keeps your look.
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
