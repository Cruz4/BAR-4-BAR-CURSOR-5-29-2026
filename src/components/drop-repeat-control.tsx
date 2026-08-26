'use client';

import { Repeat, Repeat1 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { DropRepeatMode } from '@/context/drop-player-context';
import { cn } from '@/lib/utils';

const MODE_LABEL: Record<DropRepeatMode, string> = {
  off: 'Repeat off',
  all: 'Repeat playlist',
  one: 'Repeat song',
};

export function nextDropRepeatMode(mode: DropRepeatMode): DropRepeatMode {
  return mode === 'off' ? 'all' : mode === 'all' ? 'one' : 'off';
}

export function DropRepeatControl({
  repeat,
  onChange,
  compact = false,
  className,
}: {
  repeat: DropRepeatMode;
  onChange: (mode: DropRepeatMode) => void;
  compact?: boolean;
  className?: string;
}) {
  const label = MODE_LABEL[repeat];
  return (
    <Button
      type="button"
      size="icon"
      variant={repeat === 'off' ? 'ghost' : 'secondary'}
      className={cn(
        'relative shrink-0',
        compact ? 'h-7 w-7' : 'h-9 w-9',
        repeat !== 'off' && 'border border-fuchsia-400/35 bg-fuchsia-500/15 text-fuchsia-200 hover:bg-fuchsia-500/25',
        className
      )}
      onClick={() => onChange(nextDropRepeatMode(repeat))}
      aria-label={`${label}. Change repeat mode`}
      title={`${label} — tap for ${MODE_LABEL[nextDropRepeatMode(repeat)].toLowerCase()}`}
    >
      {repeat === 'one' ? (
        <Repeat1 className={compact ? 'h-3.5 w-3.5' : 'h-4 w-4'} />
      ) : (
        <Repeat className={compact ? 'h-3.5 w-3.5' : 'h-4 w-4'} />
      )}
      <span className="sr-only">{label}</span>
    </Button>
  );
}
