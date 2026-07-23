'use client';

import React from 'react';
import { PenLine } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StudioLoaderProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  /** Optional status line under the pencil (e.g. guest try handoff). */
  message?: string;
}

export function StudioLoader({ className, size = 'md', message }: StudioLoaderProps) {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-8 w-8',
    lg: 'h-12 w-12',
  };

  return (
    <div className={cn('relative flex flex-col items-center justify-center gap-4', className)}>
      <div className="relative">
        <PenLine className={cn('text-primary animate-writing', sizeClasses[size])} />
        <div
          className={cn(
            'absolute -bottom-1 left-0 w-full h-px bg-primary/20',
            size === 'sm' ? '-bottom-0.5' : '-bottom-1'
          )}
        />
      </div>
      {message ? (
        <p className="max-w-[16rem] text-center text-[10px] sm:text-xs font-code font-bold uppercase tracking-[0.22em] text-muted-foreground animate-in fade-in duration-500">
          {message}
        </p>
      ) : null}
    </div>
  );
}
