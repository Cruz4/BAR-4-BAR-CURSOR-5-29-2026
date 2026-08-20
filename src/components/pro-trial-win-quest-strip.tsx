'use client';

import React, { useCallback, useContext, useEffect, useState } from 'react';
import Link from 'next/link';
import { flushSync } from 'react-dom';
import { useRouter } from 'next/navigation';
import { CheckCircle2, Sparkles, X } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { DataContext } from '@/context/data-context';
import { isProUser, canUserAddTrack, FREE_TRACK_LIMIT_TOAST } from '@/lib/subscription';
import {
  PRO_TRIAL_WIN_EVENT,
  PRO_TRIAL_WIN_QUEST,
  shouldShowProTrialWinQuest,
  isProTrialWinComplete,
} from '@/lib/pro-trial-quest';
import { dismissProTrialWinQuest } from '@/lib/pro-trial-quest-client';
import { resolveWorkstationTourPath } from '@/lib/studio-onboarding';
import {
  buildDefaultLooseTrack,
  requestOpenRemixWorkstation,
} from '@/lib/workstation-path';
import { cn } from '@/lib/utils';
import { trackUpgradeClick } from '@/lib/conversion-analytics';
import { useToast } from '@/hooks/use-toast';
import {
  BANNER_CHROME_ICON,
  BANNER_CHROME_ROW,
  BANNER_PRIMARY_BTN,
  BANNER_PRIMARY_COL,
} from '@/components/banner-chrome';

