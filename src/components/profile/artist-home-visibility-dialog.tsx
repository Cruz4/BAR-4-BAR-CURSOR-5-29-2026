'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Globe, Link2, Settings2, Trophy, UserRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  NEOMAIYA_CANONICAL_SLUG,
  normalizeProfileSlugInput,
  profileHref,
  profileSlugError,
} from '@/lib/profile/profile-slug';
import { isNeomaiyaSolViewer } from '@/lib/profile/neomaiya-sol';
import { useGamification } from '@/context/gamification-context';
import { useAuth } from '@/hooks/use-auth';
import { patchGamificationSettings } from '@/lib/gamification-client';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

export type ArtistHomeVisibilityVariant = 'settings' | 'engage';

type ArtistHomeVisibilityDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  variant?: ArtistHomeVisibilityVariant;
};

export function ArtistHomeVisibilityDialog({
  open,
  onOpenChange,
  variant = 'settings',
}: ArtistHomeVisibilityDialogProps) {
  const { summary } = useGamification();
  const { user } = useAuth();
  const { toast } = useToast();
  const [publicProfile, setPublicProfile] = useState(summary.publicProfile);
  const [showOnLeaderboard, setShowOnLeaderboard] = useState(!summary.leaderboardHidden);
  const [saving, setSaving] = useState(false);
  const [slugDraft, setSlugDraft] = useState(summary.profileSlug || '');
  const [slugSaving, setSlugSaving] = useState(false);
  const isNeo = isNeomaiyaSolViewer({ email: user?.email, displayName: user?.displayName });

  useEffect(() => {
    if (!open) return;
    setPublicProfile(summary.publicProfile);
    setShowOnLeaderboard(!summary.leaderboardHidden);
    setSlugDraft(summary.profileSlug || '');
  }, [open, summary.publicProfile, summary.leaderboardHidden, summary.profileSlug]);

  if (!user) return null;

  const isLive = Boolean(publicProfile && summary.profileSlug);
  const homeHref = summary.profileSlug ? profileHref(summary.profileSlug) : null;

  const saveSettings = async (next: {
    publicProfile?: boolean;
    leaderboardHidden?: boolean;
    profileSlug?: string;
  }): Promise<boolean> => {
    setSaving(true);
    try {
      await patchGamificationSettings({
        ...next,
        displayName: user.displayName,
      });
      toast({ title: next.profileSlug ? 'Profile link saved' : 'Visibility updated' });
      return true;
    } catch (err) {
      toast({
        variant: 'destructive',
        title: err instanceof Error ? err.message : 'Could not save visibility settings',
      });
      return false;
    } finally {
      setSaving(false);
    }
  };

  const saveSlug = async () => {
    const clean = normalizeProfileSlugInput(slugDraft);
    const err = profileSlugError(clean, {
      allowReserved: isNeo ? [NEOMAIYA_CANONICAL_SLUG] : [],
    });
    if (err) {
      toast({ variant: 'destructive', title: err });
      return;
    }
    if (clean === (summary.profileSlug || '')) {
      toast({ title: 'Link unchanged' });
      return;
    }
    setSlugSaving(true);
    try {
      const ok = await saveSettings({ profileSlug: clean, publicProfile: true });
      if (ok) setPublicProfile(true);
    } finally {
      setSlugSaving(false);
    }
  };

  const engage = variant === 'engage';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md border-2 bg-card sm:rounded-2xl">
        <DialogHeader>
          <DialogTitle className="font-headline text-2xl uppercase tracking-tight">
            {engage ? 'Go live to join in' : 'Artist Home visibility'}
          </DialogTitle>
          <DialogDescription className="text-sm leading-relaxed">
            {engage ? (
              <>
                Loves, replies, Reverbs, guestbook lines, polls, and other public interactions need a{' '}
                <strong className="text-foreground">live Artist Home</strong>. Tune your page on{' '}
                <strong className="text-foreground">Edit Public Page</strong> first if you want — then flip{' '}
                <strong className="text-foreground">Public profile</strong> on below.
              </>
            ) : (
              <>Both switches off = fully private. Lyrics are never published — only the surfaces you choose.</>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 pt-1">
          {engage ? (
            <div className="rounded-xl border border-sky-500/30 bg-sky-500/10 px-3.5 py-3 text-xs leading-relaxed text-muted-foreground">
              Your Vault stays private. Going live only shares the Artist Home modules and social surfaces you choose —
              not unpublished lyrics.
            </div>
          ) : null}

          <div className="flex items-center justify-between gap-4 rounded-xl border border-border/80 bg-muted/20 px-3.5 py-3">
            <div className="min-w-0 space-y-1">
              <Label className="flex items-center gap-1.5 text-sm font-bold uppercase">
                <Globe className="h-3.5 w-3.5 text-sky-400" /> Public profile
              </Label>
              <p className="text-xs text-muted-foreground leading-snug">
                Share your Artist Home page — rank, streak, modules you set live.
              </p>
            </div>
            <Switch
              checked={publicProfile}
              disabled={saving}
              onCheckedChange={(c) => {
                setPublicProfile(c);
                void saveSettings({ publicProfile: c });
              }}
            />
          </div>

          <div className="flex items-center justify-between gap-4 rounded-xl border border-border/80 bg-muted/20 px-3.5 py-3">
            <div className="min-w-0 space-y-1">
              <Label className="flex items-center gap-1.5 text-sm font-bold uppercase">
                <Trophy className="h-3.5 w-3.5 text-amber-400" /> Show on leaderboard
              </Label>
              <p className="text-xs text-muted-foreground leading-snug">
                Appear on weekly public rankings (display name + studio stats).
              </p>
              <Button
                variant="link"
                className="h-auto px-0 py-0 text-[11px] font-bold uppercase tracking-wide text-amber-400/90"
                asChild
              >
                <Link href="/leaderboard" onClick={() => onOpenChange(false)}>
                  Open leaderboard →
                </Link>
              </Button>
            </div>
            <Switch
              checked={showOnLeaderboard}
              disabled={saving}
              onCheckedChange={(c) => {
                setShowOnLeaderboard(c);
                void saveSettings({ leaderboardHidden: !c });
              }}
            />
          </div>

          <div className="space-y-2 rounded-xl border border-sky-500/25 bg-sky-500/5 px-3.5 py-3">
            <Label className="flex items-center gap-1.5 text-sm font-bold uppercase">
              <Link2 className="h-3.5 w-3.5 text-sky-400" /> Profile link
            </Label>
            <p className="text-xs text-muted-foreground leading-snug">Choose a clean name link — no random codes.</p>
            <div className="flex flex-col gap-2">
              <div className="flex min-w-0 items-center gap-1 rounded-lg border border-border/70 bg-background/60 px-2.5 py-1.5 font-code text-xs">
                <span className="shrink-0 text-muted-foreground">akasheet.com/</span>
                <Input
                  value={slugDraft}
                  disabled={saving || slugSaving}
                  onChange={(e) => setSlugDraft(normalizeProfileSlugInput(e.target.value))}
                  className="h-8 border-0 bg-transparent px-0 font-code text-sm shadow-none focus-visible:ring-0"
                  placeholder="your_artist_name"
                  maxLength={32}
                  aria-label="Profile link slug"
                />
              </div>
              <Button
                type="button"
                variant="secondary"
                className="h-9 font-bold uppercase"
                disabled={saving || slugSaving}
                onClick={() => void saveSlug()}
              >
                {slugSaving ? 'Saving…' : 'Save link'}
              </Button>
            </div>
            {summary.profileSlug ? (
              <p className="font-code text-[10px] text-sky-300/90">akasheet.com/{summary.profileSlug}</p>
            ) : null}
          </div>

          <div
            className={cn(
              'rounded-xl border px-3.5 py-3 font-code text-[10px] font-bold uppercase tracking-[0.2em]',
              isLive
                ? 'border-sky-500/30 bg-sky-500/10 text-sky-300'
                : 'border-border/70 bg-muted/15 text-muted-foreground/70'
            )}
          >
            {isLive ? 'Profile is live on the web' : 'Profile is private — not on the web'}
          </div>

          <div className="flex flex-wrap gap-2 border-t border-border/60 pt-4">
            <Button variant="outline" className="h-10 gap-2 font-bold uppercase" asChild>
              <Link href="/profile/customize" onClick={() => onOpenChange(false)}>
                <Settings2 className="h-4 w-4" /> Edit Public Page
              </Link>
            </Button>
            {isLive && homeHref ? (
              <Button className="h-10 gap-2 font-bold uppercase" asChild>
                <Link href={homeHref} onClick={() => onOpenChange(false)}>
                  <UserRound className="h-4 w-4" /> View profile
                </Link>
              </Button>
            ) : null}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
