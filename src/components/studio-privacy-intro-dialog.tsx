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
import { Eye, EyeOff, Globe, Trophy } from 'lucide-react';
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

export function StudioPrivacyIntroDialog() {
  const pathname = usePathname();
  const { user } = useAuth();
  const { summary, loading: gamificationLoading } = useGamification();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [publicProfile, setPublicProfile] = useState(false);
  const [leaderboardHidden, setLeaderboardHidden] = useState(false);
  const [saving, setSaving] = useState(false);
  const openTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setStudioPrivacyIntroOpen(open);
    return () => setStudioPrivacyIntroOpen(false);
  }, [open]);

  useEffect(() => {
    setPublicProfile(summary.publicProfile);
    setLeaderboardHidden(summary.leaderboardHidden);
  }, [summary.publicProfile, summary.leaderboardHidden]);

  const finishIntro = useCallback(async () => {
    setOpen(false);
    if (!user?.id) return;
    try {
      await markStudioPrivacyIntroComplete(user.id);
    } catch (e) {
      console.warn('[StudioPrivacyIntro] failed to mark complete', e);
    }
  }, [user?.id]);

  const remindLater = useCallback(() => {
    snoozeStudioPrivacyIntro();
    setOpen(false);
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
    if (pathname === '/login' || pathname.startsWith('/share/')) return;
    if (!hasPendingStudioPrivacyIntro()) return;
    if (isVaultTourRunning()) return;

    openTimerRef.current = setTimeout(() => {
      openTimerRef.current = null;
      if (isStudioPrivacyIntroSnoozed()) return;
      if (!user?.id || user.studioPrivacyIntroCompletedAt) return;
      if (!hasPendingStudioPrivacyIntro()) return;
      if (isVaultTourRunning()) return;

      consumePendingStudioPrivacyIntro();
      setOpen(true);
    }, 500);
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

  const handleSave = async () => {
    setSaving(true);
    try {
      await patchGamificationSettings({
        publicProfile,
        leaderboardHidden,
        displayName: user?.displayName,
      });
      await finishIntro();
      toast({ title: 'Visibility saved', description: 'Change anytime in Settings → Studio Profile.' });
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
            Bar 4 Bar can show your <strong className="text-foreground">display name and studio stats</strong> on the
            weekly leaderboard. Lyrics, DNA, and vault content are never published unless you share a DNA Drop link.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 text-[11px] text-muted-foreground leading-snug">
          <p className="flex items-start gap-2">
            <Trophy className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
            <span>
              <strong className="text-foreground/90">Leaderboard</strong> — your display name plus rank, XP, bars written
              (7 days), streak, and tracks completed. You are included unless you turn on Hide below.
            </span>
          </p>
        </div>

        <div className="space-y-4 rounded-lg border border-white/10 bg-black/25 p-4">
          <div className="flex items-center justify-between gap-4">
            <div className="space-y-0.5 min-w-0">
              <Label className="text-xs font-bold uppercase flex items-center gap-1.5">
                <EyeOff className="h-3.5 w-3.5" /> Hide from leaderboard
              </Label>
              <p className="text-[10px] text-muted-foreground">
                Keep rankings private. Studio Progress still tracks your stats for you.
              </p>
            </div>
            <Switch
              checked={leaderboardHidden}
              disabled={saving}
              onCheckedChange={setLeaderboardHidden}
            />
          </div>
          <div className="flex items-center justify-between gap-4">
            <div className="space-y-0.5 min-w-0">
              <Label className="text-xs font-bold uppercase flex items-center gap-1.5">
                <Globe className="h-3.5 w-3.5" /> Public profile page
              </Label>
              <p className="text-[10px] text-muted-foreground">
                Optional page with rank, streak, and badges — never lyrics.
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
          <Link href="/usage?tab=settings" className="text-primary font-bold hover:underline">
            Ink Store → Settings → Studio Profile
          </Link>
          .
        </p>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="ghost" className="w-full sm:w-auto" disabled={saving} onClick={remindLater}>
            Remind me later
          </Button>
          <Button className="w-full sm:flex-1 font-bold uppercase" disabled={saving} onClick={() => void handleSave()}>
            {saving ? 'Saving…' : 'Save preferences'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