export function ProTrialWinQuestStrip() {
  const router = useRouter();
  const { toast } = useToast();
  const { user } = useAuth();
  const { albums, loading: vaultLoading, addTrack } = useContext(DataContext);
  const [winComplete, setWinComplete] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  const paidPro = isProUser(user);
  const questDone = winComplete || isProTrialWinComplete(user);

  useEffect(() => {
    setWinComplete(isProTrialWinComplete(user));
  }, [user?.proTrialWinCompletedAt, user]);

  useEffect(() => {
    const onWin = () => setWinComplete(true);
    window.addEventListener(PRO_TRIAL_WIN_EVENT, onWin);
    return () => window.removeEventListener(PRO_TRIAL_WIN_EVENT, onWin);
  }, []);

  const goToDnaSave = useCallback(() => {
    if (vaultLoading || !user) return;

    let path = resolveWorkstationTourPath(albums);

    if (!path) {
      if (!canUserAddTrack(albums, user)) {
        toast(FREE_TRACK_LIMIT_TOAST);
        router.push('/usage?tab=cloud');
        return;
      }
      try {
        let created;
        flushSync(() => {
          created = addTrack('unassigned', buildDefaultLooseTrack(user.id));
        });
        path = `/albums/unassigned/tracks/${created!.id}`;
      } catch (e) {
        toast({
          variant: 'destructive',
          title: 'Could not create track',
          description: e instanceof Error ? e.message : 'Try Create New on the vault.',
        });
        return;
      }
    }

    requestOpenRemixWorkstation(path, router);
  }, [addTrack, albums, router, toast, user, vaultLoading]);

  const handleDismiss = useCallback(async () => {
    if (!user) return;
    setDismissed(true);
    try {
      await dismissProTrialWinQuest(user.id);
    } catch (e) {
      console.warn('Failed to dismiss Pro trial quest', e);
    }
  }, [user]);

  if (!user || paidPro) return null;
  if (user.proTrialWinDismissedAt || dismissed) return null;

  if (questDone) {
    return (
      <div
        data-app-chrome
        className={cn(
          BANNER_CHROME_ROW,
          'grid-cols-[1rem_minmax(5.75rem,5.75rem)_minmax(0,1fr)_auto] border-b border-emerald-500/25 bg-emerald-100/70 dark:bg-emerald-500/[0.08]'
        )}
      >
        <CheckCircle2 className={cn(BANNER_CHROME_ICON, 'text-emerald-600 dark:text-emerald-400')} aria-hidden />
        <Link
          href="/usage?tab=cloud"
          onClick={() => trackUpgradeClick('trial_quest', { questState: 'complete' })}
          className={cn(
            BANNER_PRIMARY_BTN,
            BANNER_PRIMARY_COL,
            'bg-emerald-600/15 border border-emerald-600/35 text-emerald-900 dark:bg-emerald-500/20 dark:border-emerald-500/40 dark:text-emerald-300 hover:bg-emerald-600/25 hover:text-emerald-950 dark:hover:bg-emerald-500/30 dark:hover:text-emerald-200'
          )}
        >
          Upgrade →
        </Link>
        <p className="text-[10px] sm:text-[11px] font-code text-emerald-950/90 dark:text-emerald-100/90 min-w-0 sm:pr-[min(21rem,calc(3%+19rem))]">
          <span className="font-bold uppercase tracking-widest text-emerald-800 dark:text-emerald-400">Nice</span>
          {' — '}
          {PRO_TRIAL_WIN_QUEST.completeSummary}
        </p>
        <button
          type="button"
          onClick={() => void handleDismiss()}
          className="text-muted-foreground hover:text-foreground shrink-0 justify-self-end p-1"
          aria-label="Dismiss"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    );
  }

  if (!shouldShowProTrialWinQuest(user)) return null;

  return (
    <div
      data-app-chrome
      className={cn(
        BANNER_CHROME_ROW,
        'pro-trial-banner-glow grid-cols-[1rem_minmax(5.75rem,5.75rem)_auto_minmax(0,1fr)_auto] border-b border-sky-500/25 bg-sky-100/60 dark:bg-transparent dark:border-sky-500/20'
      )}
    >
      <Sparkles className={cn(BANNER_CHROME_ICON, 'text-sky-400')} aria-hidden />
      <button
        type="button"
        onClick={goToDnaSave}
        disabled={vaultLoading}
        className={cn(
          BANNER_PRIMARY_BTN,
          BANNER_PRIMARY_COL,
          'bg-sky-600/15 border border-sky-600/35 text-sky-900 dark:bg-sky-500/20 dark:border-sky-500/40 dark:text-sky-300 hover:bg-sky-600/25 hover:text-sky-950 dark:hover:bg-sky-500/30 dark:hover:text-sky-200 transition-colors',
          vaultLoading && 'opacity-50 cursor-not-allowed hover:bg-sky-600/15 hover:text-sky-900 dark:hover:bg-sky-500/20 dark:hover:text-sky-300'
        )}
      >
        {vaultLoading ? 'Loading vault…' : PRO_TRIAL_WIN_QUEST.cta}
      </button>
      <Link
        href="/usage?tab=cloud"
        onClick={() => trackUpgradeClick('trial_quest', { questState: 'active' })}
        className="text-[9px] font-bold uppercase text-sky-800/90 hover:text-sky-950 dark:text-sky-400/80 dark:hover:text-sky-300 hover:underline shrink-0 whitespace-nowrap"
      >
        Upgrade
      </Link>
      <p className="text-[10px] sm:text-[11px] text-muted-foreground leading-snug min-w-0 sm:pr-[min(21rem,calc(3%+19rem))]">
        <span className="font-bold uppercase tracking-widest text-sky-800 dark:text-sky-400">
          {PRO_TRIAL_WIN_QUEST.title}
        </span>
        {' — '}
        <span className="text-foreground/90">{PRO_TRIAL_WIN_QUEST.task}.</span>{' '}
        {PRO_TRIAL_WIN_QUEST.hint}
      </p>
      <button
        type="button"
        onClick={() => void handleDismiss()}
        className="text-[9px] font-bold uppercase text-muted-foreground hover:text-foreground whitespace-nowrap shrink-0 justify-self-end px-1"
      >
        Skip
      </button>
    </div>
  );
}
