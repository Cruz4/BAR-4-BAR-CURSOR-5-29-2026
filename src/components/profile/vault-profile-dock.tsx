'use client';

/**
 * Vault Profile Dock — lives in the empty right rail of The Vault.
 * Artist Home visibility + The Block (feed) with social alert badge.
 */

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Bell, Disc3, ExternalLink, Globe, Link2, Settings2, Trophy, UserRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import {
  NEOMAIYA_CANONICAL_SLUG,
  normalizeProfileSlugInput,
  profileHref,
  profileSlugError,
} from '@/lib/profile/profile-slug';
import { isNeomaiyaSolViewer } from '@/lib/profile/neomaiya-sol';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useGamification } from '@/context/gamification-context';
import { useAuth } from '@/hooks/use-auth';
import { useSocialAlerts } from '@/hooks/use-social-alerts';
import { patchGamificationSettings } from '@/lib/gamification-client';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { ReleaseCatalogDialog } from '@/components/vault/release-catalog';

type VaultProfileDockProps = {
  /** Horizontal strip under vault progress on < xl. */
  compact?: boolean;
  className?: string;
};

function AlertBadge({ count, compact }: { count: number; compact?: boolean }) {
  if (count <= 0) return null;
  const label = count > 99 ? '99+' : String(count);
  return (
    <span
      className={cn(
        'absolute flex items-center justify-center rounded-full bg-emerald-500 font-bold text-black shadow-[0_0_10px_rgba(16,185,129,0.55)]',
        compact
          ? '-right-1 -top-1 h-4 min-w-4 px-1 text-[9px]'
          : '-right-0.5 -top-0.5 h-[1.05rem] min-w-[1.05rem] px-1 text-[9px]'
      )}
      aria-label={`${count} social alerts`}
    >
      {label}
    </span>
  );
}

