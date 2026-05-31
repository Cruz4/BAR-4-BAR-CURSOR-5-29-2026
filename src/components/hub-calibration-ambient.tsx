'use client';

import React, { useMemo } from 'react';
import { cn } from '@/lib/utils';

export const HUB_INK_KEYS = [
  'structure',
  'vibe',
  'intents',
  'albumDna',
  'trackDna',
  'creativeDna',
  'specialInstructions',
  'remix',
  'dnaStrains',
  'style',
  'guardrails',
] as const;

export type HubInkKey = (typeof HUB_INK_KEYS)[number];

type InkBlob = { x: number; y: number; rgb: string };

const INK_BLOBS: Record<HubInkKey, InkBlob> = {
  structure: { x: 22, y: 38, rgb: '234,179,8' },
  vibe: { x: 18, y: 52, rgb: '245,158,11' },
  intents: { x: 22, y: 68, rgb: '56,189,248' },
  albumDna: { x: 44, y: 40, rgb: '52,211,153' },
  trackDna: { x: 56, y: 40, rgb: '34,197,94' },
  creativeDna: { x: 50, y: 52, rgb: '16,185,129' },
  specialInstructions: { x: 50, y: 62, rgb: '59,130,246' },
  remix: { x: 50, y: 74, rgb: '139,92,246' },
  dnaStrains: { x: 78, y: 38, rgb: '45,212,191' },
  style: { x: 82, y: 52, rgb: '217,70,239' },
  guardrails: { x: 78, y: 68, rgb: '244,63,94' },
};

/** Panel collapse keys — DNA toggles share the Creative DNA panel */
const PANEL_COLLAPSE_KEYS = [
  'structure',
  'vibe',
  'intents',
  'creativeDna',
  'specialInstructions',
  'remix',
  'dnaStrains',
  'style',
  'guardrails',
] as const;

type HubPanelCollapseKey = (typeof PANEL_COLLAPSE_KEYS)[number];

type HubCalibrationAmbientProps = {
  hubActive: Record<HubInkKey, boolean>;
  hubCollapsed: Record<HubPanelCollapseKey, boolean>;
  flashKey?: HubInkKey | null;
  className?: string;
};

function inkLayerBackground({ x, y, rgb }: InkBlob, active: boolean): string {
  const peak = active ? 0.18 : 0;
  const mid = active ? 0.08 : 0;
  return `radial-gradient(ellipse 32% 26% at ${x}% ${y}%, rgba(${rgb}, ${peak}) 0%, rgba(${rgb}, ${mid}) 40%, transparent 74%)`;
}

export function HubCalibrationAmbient({
  hubActive,
  hubCollapsed,
  flashKey = null,
  className,
}: HubCalibrationAmbientProps) {
  const { activeCount, collapsedRatio, fieldStrength, vignetteStrength, poolStrength } = useMemo(() => {
    const active = HUB_INK_KEYS.filter((k) => hubActive[k]).length;
    const collapsed = PANEL_COLLAPSE_KEYS.filter((k) => hubCollapsed[k]).length;
    const collapsedR = collapsed / PANEL_COLLAPSE_KEYS.length;
    const activeR = active / HUB_INK_KEYS.length;

    return {
      activeCount: active,
      collapsedRatio: collapsedR,
      fieldStrength: Math.min(0.78, 0.22 + collapsedR * 0.32 + activeR * 0.3),
      vignetteStrength: Math.max(0.35, 0.92 - collapsedR * 0.45),
      poolStrength: Math.min(0.55, collapsedR * 0.65 + activeR * 0.12),
    };
  }, [hubActive, hubCollapsed]);

  const flashBlob = flashKey ? INK_BLOBS[flashKey] : null;
  const showCenterPool = collapsedRatio >= 0.25 || activeCount > 0;

  return (
    <div
      className={cn(
        'pointer-events-none select-none overflow-hidden transition-opacity duration-700 ease-out',
        className
      )}
      style={{ opacity: fieldStrength }}
      aria-hidden
    >
      {showCenterPool && (
        <div
          className="absolute left-1/2 top-[58%] -translate-x-1/2 -translate-y-1/2 rounded-full transition-all duration-700 ease-out"
          style={{
            width: `${28 + collapsedRatio * 32}vmin`,
            height: `${18 + collapsedRatio * 22}vmin`,
            opacity: poolStrength,
            background:
              'radial-gradient(ellipse at center, rgba(88, 28, 135, 0.12) 0%, rgba(59, 130, 246, 0.07) 38%, rgba(16, 185, 129, 0.04) 58%, transparent 72%)',
          }}
        />
      )}

      {HUB_INK_KEYS.map((key) => (
        <div
          key={key}
          className="hub-ink-field absolute inset-0 transition-opacity duration-500 ease-out"
          style={{
            opacity: hubActive[key] ? 1 : 0,
            backgroundImage: inkLayerBackground(INK_BLOBS[key], hubActive[key]),
          }}
        />
      ))}

      {flashBlob && (
        <div
          key={flashKey}
          className="hub-ink-flash-burst absolute h-[32vmin] w-[32vmin] -translate-x-1/2 -translate-y-1/2 rounded-full"
          style={{
            left: `${flashBlob.x}%`,
            top: `${flashBlob.y}%`,
            background: `radial-gradient(circle, rgba(${flashBlob.rgb}, 0.35) 0%, rgba(${flashBlob.rgb}, 0.12) 42%, transparent 68%)`,
          }}
        />
      )}

      <div
        className="absolute inset-0 bg-gradient-to-b from-background/55 via-background/15 to-background/40 transition-opacity duration-700"
        style={{ opacity: vignetteStrength }}
      />
      <div
        className="absolute inset-0 bg-gradient-to-r from-background/25 via-transparent to-background/25 transition-opacity duration-700"
        style={{ opacity: vignetteStrength * 0.85 }}
      />
    </div>
  );
}
