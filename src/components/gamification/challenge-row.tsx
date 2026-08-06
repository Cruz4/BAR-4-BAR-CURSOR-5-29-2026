'use client';

import React, { useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import { cn } from '@/lib/utils';
import type { ChallengeDef } from '@/lib/gamification/challenges';
import {
  getChallengePercent,
  getChallengeProgress,
  isChallengeComplete,
  resolveChallengeTarget,
  SCALE_LABELS,
  TIER_LABELS,
} from '@/lib/gamification/challenges';
import type { GamificationSummary } from '@/lib/gamification/types';
import { CheckCircle2, Circle, Crown, Radio, Star } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ChallengeGoalFoilCard } from '@/components/gamification/challenge-goal-foil-card';
import { useAuth } from '@/hooks/use-auth';
import { useGamification } from '@/context/gamification-context';
import { useToast } from '@/hooks/use-toast';
import { createPost } from '@/lib/profile/social-client';
import { domNodeToFeedImageDataUrl } from '@/lib/gamification/feed-card-export';

const TIER_STYLE: Record<ChallengeDef['tier'], string> = {
  standard: 'border-white/10 bg-black/20',
  epic: 'border-violet-500/25 bg-violet-950/20',
  legendary: 'border-amber-500/30 bg-amber-950/15 shadow-[0_0_16px_rgba(251,191,36,0.08)]',
};

const TIER_ICON = {
  standard: Circle,
  epic: Star,
  legendary: Crown,
} as const;

type ChallengeRowProps = {
  challenge: ChallengeDef;
  summary: GamificationSummary;
  isPro?: boolean;
  comfortable?: boolean;
};