export function VaultProfileDock({ compact = false, className }: VaultProfileDockProps) {
  const { summary, loading } = useGamification();
  const { user } = useAuth();
  const { toast } = useToast();
  const { total: alertCount } = useSocialAlerts();
  const [open, setOpen] = useState(false);
  const [catalogOpen, setCatalogOpen] = useState(false);
  const [publicProfile, setPublicProfile] = useState(summary.publicProfile);
  const [showOnLeaderboard, setShowOnLeaderboard] = useState(!summary.leaderboardHidden);
  const [saving, setSaving] = useState(false);
  const [slugDraft, setSlugDraft] = useState(summary.profileSlug || '');
  const [slugSaving, setSlugSaving] = useState(false);
  const isNeo = isNeomaiyaSolViewer({ email: user?.email, displayName: user?.displayName });

  useEffect(() => {
    setPublicProfile(summary.publicProfile);
    setShowOnLeaderboard(!summary.leaderboardHidden);
    setSlugDraft(summary.profileSlug || '');
  }, [summary.publicProfile, summary.leaderboardHidden, summary.profileSlug]);

  if (!user || loading) return null;

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

  const shellClass = compact
    ? cn('flex w-full flex-col gap-2', className)
    : cn('flex flex-col items-stretch gap-2.5', className);

  const homeBtnClass = cn(
    'group relative text-left transition-all duration-300',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50',
    compact
      ? cn(
          'flex w-full items-center gap-3 rounded-xl border px-3.5 py-3',
          isLive
            ? 'border-sky-500/35 bg-gradient-to-r from-sky-500/10 via-card/80 to-card/60 hover:border-sky-400/55'
            : 'border-border/70 bg-card/50 hover:border-border'
        )
      : cn(
          'flex w-[4.75rem] flex-col items-center gap-3 rounded-2xl border px-2.5 py-4',
          'shadow-[0_8px_28px_rgba(0,0,0,0.18)] backdrop-blur-md',
          'hover:-translate-y-0.5',
          isLive
            ? 'border-sky-500/40 bg-gradient-to-b from-sky-500/15 via-card/85 to-card/70 hover:border-sky-400/60 hover:shadow-[0_10px_32px_rgba(14,165,233,0.22)]'
            : 'border-border/60 bg-card/55 hover:border-muted-foreground/35'
        )
  );

  const blockBtnClass = cn(
    'group relative text-left transition-all duration-300',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40',
    compact
      ? 'flex w-full items-center gap-3 rounded-xl border border-emerald-500/30 bg-gradient-to-r from-emerald-500/10 via-card/80 to-card/60 px-3.5 py-3 hover:border-emerald-400/50'
      : cn(
          'flex w-[4.75rem] flex-col items-center gap-3 rounded-2xl border px-2.5 py-4',
          'border-emerald-500/35 bg-gradient-to-b from-emerald-500/12 via-card/85 to-card/70',
          'shadow-[0_8px_28px_rgba(0,0,0,0.18)] backdrop-blur-md',
          'hover:-translate-y-0.5 hover:border-emerald-400/55 hover:shadow-[0_10px_32px_rgba(16,185,129,0.2)]'
        )
  );

  const catalogBtnClass = cn(
    'group relative text-left transition-all duration-300',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/45',
    compact
      ? 'flex w-full items-center gap-3 rounded-xl border border-cyan-400/30 bg-gradient-to-r from-cyan-500/10 via-card/80 to-card/60 px-3.5 py-3 hover:border-cyan-300/55'
      : cn(
          'flex w-[4.75rem] flex-col items-center gap-3 rounded-2xl border px-2.5 py-4',
          'border-cyan-400/35 bg-gradient-to-b from-cyan-500/12 via-card/85 to-card/70',
          'shadow-[0_8px_28px_rgba(0,0,0,0.18)] backdrop-blur-md',
          'hover:-translate-y-0.5 hover:border-cyan-300/60 hover:shadow-[0_10px_32px_rgba(34,211,238,0.2)]'
        )
  );

  return (
    <>
      <div
        className={shellClass}
        data-tour={compact ? 'vault-social-dock-mobile' : 'vault-social-dock-desktop'}
      >
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label={
            isLive
              ? 'Artist Home is public. Open visibility settings.'
              : 'Artist Home is private. Open visibility settings.'
          }
          className={homeBtnClass}
        >
          <span
            className={cn(
              'flex shrink-0 items-center justify-center rounded-full border',
              compact ? 'h-9 w-9' : 'h-10 w-10',
              isLive
                ? 'border-sky-400/50 bg-sky-500/15 text-sky-400 shadow-[0_0_18px_rgba(14,165,233,0.25)]'
                : 'border-muted-foreground/25 bg-muted/40 text-muted-foreground/70'
            )}
          >
            <UserRound className="h-4 w-4" />
          </span>

          <span className={cn('min-w-0', compact ? 'flex-1' : 'w-full text-center')}>
            <span
              className={cn(
                'block font-headline font-bold uppercase leading-tight tracking-tight',
                compact ? 'text-xs' : 'text-[10px]',
                isLive ? 'text-foreground' : 'text-muted-foreground/80'
              )}
            >
              {compact ? (
                'Artist Home'
              ) : (
                <>
                  Artist
                  <br />
                  Home
                </>
              )}
            </span>
            <span
              className={cn(
                'mt-1 block font-code font-bold uppercase tracking-[0.18em]',
                compact ? 'text-[9px]' : 'text-[8px]',
                isLive ? 'text-sky-400' : 'text-muted-foreground/55'
              )}
            >
              {isLive ? 'Live' : 'Public off'}
            </span>
          </span>

          {!compact && (
            <span
              className={cn(
                'mt-1 h-1 w-1 rounded-full',
                isLive ? 'bg-sky-400 shadow-[0_0_8px_rgba(14,165,233,0.8)]' : 'bg-muted-foreground/35'
              )}
            />
          )}

          {compact && (
            <Settings2
              className={cn(
                'h-3.5 w-3.5 shrink-0 transition-colors',
                isLive ? 'text-sky-400/80 group-hover:text-sky-300' : 'text-muted-foreground/50'
              )}
            />
          )}
        </button>

        <Link
          href="/activity"
          aria-label={
            alertCount > 0
              ? `Activity — ${alertCount} unread`
              : 'Activity — loves, replies, requests'
          }
          className={blockBtnClass}
        >
          <span
            className={cn(
              'relative flex shrink-0 items-center justify-center rounded-full border border-emerald-400/45 bg-emerald-500/15 text-emerald-400',
              compact ? 'h-9 w-9' : 'h-10 w-10',
              alertCount > 0 && 'shadow-[0_0_18px_rgba(16,185,129,0.3)]'
            )}
          >
            <Bell className="h-4 w-4" />
            <AlertBadge count={alertCount} compact={compact} />
          </span>

          <span className={cn('min-w-0', compact ? 'flex-1' : 'w-full text-center')}>
            <span
              className={cn(
                'block font-headline font-bold uppercase leading-tight tracking-tight text-foreground',
                compact ? 'text-xs' : 'text-[10px]'
              )}
            >
              Activity
            </span>
            <span
              className={cn(
                'mt-1 block font-code font-bold uppercase tracking-[0.18em] text-emerald-400/90',
                compact ? 'text-[9px]' : 'text-[8px]'
              )}
            >
              {alertCount > 0 ? `${alertCount > 99 ? '99+' : alertCount} new` : 'Inbox'}
            </span>
          </span>

          {!compact && (
            <span
              className={cn(
                'mt-1 h-1 w-1 rounded-full',
                alertCount > 0
                  ? 'bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.85)]'
                  : 'bg-emerald-500/40'
              )}
            />
          )}
        </Link>

        <button
          type="button"
          onClick={() => setCatalogOpen(true)}
          aria-label="Open Release Catalog"
          className={catalogBtnClass}
        >
          <span
            className={cn(
              'flex shrink-0 items-center justify-center rounded-full border border-cyan-300/45 bg-cyan-400/15 text-cyan-200',
              compact ? 'h-9 w-9' : 'h-10 w-10'
            )}
          >
            <Disc3 className="h-4 w-4" />
          </span>
          <span className={cn('min-w-0', compact ? 'flex-1' : 'w-full text-center')}>
            <span
              className={cn(
                'block whitespace-normal font-headline font-bold uppercase leading-tight tracking-tight text-foreground',
                compact ? 'text-xs' : 'text-[10px]'
              )}
            >
              {compact ? (
                'Release Catalog'
              ) : (
                <>
                  Release
                  <br />
                  Catalog
                </>
              )}
            </span>
            <span
              className={cn(
                'mt-1 block font-code font-bold uppercase tracking-[0.18em] text-cyan-300/90',
                compact ? 'text-[9px]' : 'text-[8px]'
              )}
            >
              Manage
            </span>
          </span>
          {!compact ? (
            <span className="mt-1 h-1 w-1 rounded-full bg-cyan-300/55 shadow-[0_0_8px_rgba(34,211,238,0.7)]" />
          ) : (
            <Settings2 className="h-3.5 w-3.5 shrink-0 text-cyan-300/70 transition-colors group-hover:text-cyan-200" />
          )}
        </button>
      </div>

      <ReleaseCatalogDialog open={catalogOpen} onOpenChange={setCatalogOpen} />

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md border-2 bg-card sm:rounded-2xl">
          <DialogHeader>
            <DialogTitle className="font-headline text-2xl uppercase tracking-tight">
              Artist Home visibility
            </DialogTitle>
            <DialogDescription className="text-sm leading-relaxed">
              Both switches off = fully private. Lyrics are never published — only the surfaces you
              choose.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 pt-1">
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
                  <Link href="/leaderboard" onClick={() => setOpen(false)}>
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
              <p className="text-xs text-muted-foreground leading-snug">
              Choose a clean name link — no random codes.
            </p>
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
              {summary.profileSlug && (
                <p className="font-code text-[10px] text-sky-300/90">
                  akasheet.com/{summary.profileSlug}
                </p>
              )}
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

            {isLive && homeHref && (
              <div className="flex flex-wrap gap-2 border-t border-border/60 pt-4">
                <Button className="h-10 gap-2 font-bold uppercase" asChild>
                  <Link href={homeHref} target="_blank" onClick={() => setOpen(false)}>
                    <ExternalLink className="h-4 w-4" /> View profile
                  </Link>
                </Button>
                <Button variant="outline" className="h-10 gap-2 font-bold uppercase" asChild>
                  <Link href="/profile/customize" onClick={() => setOpen(false)}>
                    <Settings2 className="h-4 w-4" /> Edit Public Page
                  </Link>
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
