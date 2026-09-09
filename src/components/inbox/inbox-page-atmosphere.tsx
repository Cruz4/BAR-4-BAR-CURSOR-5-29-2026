'use client';

import { cn } from '@/lib/utils';

type InboxAtmosphereVariant = 'activity' | 'msgs' | 'msgs-thread' | 'public-post';

const VARIANT: Record<
  InboxAtmosphereVariant,
  { base: string; glowA: string; glowB: string; glowC: string; grid: string; grain: string }
> = {
  activity: {
    base: 'bg-[#04111f]',
    glowA: 'bg-emerald-500/14',
    glowB: 'bg-cyan-400/10',
    glowC: 'bg-violet-500/10',
    grid: 'from-emerald-400/[0.07] via-transparent to-cyan-400/[0.05]',
    grain: 'opacity-[0.35]',
  },
  msgs: {
    base: 'bg-[#0c0906]',
    glowA: 'bg-amber-500/16',
    glowB: 'bg-orange-500/10',
    glowC: 'bg-fuchsia-500/8',
    grid: 'from-amber-300/[0.08] via-transparent to-orange-400/[0.05]',
    grain: 'opacity-[0.4]',
  },
  'msgs-thread': {
    base: 'bg-[#0a0806]',
    glowA: 'bg-amber-400/14',
    glowB: 'bg-amber-600/10',
    glowC: 'bg-sky-500/6',
    grid: 'from-amber-200/[0.06] via-transparent to-amber-500/[0.04]',
    grain: 'opacity-[0.32]',
  },
  'public-post': {
    base: 'bg-[#060a14]',
    glowA: 'bg-fuchsia-500/16',
    glowB: 'bg-cyan-400/12',
    glowC: 'bg-violet-600/10',
    grid: 'from-fuchsia-400/[0.08] via-transparent to-cyan-400/[0.05]',
    grain: 'opacity-[0.38]',
  },
};

export function InboxPageAtmosphere({
  variant,
  className,
}: {
  variant: InboxAtmosphereVariant;
  className?: string;
}) {
  const tone = VARIANT[variant];
  return (
    <div className={cn('pointer-events-none absolute inset-0 overflow-hidden', className)} aria-hidden>
      <div className={cn('absolute inset-0', tone.base)} />
      <div
        className={cn(
          'absolute -left-[18%] top-[-8%] h-[52%] w-[62%] rounded-full blur-[110px]',
          tone.glowA
        )}
      />
      <div
        className={cn(
          'absolute -right-[12%] top-[8%] h-[44%] w-[54%] rounded-full blur-[100px]',
          tone.glowB
        )}
      />
      <div
        className={cn(
          'absolute bottom-[-10%] left-[20%] h-[40%] w-[58%] rounded-full blur-[120px]',
          tone.glowC
        )}
      />
      <div
        className={cn(
          'absolute inset-0 bg-[radial-gradient(ellipse_90%_55%_at_50%_-8%,var(--tw-gradient-from),transparent_68%)]',
          tone.grid
        )}
      />
      <div
        className={cn(
          'absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:28px_28px] [mask-image:radial-gradient(ellipse_85%_70%_at_50%_40%,black,transparent)]',
          tone.grain
        )}
      />
    </div>
  );
}
