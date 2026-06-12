'use client';

import React, { useCallback, useContext, useEffect, useState } from 'react';
import Link from 'next/link';
import { flushSync } from 'react-dom';
import { useRouter } from 'next/navigation';
import { CheckCircle2, Circle, Dna, Timer, X } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { DataContext } from '@/context/data-context';
import {
  getProFeaturePreviewHoursRemaining,
  isProFeaturePreviewActive,
  isProUser,
} from '@/lib/subscription';
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
import { canUserAddTrack, FREE_TRACK_LIMIT_TOAST } from '@/lib/subscription';
import { useToast } from '@/hooks/use-toast';

export function ProTrialWinQuestStrip() {
  const router = useRouter();
  const { toast } = useToast();
  const { user } = useAuth();
  const { albums, loading: vaultLoading, addTrack } = useContext(DataContext);
  const [winComplete, setWinComplete] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  const paidPro = isProUser(user);
  const previewActive = isProFeaturePreviewActive(user);
  const previewHours = getProFeaturePreviewHoursRemaining(user);
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
      <div className="shrink-0 border-b border-emerald-500/25 bg-emerald-500/[0.08] px-4 py-2 flex items-center gap-3 z-50">
        <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" aria-hidden />
        <p className="text-[10px] sm:text-[11px] font-code text-emerald-100/90 flex-grow min-w-0">
          <span className="font-bold uppercase tracking-widest text-emerald-400">Pro preview quest complete</span>
          {' — '}
          {PRO_TRIAL_WIN_QUEST.completeSummary}
        </p>
        <Link
          href="/usage?tab=cloud"
          onClick={() => trackUpgradeClick('trial_quest', { questState: 'complete' })}
          className="text-[9px] font-bold uppercase text-emerald-400 hover:text-emerald-300 hover:underline shrink-0 whitespace-nowrap"
        >
          Upgrade →
        </Link>
        <button
          type="button"
          onClick={() => void handleDismiss()}
          className="text-muted-foreground hover:text-foreground shrink-0 p-1"
          aria-label="Dismiss"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    );
  }

  if (!shouldShowProTrialWinQuest(user)) return null;

  return (
    <div className="pro-trial-banner-glow shrink-0 px-4 py-2.5 flex flex-col sm:flex-row sm:items-center gap-3 z-50 border-b border-sky-500/20">
      <div className="flex items-start gap-3 flex-grow min-w-0">
        <Dna className="h-4 w-4 text-sky-400 shrink-0 mt-0.5" aria-hidden />
        <div className="space-y-1 min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-widest text-sky-400 leading-none flex items-center gap-2 flex-wrap">
            <span>{PRO_TRIAL_WIN_QUEST.title}</span>
            {previewActive && (
              <span className="inline-flex items-center gap-1 text-sky-300/90 font-code normal-case tracking-normal">
                <Timer className="h-3 w-3" />
                {previewHours === null || previewHours <= 1
                  ? 'under 1h left on Pro preview'
                  : `${previewHours}h left on Pro preview`}
              </span>
            )}
          </p>
          <p className="text-[10px] sm:text-[11px] text-muted-foreground leading-snug flex items-start gap-2">
            <Circle className="h-3 w-3 shrink-0 mt-0.5 text-sky-400" aria-hidden />
            <span>
              <span className="text-foreground/90 font-medium">{PRO_TRIAL_WIN_QUEST.task}.</span>{' '}
              {PRO_TRIAL_WIN_QUEST.hint}
            </span>
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0 sm:self-center">
        <button
          type="button"
          onClick={goToDnaSave}
          disabled={vaultLoading}
          className={cn(
            'text-[9px] sm:text-[10px] font-bold uppercase px-3 py-1.5 rounded-md',
            'bg-sky-500/20 border border-sky-500/40 text-sky-300 hover:bg-sky-500/30 hover:text-sky-200 transition-colors',
            vaultLoading && 'opacity-50 cursor-not-allowed hover:bg-sky-500/20 hover:text-sky-300'
          )}
        >
          {vaultLoading ? 'Loading vault…' : PRO_TRIAL_WIN_QUEST.cta}
        </button>
        <Link
          href="/usage?tab=cloud"
          onClick={() => trackUpgradeClick('trial_quest', { questState: 'active' })}
          className="text-[9px] font-bold uppercase text-sky-400/80 hover:text-sky-300 hover:underline whitespace-nowrap"
        >
          Upgrade
        </Link>
        <button
          type="button"
          onClick={() => void handleDismiss()}
          className="text-[9px] font-bold uppercase text-muted-foreground hover:text-foreground whitespace-nowrap px-1"
        >
          Skip
        </button>
      </div>
    </div>
  );
}
