'use client';

import React, { useEffect, useState } from 'react';
import { useTheme } from 'next-themes';
import { Monitor, Moon, Sun, NotebookPen, PanelTop } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { useWritingSurface } from '@/hooks/use-writing-surface';
import {
  WRITING_SURFACE_LABELS,
  type WritingSurfaceMode,
} from '@/lib/studio-theme';

type StudioThemeControlsProps = {
  variant?: 'icon' | 'panel';
  className?: string;
};

const THEME_OPTIONS = [
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon },
  { value: 'system', label: 'System', icon: Monitor },
] as const;

const SURFACE_OPTIONS: { value: WritingSurfaceMode; label: string; icon: typeof NotebookPen }[] = [
  { value: 'auto', label: 'Auto', icon: Monitor },
  { value: 'paper', label: 'Paper', icon: NotebookPen },
  { value: 'studio', label: 'Studio', icon: PanelTop },
];

function ThemeControlsBody({ compact = false }: { compact?: boolean }) {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const { mode, setMode } = useWritingSurface();

  return (
    <div className={cn('space-y-4', compact ? 'p-0' : 'p-1')}>
      <div className="space-y-2">
        <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
          App theme
        </Label>
        <div className="grid grid-cols-3 gap-1.5">
          {THEME_OPTIONS.map(({ value, label, icon: Icon }) => (
            <Button
              key={value}
              type="button"
              size="sm"
              variant={theme === value ? 'default' : 'outline'}
              className="h-9 px-2 text-[10px] font-bold uppercase gap-1.5"
              onClick={() => setTheme(value)}
            >
              <Icon className="h-3.5 w-3.5 shrink-0" />
              {label}
            </Button>
          ))}
        </div>
        <p className="text-[10px] text-muted-foreground leading-snug">
          {resolvedTheme === 'light'
            ? 'Light mode — easier to read outdoors and in glare.'
            : 'Readable dark — lifted surfaces and brighter secondary text.'}
        </p>
      </div>

      <div className="space-y-2">
        <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
          Lyrics writing surface
        </Label>
        <div className="grid grid-cols-3 gap-1.5">
          {SURFACE_OPTIONS.map(({ value, label, icon: Icon }) => (
            <Button
              key={value}
              type="button"
              size="sm"
              variant={mode === value ? 'default' : 'outline'}
              className="h-9 px-2 text-[10px] font-bold uppercase gap-1.5"
              onClick={() => setMode(value)}
            >
              <Icon className="h-3.5 w-3.5 shrink-0" />
              {label}
            </Button>
          ))}
        </div>
        <p className="text-[10px] text-muted-foreground leading-snug">
          {WRITING_SURFACE_LABELS[mode]}. Paper uses a cream sheet with dark text for the lyrics editor.
        </p>
      </div>
    </div>
  );
}

export function StudioThemeControls({ variant = 'icon', className }: StudioThemeControlsProps) {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (variant === 'panel') {
    return (
      <div className={className}>
        <ThemeControlsBody />
      </div>
    );
  }

  const ThemeIcon = !mounted || resolvedTheme === 'dark' ? Moon : Sun;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn('h-8 w-8 md:h-9 md:w-9 shrink-0', className)}
          aria-label="Appearance settings"
        >
          <ThemeIcon className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-4" align="end">
        <ThemeControlsBody compact />
      </PopoverContent>
    </Popover>
  );
}

export function StudioThemeSettingsCard() {
  return (
    <div className="rounded-xl border border-primary/20 bg-card/80 p-5 space-y-1">
      <p className="font-headline text-xl uppercase tracking-tight">Display &amp; readability</p>
      <p className="text-sm text-muted-foreground font-code pb-3">
        Switch light/dark for the whole app, or use paper mode on the lyrics sheet for outdoor writing.
      </p>
      <ThemeControlsBody />
    </div>
  );
}
