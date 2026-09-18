'use client';

import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { VaultStatusBadgeRow } from '@/components/vault/vault-status-badge-row';
import type { Album, Track } from '@/lib/types';
/** Title row: section name + status badges (tight); count pill aligned on the right across sections. */
export function VaultSectionHeader({
  borderClass,
  title,
  subtitle,
  scope,
  looseTracks,
  albums,
  countLabel,
  className,
  dataTour,
}: {
  borderClass: string;
  title: ReactNode;
  subtitle: ReactNode;
  scope: 'loose' | 'albums';
  looseTracks: Track[];
  albums: Album[];
  countLabel: ReactNode;
  className?: string;
  dataTour?: string;
}) {
  return (
    <div data-tour={dataTour} className={cn('w-full border-l-4 pl-8 sm:pl-10', borderClass, className)}>
      <div className="flex w-full flex-wrap items-center gap-x-2 gap-y-2 sm:gap-x-3">
        <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 sm:gap-x-3">
          <div className="shrink-0">{title}</div>
          <VaultStatusBadgeRow
            scope={scope}
            looseTracks={looseTracks}
            albums={albums}
            className="ml-4 sm:ml-6 md:ml-10"
          />
        </div>
        <div className="ml-auto flex w-[3.25rem] shrink-0 justify-end translate-x-1 sm:translate-x-2">{countLabel}</div>
      </div>
      {subtitle ? <div className="mt-1">{subtitle}</div> : null}
    </div>
  );
}
