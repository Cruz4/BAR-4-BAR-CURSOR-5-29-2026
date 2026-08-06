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

export function SceneBoothCard({ className }: { className?: string }) {
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
  const profileHref = summary.profileSlug ? `/profile/${summary.profileSlug}` : null;
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
          : 'Your page is off the web until you flip it back on.',
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
      className={cn(
        'relative overflow-hidden border p-4 sm:p-5 transition-all',
        isLive
          ? 'border-sky-500/35 bg-gradient-to-br from-sky-500/10 via-card/90 to-card/70'
          : 'border-border/70 bg-card/60',
        className
      )}
      data-tour="scene-booth"
    >
      <div className="flex flex-wrap items-center gap-3 sm:gap-4">
        <ArtistStarAvatar
          name={user.displayName || 'Artist'}
          useStarMark={useStarMark}
          starMarkSeed={summary.starMarkSeed}
          avatarUrl={avatarUrl}
          size={44}
          href={profileHref || undefined}
          toneClass={
            isLive
              ? 'bg-sky-500/15 text-sky-400'
              : 'bg-muted/40 text-muted-foreground/70'
          }
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
          <p className="truncate font-headline text-base font-bold uppercase tracking-tight text-foreground">
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

      <div className="mt-3 flex flex-wrap gap-2 border-t border-border/50 pt-3">
        {isLive && profileHref ? (
          <>
            <Button size="sm" className="h-9 gap-1.5 font-bold uppercase" asChild>
              <Link href={profileHref}>
                <ExternalLink className="h-3.5 w-3.5" /> View my page
              </Link>
            </Button>
            <Button size="sm" variant="outline" className="h-9 gap-1.5 font-bold uppercase" asChild>
              <Link href="/profile/customize">
                <Settings2 className="h-3.5 w-3.5" /> Edit Public Page
              </Link>
            </Button>
          </>
        ) : (
          <>
            <p className="w-full text-xs leading-snug text-muted-foreground">
              Your Artist Home is your page on the scene — skin, Album Rooms, wall, friends.
              Lyrics are never published. Flip it live and start decorating.
            </p>
            <Button size="sm" variant="outline" className="h-9 gap-1.5 font-bold uppercase" asChild>
              <Link href="/profile/customize">
                <Settings2 className="h-3.5 w-3.5" /> Set up my page
              </Link>
            </Button>
          </>
        )}
      </div>
    </Card>
  );
}
