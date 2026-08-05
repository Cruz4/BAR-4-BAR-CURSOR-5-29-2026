'use client';

import React, { useMemo } from 'react';
import { renderVesperfoldSvg, unpackVesperfold } from '@/lib/profile/vesperfold';
import { cn } from '@/lib/utils';

type VesperfoldMarkProps = {
  seed: number;
  size?: number;
  className?: string;
  title?: string;
};

/** Renders a Vesperfold generative star from a seed. */
export function VesperfoldMark({ seed, size = 96, className, title }: VesperfoldMarkProps) {
  const stack = useMemo(() => unpackVesperfold(seed), [seed]);
  const svg = useMemo(() => renderVesperfoldSvg(seed, size), [seed, size]);
  return (
    <span
      className={cn('inline-flex shrink-0 overflow-hidden', className)}
      style={{ width: size, height: size }}
      title={title || stack.label}
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
