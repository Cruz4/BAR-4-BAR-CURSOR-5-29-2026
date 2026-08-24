'use client';

import React from 'react';
import { Volume1, Volume2, VolumeX } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

type AudioVolumeControlProps = {
  volume: number;
  onVolumeChange: (volume: number) => void;
  onToggleMute: () => void;
  compact?: boolean;
  className?: string;
};

function VolumeIcon({ volume }: { volume: number }) {
  if (volume === 0) return <VolumeX className="h-4 w-4" />;
  if (volume < 0.5) return <Volume1 className="h-4 w-4" />;
  return <Volume2 className="h-4 w-4" />;
}

function VolumeSlider({
  volume,
  onVolumeChange,
}: Pick<AudioVolumeControlProps, 'volume' | 'onVolumeChange'>) {
  return (
    <input
      type="range"
      min={0}
      max={1}
      step={0.01}
      value={volume}
      onChange={(event) => onVolumeChange(Number(event.target.value))}
      className="h-1.5 min-w-0 flex-1 cursor-pointer accent-fuchsia-400"
      aria-label="Player volume"
      aria-valuetext={`${Math.round(volume * 100)} percent`}
    />
  );
}

export function AudioVolumeControl({
  volume,
  onVolumeChange,
  onToggleMute,
  compact = false,
  className,
}: AudioVolumeControlProps) {
  const label = volume === 0 ? 'Unmute player' : 'Mute player';

  if (compact) {
    return (
      <Popover>
        <PopoverTrigger asChild>
          <button
            type="button"
            className={cn(
              'inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-white/5 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              className
            )}
            aria-label={`Volume: ${Math.round(volume * 100)} percent`}
            title={`Volume: ${Math.round(volume * 100)}%`}
          >
            <VolumeIcon volume={volume} />
          </button>
        </PopoverTrigger>
        <PopoverContent
          side="top"
          align="end"
          className="w-48 p-3"
          onClick={(event) => event.stopPropagation()}
        >
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onToggleMute}
              className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-white/5 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label={label}
              title={label}
            >
              <VolumeIcon volume={volume} />
            </button>
            <VolumeSlider volume={volume} onVolumeChange={onVolumeChange} />
            <span className="w-8 shrink-0 text-right font-code text-[9px] tabular-nums text-muted-foreground">
              {Math.round(volume * 100)}
            </span>
          </div>
        </PopoverContent>
      </Popover>
    );
  }

  return (
    <div
      className={cn('flex min-w-0 items-center gap-2', className)}
      onClick={(event) => event.stopPropagation()}
    >
      <button
        type="button"
        onClick={onToggleMute}
        className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-white/5 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        aria-label={label}
        title={label}
      >
        <VolumeIcon volume={volume} />
      </button>
      <VolumeSlider volume={volume} onVolumeChange={onVolumeChange} />
      <span className="w-8 shrink-0 text-right font-code text-[9px] tabular-nums text-muted-foreground">
        {Math.round(volume * 100)}
      </span>
    </div>
  );
}
