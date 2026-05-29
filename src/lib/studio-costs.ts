import { AI_COSTS } from '@/lib/costs';
import type { InkActionKey } from '@/lib/ink-labels';

export type StudioCosts = { [K in InkActionKey]: number };

/** Admin may tune within 2× of catalog defaults; stale/inflated values are ignored. */
export function mergeStudioCosts(remote?: Record<string, unknown> | null): StudioCosts {
  const merged = { ...AI_COSTS } as StudioCosts;
  if (!remote || typeof remote !== 'object') return merged;

  for (const key of Object.keys(AI_COSTS) as InkActionKey[]) {
    const value = remote[key];
    const defaultCost = AI_COSTS[key];
    if (typeof value === 'number' && Number.isFinite(value) && value >= 1 && value <= defaultCost * 2) {
      merged[key] = Math.round(value);
    }
  }
  return merged;
}

export function computeDraftInkCostFromRates(
  sectionTemplate: { bars: number; name?: string }[],
  sectionsToGenerate: string[],
  perBarCost: number
): number {
  const barCount = sectionTemplate
    .filter((s) => sectionsToGenerate.includes(s.name ?? ''))
    .reduce((acc, s) => acc + s.bars, 0);
  return Math.max(1, barCount * perBarCost);
}

export function computeRelayDraftInkCostFromRates(
  structure: { bars?: number }[] | undefined,
  perBarCost: number
): number {
  if (!structure?.length) return perBarCost;
  const barCount = structure.reduce((acc, s) => acc + (s.bars || 0), 0);
  return Math.max(1, barCount * perBarCost);
}

export function resolveFixedActionCost(actionName: string, costs: StudioCosts, fallback: number): number {
  const key = actionName as InkActionKey;
  if (key in costs) return costs[key];
  return fallback;
}
