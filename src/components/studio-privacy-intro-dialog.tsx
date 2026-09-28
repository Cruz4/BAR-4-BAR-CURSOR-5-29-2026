'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Eye, Globe, Trophy } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { useGamification } from '@/context/gamification-context';
import { patchGamificationSettings } from '@/lib/gamification-client';
import { useToast } from '@/hooks/use-toast';
import {
  consumePendingStudioPrivacyIntro,
  hasPendingStudioPrivacyIntro,
  isStudioPrivacyIntroSnoozed,
  isVaultTourRunning,
  markStudioPrivacyIntroComplete,
  setStudioPrivacyIntroOpen,
  snoozeStudioPrivacyIntro,
  STUDIO_PRIVACY_INTRO_ELIGIBLE_EVENT,
} from '@/lib/studio-privacy-intro';
import { dispatchActivityPushIntroEligible } from '@/lib/activity-push-intro';
import { fetchArtistHomeConfig, saveArtistHomeConfigClient } from '@/lib/profile/artist-home-client';
import {
  PUBLIC_IDENTITY_KINDS,
  type PublicIdentityKind,
} from '@/lib/profile/sound-identity';
import { cn } from '@/lib/utils';

export function StudioPrivacyIntroDialog() {
  const pathname = usePathname();
  const { user } = useAuth();
  const { summary, loading: gamificationLoading } = useGamification();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  /** Both off = private. ON = opt in to that public surface. */
  const [publicProfile, setPublicProfile] = useState(false);
  const [showOnLeaderboard, setShowOnLeaderboard] = useState(false);
  const [saving, setSaving] = useState(false);
  const [identityKinds, setIdentityKinds] = useState<PublicIdentityKind[]>([]);
  const [askIdentity, setAskIdentity] = useState<boolean | null>(null);
  const openTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wasOpenRef = useRef(false);

  useEffect(() => {
    setStudioPrivacyIntroOpen(open);
    return () => setStudioPrivacyIntroOpen(false);
  }, [open]);

  // Match Your Booth / Studio Progress — never force off over a live page.
  useEffect(() => {
    if (open && !wasOpenRef.current) {
      setPublicProfile(Boolean(summary.publicProfile));
      setShowOnLeaderboard(!summary.leaderboardHidden);
    }
    wasOpenRef.current = open;
  }, [open, summary.publicProfile, summary.leaderboardHidden]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    void fetchArtistHomeConfig()
      .then((config) => {
        if (cancelled) return;
        const existing = config.featured.soundIdentity?.kinds || [];
        setAskIdentity(existing.length === 0);
        setIdentityKinds(existing);
      })
      .catch(() => {
        if (!cancelled) setAskIdentity(true);
      });
    return () => {
      cancelled = true;
    };
  }, [open]);

  const finishIntro = useCallback(async () => {
    setOpen(false);
    if (!user?.id) return;
    try {
      await markStudioPrivacyIntroComplete(user.id);
    } catch (e) {
      console.warn('[StudioPrivacyIntro] failed to mark complete', e);
    }
    // Next: optional Activity push opt-in (Scene tour already queued it).
    window.setTimeout(() => dispatchActivityPushIntroEligible(), 450);
  }, [user?.id]);

  const remindLater = useCallback(() => {
    snoozeStudioPrivacyIntro();
    setOpen(false);
    window.setTimeout(() => dispatchActivityPushIntroEligible(), 450);
  }, []);

  const clearOpenTimer = useCallback(() => {
    if (openTimerRef.current) {
      clearTimeout(openTimerRef.current);
      openTimerRef.current = null;
    }
  }, []);

  const schedulePrivacyIntro = useCallback(() => {
    clearOpenTimer();

    if (isStudioPrivacyIntroSnoozed()) return;
    if (!user?.id || user.studioPrivacyIntroCompletedAt || gamificationLoading) return;
    if (pathname === '/login' || pathname.startsWith('/share/') || pathname.startsWith('/song/')) return;
    // Visibility intro belongs on the Scene home or vault — never mid sheet / demo handoff.
    if (pathname.startsWith('/albums/')) return;
    if (pathname !== '/' && pathname !== '/vault') return;
    if (!hasPendingStudioPrivacyIntro()) return;
    if (isVaultTourRunning()) return;
    try {
      if (sessionStorage.getItem('b4b-demo-handoff-inflight') === '1') return;
    } catch {
      /* ignore */
    }

    openTimerRef.current = setTimeout(() => {
      openTimerRef.current = null;
      if (isStudioPrivacyIntroSnoozed()) return;
      if (!user?.id || user.studioPrivacyIntroCompletedAt) return;
      if (!hasPendingStudioPrivacyIntro()) return;
      if (isVaultTourRunning()) return;
      if (
        typeof window !== 'undefined' &&
        window.location.pathname !== '/' &&
        window.location.pathname !== '/vault'
      )
        return;
      try {
        if (sessionStorage.getItem('b4b-demo-handoff-inflight') === '1') return;
      } catch {
        /* ignore */
      }

      consumePendingStudioPrivacyIntro();
      setOpen(true);
    }, 700);
  }, [clearOpenTimer, gamificationLoading, pathname, user?.id, user?.studioPrivacyIntroCompletedAt]);

  useEffect(() => {
    setOpen(false);
    clearOpenTimer();
  }, [pathname, user?.id, clearOpenTimer]);

  useEffect(() => {
    schedulePrivacyIntro();
    return clearOpenTimer;
  }, [schedulePrivacyIntro, clearOpenTimer]);

  useEffect(() => {
    const onEligible = () => schedulePrivacyIntro();
    window.addEventListener(STUDIO_PRIVACY_INTRO_ELIGIBLE_EVENT, onEligible);
    return () => window.removeEventListener(STUDIO_PRIVACY_INTRO_ELIGIBLE_EVENT, onEligible);
  }, [schedulePrivacyIntro]);

  const toggleIdentity = (kind: PublicIdentityKind) => {
    setIdentityKinds((current) => {
      if (current.includes(kind)) return current.filter((item) => item !== kind);
      if (current.length >= 3) return current;
      return [...current, kind];
    });
  };

  const handleSave = async () => {
    if (askIdentity === null) return;
    if (askIdentity && identityKinds.length === 0) {
      toast({
        variant: 'destructive',
        title: 'Pick who you are',
        description: 'Choose at least one. You can change it later on Edit Public Page.',
      });
      return;
    }
    setSaving(true);
    try {
      await patchGamificationSettings({
        publicProfile,
        leaderboardHidden: !showOnLeaderboard,
        displayName: user?.displayName,
      });
      if (askIdentity && identityKinds.length) {
        const config = await fetchArtistHomeConfig();
        config.featured.soundIdentity = {
          ...(config.featured.soundIdentity || {}),
          kinds: identityKinds,
        };
        await saveArtistHomeConfigClient(config);
      }
      await finishIntro();
      toast({
        title: 'Visibility saved',
        description: 'Change anytime in Studio Progress → Sharing & visibility.',
      });
    } catch {
      toast({ variant: 'destructive', title: 'Could not save visibility settings' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !next && remindLater()}>
      <DialogContent className="sm:max-w-md border-primary/20">
        <DialogHeader>
          <DialogTitle className="font-headline text-xl flex items-center gap-2">
            <Eye className="h-5 w-5 text-primary" />
            Your studio visibility
          </DialogTitle>
          <DialogDescription className="text-sm leading-relaxed">
            {publicProfile ? (
              <>
                Your Artist Home is <strong className="text-foreground">already live</strong> from Your Booth. These
                switches match that — saving will not turn your page off unless you flip Public profile off here.
                Lyrics, DNA, and vault content are never published unless you share a Lyrics DNA Drop link.
              </>
            ) : (
              <>
                You start <strong className="text-foreground">fully private</strong>. Artist Home is a core shareable
                surface — turn Public profile on only when you want eyes on your page. Lyrics, DNA, and vault content are
                never published unless you share a Lyrics DNA Drop link. After you go live, customize modules and links on Edit
                Public Page.
              </>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 text-[11px] text-muted-foreground leading-snug">
          <p className="flex items-start gap-2">
            <Trophy className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
            <span>
              {publicProfile && showOnLeaderboard ? (
                <>
                  <strong className="text-foreground/90">Both on</strong> — Artist Home is live and you appear on the
                  weekly leaderboard.
                </>
              ) : publicProfile ? (
                <>
                  <strong className="text-foreground/90">Artist Home live</strong> — same as Go live on Your Booth.
                  Leaderboard stays off until you opt in.
                </>
              ) : showOnLeaderboard ? (
                <>
                  <strong className="text-foreground/90">Leaderboard on</strong> — Artist Home stays private until you
                  opt in.
                </>
              ) : (
                <>
                  <strong className="text-foreground/90">Both off</strong> — private studio. Leaderboard &amp; profile stay
                  off until you opt in.
                </>
              )}
            </span>
          </p>
        </div>

        {askIdentity ? (
          <div className="space-y-2 rounded-lg border border-white/10 bg-black/25 p-4">
            <p className="text-xs font-bold uppercase tracking-wide">Who are you?</p>
            <p className="text-[10px] text-muted-foreground">Pick up to 3. This shows on your Artist Home.</p>
            <div className="flex flex-wrap gap-1.5">
              {PUBLIC_IDENTITY_KINDS.map((option) => {
                const active = identityKinds.includes(option.id);
                return (
                  <button
                    key={option.id}
                    type="button"
                    disabled={saving || (!active && identityKinds.length >= 3)}
                    onClick={() => toggleIdentity(option.id)}
                    className={cn(
                      'rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide',
                      active
                        ? 'border-primary bg-primary/20 text-primary'
                        : 'border-white/15 text-muted-foreground hover:border-white/30'
                    )}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}

        <div className="space-y-4 rounded-lg border border-white/10 bg-black/25 p-4">
          <div className="flex items-center justify-between gap-4">
            <div className="space-y-0.5 min-w-0">
              <Label className="text-xs font-bold uppercase flex items-center gap-1.5">
                <Trophy className="h-3.5 w-3.5" /> Show on leaderboard
              </Label>
              <p className="text-[10px] text-muted-foreground">
                Weekly rankings: display name, rank, XP, bars, streak — never lyrics.
              </p>
            </div>
            <Switch
              checked={showOnLeaderboard}
              disabled={saving}
              onCheckedChange={setShowOnLeaderboard}
            />
          </div>
          <div className="flex items-center justify-between gap-4">
            <div className="space-y-0.5 min-w-0">
              <Label className="text-xs font-bold uppercase flex items-center gap-1.5">
                <Globe className="h-3.5 w-3.5" /> Public profile page
              </Label>
              <p className="text-[10px] text-muted-foreground">
                Artist Home — your shareable page: modules, social links, Album Rooms — never lyrics.
              </p>
            </div>
            <Switch
              checked={publicProfile}
              disabled={saving}
              onCheckedChange={setPublicProfile}
            />
          </div>
        </div>

        <p className="text-[10px] text-muted-foreground">
          You can change these anytime under{' '}
          <Link href="/studio-progress#sharing-visibility" className="text-primary font-bold hover:underline">
            Studio Progress → Sharing &amp; visibility
          </Link>
          .
        </p>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="ghost" className="w-full sm:w-auto" disabled={saving} onClick={remindLater}>
            Remind me later
          </Button>
          <Button className="w-full sm:flex-1 font-bold uppercase" disabled={saving || askIdentity === null} onClick={() => void handleSave()}>
            {saving ? 'Saving…' : 'Save preferences'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
