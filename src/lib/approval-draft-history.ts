import type { DraftChestSource, WizardGeneratedVariant } from '@/lib/types';

export type ApprovalDraftSnapshot = {
  id: string;
  savedAt: string;
  variant: WizardGeneratedVariant;
  rhymeGroups: { words: string[] }[];
  settingsSummary: string[];
  barCount: number;
  source?: DraftChestSource;
};

export const MAX_APPROVAL_DRAFT_HISTORY = 8;

export function buildApprovalDraftSnapshot(
  variant: WizardGeneratedVariant,
  rhymeGroups: { words: string[] }[],
  settingsSummary: string[],
  source: DraftChestSource = 'full-draft'
): ApprovalDraftSnapshot {
  const barCount = variant.sections.reduce((n, s) => n + s.bars.length, 0);
  return {
    id: `draft-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    savedAt: new Date().toISOString(),
    variant,
    rhymeGroups,
    settingsSummary,
    barCount,
    source,
  };
}

export function variantsMatch(
  a: WizardGeneratedVariant,
  b: WizardGeneratedVariant
): boolean {
  return JSON.stringify(a.sections) === JSON.stringify(b.sections);
}

export function buildPersistedApprovalBacklog(
  history: ApprovalDraftSnapshot[],
  current: WizardGeneratedVariant | null,
  rhymeGroups: { words: string[] }[],
  settingsSummary: string[],
  source: DraftChestSource
): ApprovalDraftSnapshot[] {
  const list = [...history];
  if (current && !list.some((h) => variantsMatch(h.variant, current))) {
    list.unshift(buildApprovalDraftSnapshot(current, rhymeGroups, settingsSummary, source));
  }
  return list.slice(0, MAX_APPROVAL_DRAFT_HISTORY);
}

/** Snapshots that were not applied to the sheet — for auto-stash in Draft Chest. */
export function collectUnusedApprovalSnapshots(
  history: ApprovalDraftSnapshot[],
  currentSnapshot: ApprovalDraftSnapshot | null,
  usedVariant?: WizardGeneratedVariant | null
): ApprovalDraftSnapshot[] {
  const candidates = [...history];
  if (
    currentSnapshot &&
    !candidates.some((h) => variantsMatch(h.variant, currentSnapshot.variant))
  ) {
    candidates.push(currentSnapshot);
  }

  const seen = new Set<string>();
  return candidates.filter((snap) => {
    if (usedVariant && variantsMatch(snap.variant, usedVariant)) return false;
    const key = JSON.stringify(snap.variant.sections);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
