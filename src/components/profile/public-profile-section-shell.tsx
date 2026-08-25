'use client';

import React, { useMemo } from 'react';
import { LivingPressField } from '@/components/profile/living-press-field';
import { publicProfileView } from '@/lib/profile/public-profile-view';
import { pressTokens, pressingCssVars } from '@/lib/profile/pressing';
import { cn } from '@/lib/utils';

export function PublicProfileSectionShell({
  rawProfile,
  slug,
  children,
  className,
}: {
  rawProfile: unknown;
  slug: string;
  children: React.ReactNode;
  className?: string;
}) {
  const view = useMemo(() => publicProfileView(rawProfile, slug), [rawProfile, slug]);
  const tokens = useMemo(() => pressTokens(view.config.theme), [view.config.theme]);
  const cssVars = useMemo(() => pressingCssVars(tokens), [tokens]);

  return (
    <div
      className={cn('relative min-h-screen overflow-x-hidden bg-[var(--ph-bg)] text-[var(--ph-text)]', className)}
      style={cssVars as React.CSSProperties}
    >
      <LivingPressField config={view.config.theme} />
      <div className="relative z-10">{children}</div>
    </div>
  );
}
