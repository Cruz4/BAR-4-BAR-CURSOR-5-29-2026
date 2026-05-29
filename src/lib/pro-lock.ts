import { cn } from '@/lib/utils';

/** Hot-pink Pro lock design tokens — unified, subtle slow pulse (no ring stroke) */
export const PRO_LOCK = {
  color: 'text-pink-500',
  colorMuted: 'text-pink-500/90',
  border: 'border-pink-500/45',
  bg: 'bg-pink-600/[0.12]',
  glow: 'shadow-[0_0_14px_rgba(236,72,153,0.28)]',
  glowSm: 'shadow-[0_0_10px_rgba(236,72,153,0.22)]',
  pulse: 'pro-lock-surface',
  iconPulse: 'pro-lock-icon',
} as const;

/** Unified shell — same family, restrained glow */
export function proLockShell(size: 'sm' | 'md' | 'lg' = 'md') {
  return cn(
    PRO_LOCK.bg,
    PRO_LOCK.border,
    size === 'lg' ? PRO_LOCK.glow : PRO_LOCK.glowSm,
    PRO_LOCK.pulse,
    'border'
  );
}

export function proLockIcon(className?: string) {
  return cn(PRO_LOCK.color, PRO_LOCK.iconPulse, className);
}

export function proLockText(className?: string) {
  return cn(PRO_LOCK.color, 'font-bold uppercase tracking-widest', className);
}

/** Mark the bar at `targetIdx` with hot-pink flash (e.g. newly inserted line). */
export function markBarAnchorGlow<T extends { id: string; bars: { idx: number; justGenerated?: boolean }[] }>(
  sections: T[],
  sectionId: string,
  anchorIdx: number
): T[] {
  return sections.map((s) =>
    s.id !== sectionId
      ? s
      : {
          ...s,
          bars: s.bars.map((b) => ({
            ...b,
            justGenerated: b.idx === anchorIdx,
          })),
        }
  );
}
