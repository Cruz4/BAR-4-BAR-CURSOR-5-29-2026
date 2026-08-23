'use client';

/**
 * Your Booth — the viewer's own Artist Home preview on the Scene feed.
 * Live: quick links to view/share/edit the page. Not live: one-tap go-live,
 * so a brand-new account always has something to do on day one.
 */

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { ExternalLink, Globe, Settings2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { ArtistStarAvatar } from '@/components/profile/artist-star-avatar';
import { useAuth } from '@/hooks/use-auth';
import { useGamification } from '@/context/gamification-context';
import { patchGamificationSettings } from '@/lib/gamification-client';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { profileHref } from '@/lib/profile/profile-slug';
import { studioChromeFromUser } from '@/lib/studio-tier-chrome';
import { SCENE_BOOTH_ID } from '@/lib/scene-home';

export function SceneBoothCard({
  className,
  children,
}: {
  className?: string;
  children?: React.ReactNode;
}) {
  const { user } = useAuth();
  const { summary, rankLabel, loading } = useGamification();
  const { toast } = useToast();
  const [publicProfile, setPublicProfile] = useState(summary.publicProfile);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setPublicProfile(summary.publicProfile);
  }, [summary.publicProfile]);

  if (!user || loading) return null;

  const isLive = Boolean(publicProfile && summary.profileSlug);
  const homeHref = summary.profileSlug ? profileHref(summary.profileSlug) : null;
  const useStarMark = Boolean(summary.starMarkUseStar);
  const avatarUrl =
    !useStarMark &&
    summary.profilePhotoMode === 'custom' &&
    typeof summary.profilePhotoUrl === 'string' &&
    summary.profilePhotoUrl.trim()
      ? summary.profilePhotoUrl.trim()
      : undefined;

  const toggleLive = async (next: boolean) => {
    setPublicProfile(next);
    setSaving(true);
    try {
      await patchGamificationSettings({
        publicProfile: next,
        displayName: user.displayName,
      });
      toast({
        title: next ? 'Your Artist Home is live' : 'Artist Home set to private',
        description: next
          ? 'Friends and the Discover stream can find your page now.'
          : 'Nobody can open your public page or add new public posts and replies.',
      });
    } catch {
      setPublicProfile(!next);
      toast({ variant: 'destructive', title: 'Could not update visibility' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card
      id={SCENE_BOOTH_ID}
      className={cn(
        'relative scroll-mt-[5.5rem] overflow-hidden border px-3 py-2.5 transition-all sm:px-3.5',
        isLive
          ? 'border-sky-500/35 bg-gradient-to-br from-sky-500/10 via-card/90 to-card/70'
          : 'border-border/70 bg-card/60',
        className
      )}
      data-tour="scene-booth"
    >
      <div className="flex items-center gap-3">
        <ArtistStarAvatar
          name={user.displayName || 'Artist'}
          useStarMark={useStarMark}
          starMarkSeed={summary.starMarkSeed}
          avatarUrl={avatarUrl}
          size={44}
          href={homeHref || undefined}
          toneClass={
            isLive
              ? 'bg-sky-500/15 text-sky-400'
              : 'bg-muted/40 text-muted-foreground/70'
          }
          studioChrome={studioChromeFromUser(user)}
          className={
            isLive
              ? 'border-sky-400/50 shadow-[0_0_18px_rgba(14,165,233,0.25)]'
              : undefined
          }
        />

        <div className="min-w-0 flex-1">
          <p className="font-code text-[9px] font-bold uppercase tracking-[0.28em] text-muted-foreground/70">
            Your booth
          </p>
          <p className="truncate font-headline text-base font-bold uppercase tracking-tight leading-tight">
            {user.displayName || 'Artist'}
          </p>
          <p
            className={cn(
              'font-code text-[9px] font-bold uppercase tracking-[0.18em]',
              isLive ? 'text-sky-400' : 'text-muted-foreground/55'
            )}
          >
            {rankLabel} · {isLive ? 'Live on the web' : 'Page is private'}
          </p>
        </div>

        <label className="flex shrink-0 items-center gap-2">
          <Globe className={cn('h-3.5 w-3.5', isLive ? 'text-sky-400' : 'text-muted-foreground/50')} />
          <span className="font-code text-[9px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
            {isLive ? 'Live' : 'Go live'}
          </span>
          <Switch checked={publicProfile} disabled={saving} onCheckedChange={(c) => void toggleLive(c)} />
        </label>
      </div>

      {!isLive ? (
        <p className="mt-1.5 text-[11px] leading-snug text-muted-foreground">
          Nobody can open your public profile or add new wall posts and replies until you go live.
          Existing activity stays visible. You can still write privately in Vault and{' '}
          <Link href="/profile/customize" className="font-semibold text-sky-300 hover:underline">
            set up your page
          </Link>
          . Lyrics stay private.
        </p>
      ) : null}

      {children ? <div className="mt-2">{children}</div> : null}

      {isLive && homeHref ? (
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <Button size="sm" className="h-9 gap-1.5 font-bold uppercase" asChild>
            <Link href={homeHref}>
              <ExternalLink className="h-3.5 w-3.5" /> View my page
            </Link>
          </Button>
          <Button size="sm" variant="outline" className="h-9 gap-1.5 font-bold uppercase" asChild>
            <Link href="/profile/customize">
              <Settings2 className="h-3.5 w-3.5" /> Edit Public Page
            </Link>
          </Button>
        </div>
      ) : null}
    </Card>
  );
}
