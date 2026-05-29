
'use client';

import React from 'react';
import { PenLine } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StudioLoaderProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function StudioLoader({ className, size = 'md' }: StudioLoaderProps) {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-8 w-8',
    lg: 'h-12 w-12',
  };

  return (
    <div className={cn("relative flex flex-col items-center justify-center", className)}>
      <div className="relative">
        <PenLine className={cn("text-primary animate-writing", sizeClasses[size])} />
        <div className={cn(
          "absolute -bottom-1 left-0 w-full h-px bg-primary/20",
          size === 'sm' ? '-bottom-0.5' : '-bottom-1'
        )} />
      </div>
    </div>
  );
}