export function ChallengeRow({ challenge, summary, isPro = false, comfortable = false }: ChallengeRowProps) {
  const { user } = useAuth();
  const { rankLabel } = useGamification();
  const { toast } = useToast();
  const cardRef = useRef<HTMLDivElement>(null);
  const [postingFeed, setPostingFeed] = useState(false);

  const done = isChallengeComplete(summary, challenge, isPro);
  const progress = getChallengeProgress(summary, challenge, isPro);
  const percent = getChallengePercent(summary, challenge, isPro);
  const TierIcon = TIER_ICON[challenge.tier];
  const target = resolveChallengeTarget(challenge, isPro);
  const isRankGoal = challenge.field === 'rankHeadliner' || challenge.field === 'rankVaultArchitect';
  const displayName = user?.displayName || 'Studio Artist';

  const progressLabel = isRankGoal
    ? done
      ? 'Complete'
      : `${summary.xp.toLocaleString()} / ${challenge.target.toLocaleString()} XP`
    : `${progress}/${target}`;

  const shareToFeed = async () => {
    if (!user || !done) return;
    flushSync(() => setPostingFeed(true));
    try {
      await new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
      );
      let cardEl = cardRef.current;
      if (!cardEl) {
        await new Promise((r) => setTimeout(r, 80));
        cardEl = cardRef.current;
      }
      if (!cardEl) throw new Error('Goal card not ready — try again.');

      const imageUrl = await domNodeToFeedImageDataUrl(cardEl);
      await createPost({
        text: [
          `🎯 ${SCALE_LABELS[challenge.scale]} goal complete: ${challenge.label}`,
          challenge.description.trim(),
          challenge.tier !== 'standard' ? TIER_LABELS[challenge.tier] : '',
          '#bar4bar.ink',
        ]
          .filter(Boolean)
          .join('\n'),
        imageUrl,
        ownerName: displayName,
        ownerSlug: summary.profileSlug,
      });
      toast({
        title: 'Shared to your feed',
        description: 'Goal card posted on your wall / The Scene.',
      });
    } catch (e) {
      toast({
        variant: 'destructive',
        title: 'Could not share to feed',
        description: e instanceof Error ? e.message : undefined,
      });
    } finally {
      setPostingFeed(false);
    }
  };

  return (
    <li
      className={cn(
        'rounded-lg border space-y-2 transition-colors',
        comfortable ? 'px-3.5 py-3' : 'px-3 py-2.5',
        done ? 'border-emerald-500/30 bg-emerald-950/15' : TIER_STYLE[challenge.tier]
      )}
    >
      {done && postingFeed && (
        <div
          className="pointer-events-none fixed left-[-99999px] top-0 w-[400px] opacity-0"
          aria-hidden
        >
          <ChallengeGoalFoilCard
            ref={cardRef}
            challenge={challenge}
            displayName={displayName}
            rankLabel={rankLabel}
          />
        </div>
      )}

      <div className="flex flex-col gap-2 sm:flex-row sm:items-start">
        <div className="flex items-start gap-2 min-w-0 flex-1">
          {done ? (
            <CheckCircle2
              className={cn('text-emerald-400 shrink-0 mt-0.5', comfortable ? 'h-5 w-5' : 'h-4 w-4')}
            />
          ) : (
            <TierIcon
              className={cn('text-muted-foreground/50 shrink-0 mt-0.5', comfortable ? 'h-5 w-5' : 'h-4 w-4')}
            />
          )}
          <div className="flex-1 min-w-0 space-y-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <p
                className={cn(
                  'font-bold leading-tight break-words',
                  comfortable ? 'text-xs' : 'text-[11px]',
                  done ? 'text-emerald-200' : 'text-white/90'
                )}
              >
                {challenge.label}
              </p>
              {challenge.tier !== 'standard' && (
                <Badge
                  variant="outline"
                  className={cn(
                    'uppercase shrink-0',
                    comfortable ? 'text-[8px] h-5 px-2' : 'text-[7px] h-4 px-1.5',
                    challenge.tier === 'legendary'
                      ? 'border-amber-500/40 text-amber-300'
                      : 'border-violet-500/40 text-violet-300'
                  )}
                >
                  {TIER_LABELS[challenge.tier]}
                </Badge>
              )}
            </div>
            <p
              className={cn(
                'text-muted-foreground leading-snug break-words',
                comfortable ? 'text-[11px]' : 'text-[10px]'
              )}
            >
              {challenge.description}
            </p>
          </div>
        </div>
        <span
          className={cn(
            'font-mono shrink-0 tabular-nums whitespace-nowrap sm:text-right sm:pl-2',
            comfortable ? 'text-[11px]' : 'text-[10px]',
            done ? 'text-emerald-400' : 'text-muted-foreground'
          )}
        >
          {progressLabel}
        </span>
      </div>
      {!done && (
        <div className={cn('rounded-full bg-white/5 overflow-hidden', comfortable ? 'h-1.5' : 'h-1')}>
          <div
            className={cn(
              'h-full rounded-full transition-all duration-500',
              challenge.tier === 'legendary'
                ? 'bg-gradient-to-r from-amber-600 to-yellow-400'
                : challenge.tier === 'epic'
                  ? 'bg-gradient-to-r from-violet-600 to-fuchsia-400'
                  : 'bg-gradient-to-r from-sky-600 to-primary'
            )}
            style={{ width: `${percent}%` }}
          />
        </div>
      )}
      {done && (
        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="h-8 w-full text-[10px] font-bold uppercase tracking-wide gap-1.5"
          disabled={postingFeed || !user}
          onClick={() => void shareToFeed()}
        >
          <Radio className="h-3.5 w-3.5" />
          {postingFeed ? 'Posting foil…' : 'Share to feed'}
        </Button>
      )}
    </li>
  );
}

type ChallengeSectionProps = {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  challenges: ChallengeDef[];
  summary: GamificationSummary;
  isPro?: boolean;
  accentClass?: string;
  comfortable?: boolean;
};

