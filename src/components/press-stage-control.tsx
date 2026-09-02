'use client';

import React from 'react';
import {
  PRESS_STAGES,
  parsePressStage,
  pressStagePercent,
  type PressStageId,
} from '@/lib/press-release-tracking';
import { cn } from '@/lib/utils';

export function PressStageControl({
  stage,
  onChange,
  disabled = false,
  compact = false,
}: {
  stage?: PressStageId;
  onChange: (next: PressStageId) => void;
  disabled?: boolean;
  compact?: boolean;
}) {
  const current = parsePressStage(stage);
  const percent = pressStagePercent(current);
  const meta = PRESS_STAGES.find((item) => item.id === current)!;

  return (
    <div className={cn('min-w-0 space-y-1.5', disabled && 'opacity-60')}>
      <div className="flex items-center justify-between gap-2">
        <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">
          {meta.label} · {percent}%
        </p>
        {!compact ? (
          <p className="truncate text-[9px] font-code text-muted-foreground/70">{meta.detail}</p>
        ) : null}
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-muted/60">
        <div
          className="h-full rounded-full bg-sky-400/90 transition-[width]"
          style={{ width: `${percent}%` }}
        />
      </div>
      <select
        value={current}
        disabled={disabled}
        onChange={(e) => onChange(parsePressStage(e.target.value))}
        className="h-8 w-full max-w-full rounded-md border border-border bg-background/70 px-2 font-code text-[10px] font-bold uppercase tracking-wider dark:border-white/10"
      >
        {PRESS_STAGES.map((item, index) => (
          <option key={item.id} value={item.id}>
            {index + 1}. {item.label}
          </option>
        ))}
      </select>
    </div>
  );
}
