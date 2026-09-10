'use client';

import React, { useLayoutEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { IMPRINT_EXPORT_WIDTH_PX } from '@/lib/profile/imprint-capture';
import type { ModuleSize } from '@/lib/profile/modules';

/** Module deck size — L is 1:1 original (576px); S is the smallest. */
export type ImprintShelfDensity = ModuleSize;

/**
 * Rendered card width per tier (proportional scale, never reflow).
 * S = compact shelf tier (605px — 20% larger than the prior 504px S).
 * M = midpoint between S and L. L = full export width.
 */
export const IMPRINT_SHELF_TARGET_WIDTH: Record<ImprintShelfDensity, number> = {
  S: 605,
  M: 540,
  L: IMPRINT_EXPORT_WIDTH_PX,
};

function scaleForDensity(
  containerW: number,
  density: ImprintShelfDensity,
  referenceWidth: number
): number {
  if (containerW <= 0 || referenceWidth <= 0) return 1;
  const target = IMPRINT_SHELF_TARGET_WIDTH[density];
  const effectiveWidth = Math.min(target, containerW);
  return effectiveWidth / referenceWidth;
}

/** Keeps an imprint card pixel-identical — scales the whole card down instead of reflowing text. */
export function ImprintScaleFit({
  children,
  className,
  density = 'L',
  referenceWidth = IMPRINT_EXPORT_WIDTH_PX,
}: {
  children: React.ReactNode;
  className?: string;
  density?: ImprintShelfDensity;
  referenceWidth?: number;
}) {
  const measureRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const [layout, setLayout] = useState({ scale: 1, width: 0, height: 0 });

  useLayoutEffect(() => {
    const measure = measureRef.current;
    const inner = innerRef.current;
    if (!measure || !inner) return;

    const applyMeasure = () => {
      const containerW = measure.clientWidth;
      const scale = scaleForDensity(containerW, density, referenceWidth);
      const naturalH = inner.offsetHeight;
      const width = referenceWidth * scale;
      const height = naturalH * scale;
      setLayout((prev) =>
        Math.abs(prev.scale - scale) < 0.001 &&
        Math.abs(prev.width - width) < 0.5 &&
        Math.abs(prev.height - height) < 0.5
          ? prev
          : { scale, width, height }
      );
    };

    applyMeasure();
    const observer = new ResizeObserver(() => applyMeasure());
    observer.observe(measure);
    void document.fonts.ready.then(applyMeasure);
    return () => observer.disconnect();
  }, [density, referenceWidth]);

  const usesTransform = Math.abs(layout.scale - 1) > 0.001;
  const centerCard = usesTransform || density === 'L';

  return (
    <div ref={measureRef} className={cn('w-full', className)}>
      <div
        className={cn(centerCard && 'mx-auto')}
        style={{
          width: layout.width > 0 ? layout.width : undefined,
          maxWidth: '100%',
          height: layout.height > 0 ? layout.height : undefined,
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div
          ref={innerRef}
          style={{
            width: referenceWidth,
            transform: usesTransform ? `scale(${layout.scale})` : undefined,
            transformOrigin: 'top left',
            position: usesTransform ? 'absolute' : 'relative',
            top: 0,
            left: 0,
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