export function ChallengeSection({
  title,
  subtitle,
  icon,
  challenges,
  summary,
  isPro,
  accentClass = 'border-primary/20',
  comfortable = false,
}: ChallengeSectionProps) {
  const completed = challenges.filter((c) => isChallengeComplete(summary, c, isPro)).length;

  return (
    <section className={cn('rounded-xl border bg-card/40 overflow-hidden min-w-0', accentClass)}>
      <div
        className={cn(
          'flex items-center justify-between gap-2 border-b border-white/5 bg-black/20 min-w-0',
          comfortable ? 'px-4 py-3.5' : 'px-4 py-3'
        )}
      >
        <div className="flex items-center gap-2 min-w-0 flex-1 overflow-hidden">
          <span className="shrink-0">{icon}</span>
          <div className="min-w-0 overflow-hidden">
            <h2
              className={cn(
                'font-headline font-bold uppercase tracking-tight truncate',
                comfortable ? 'text-base' : 'text-sm'
              )}
            >
              {title}
            </h2>
            <p
              className={cn(
                'text-muted-foreground leading-snug break-words',
                comfortable ? 'text-[11px]' : 'text-[10px]'
              )}
            >
              {subtitle}
            </p>
          </div>
        </div>
        <Badge variant="outline" className={cn('font-mono shrink-0', comfortable ? 'text-[10px]' : 'text-[9px]')}>
          {completed}/{challenges.length}
        </Badge>
      </div>
      <ul className={cn('space-y-2', comfortable ? 'p-3.5' : 'p-3')}>
        {challenges.map((challenge) => (
          <ChallengeRow
            key={challenge.id}
            challenge={challenge}
            summary={summary}
            isPro={isPro}
            comfortable={comfortable}
          />
        ))}
      </ul>
    </section>
  );
}

export function LeaderboardCompareCard({
  label,
  rank,
  value,
  unit = '',
  hidden,
  formatValue = (v: number) => v,
  comfortable = false,
}: {
  label: string;
  rank: { rank: number; total: number; value: number } | null;
  value?: number;
  unit?: string;
  hidden?: boolean;
  formatValue?: (value: number) => number;
  comfortable?: boolean;
}) {
  const displayValue = formatValue(value ?? rank?.value ?? 0);

  return (
    <div
      className={cn(
        'rounded-lg border border-orange-500/20 bg-gradient-to-br from-black/40 to-orange-950/15 space-y-1 min-w-0 overflow-hidden',
        comfortable ? 'px-3.5 py-3' : 'px-3 py-2.5'
      )}
    >
      <p
        className={cn(
          'font-bold uppercase tracking-wide text-orange-800/90 dark:text-orange-300/80 truncate',
          comfortable ? 'text-[10px]' : 'text-[9px]'
        )}
      >
        {label}
      </p>
      {hidden ? (
        <p className={cn('text-muted-foreground italic break-words', comfortable ? 'text-[11px]' : 'text-[10px]')}>
          Hidden from leaderboard
        </p>
      ) : rank ? (
        <>
          <p
            className={cn(
              'font-headline font-bold text-orange-700 dark:text-orange-200 leading-tight',
              comfortable ? 'text-xl' : 'text-lg'
            )}
          >
            #{rank.rank}
            <span className={cn('font-normal text-muted-foreground', comfortable ? 'text-base' : 'text-sm')}>
              {' '}
              / {rank.total}
            </span>
          </p>
          <p
            className={cn(
              'font-code text-muted-foreground leading-snug break-words',
              comfortable ? 'text-[11px]' : 'text-[10px]'
            )}
          >
            {displayValue.toLocaleString()}
            {unit} · top {Math.max(1, Math.round((rank.rank / rank.total) * 100))}% this week
          </p>
        </>
      ) : (
        <>
          <p className={cn('text-muted-foreground', comfortable ? 'text-xs' : 'text-[11px]')}>Not ranked yet</p>
          <p
            className={cn(
              'font-code text-muted-foreground/80 leading-snug break-words',
              comfortable ? 'text-[11px]' : 'text-[10px]'
            )}
          >
            You: {displayValue.toLocaleString()}
            {unit} — write this week to appear
          </p>
        </>
      )}
    </div>
  );
}
