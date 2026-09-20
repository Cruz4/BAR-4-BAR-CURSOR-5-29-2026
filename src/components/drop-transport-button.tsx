'use client';

import { Loader, Pause, Play } from 'lucide-react';
import { cn } from '@/lib/utils';

type DropTransportButtonProps = {
  playing: boolean;
  loading?: boolean;
  disabled?: boolean;
  onClick: () => void;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  'aria-label'?: string;
};

/** AKAsheet drop play control — fuchsia/cyan press ring, not generic primary blue. */
export function DropTransportButton({
  playing,
  loading = false,
  disabled = false,
  onClick,
  size = 'md',
  className,
  'aria-label': ariaLabel = 'Play',
}: DropTransportButtonProps) {
  const dim =
    size === 'sm' ? 'h-9 w-9' : size === 'lg' ? 'h-11 w-11' : 'h-10 w-10';
  const iconClass = size === 'lg' ? 'h-5 w-5' : 'h-4 w-4';
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      aria-label={playing ? 'Pause' : ariaLabel}
      className={cn(
        'relative shrink-0 rounded-full border-2 transition-[box-shadow,transform] duration-300',
        dim,
        'border-fuchsia-200/80 bg-gradient-to-br from-fuchsia-300 via-fuchsia-400 to-cyan-300 text-black',
        'shadow-[0_0_16px_rgba(232,121,249,0.4)] hover:brightness-105 active:scale-[0.97]',
        playing &&
          'shadow-[0_0_26px_rgba(34,211,238,0.5)] ring-2 ring-cyan-300/45 ring-offset-1 ring-offset-black/40',
        disabled && 'cursor-not-allowed opacity-45 hover:brightness-100 active:scale-100',
        className
      )}
    >
      {playing ? (
        <span
          className="pointer-events-none absolute inset-0 rounded-full bg-cyan-300/15 animate-pulse"
          aria-hidden
        />
      ) : null}
      <span className="relative flex h-full w-full items-center justify-center">
        {loading ? (
          <Loader className={cn(iconClass, 'animate-spin')} />
        ) : playing ? (
          <Pause className={iconClass} />
        ) : (
          <Play className={cn('ml-0.5', iconClass)} />
        )}
      </span>
    </button>
  );
}
