import type { WizardGeneratedVariant } from '@/lib/types';

export type ApprovalDraftSnapshot = {
  id: string;
  savedAt: string;
  variant: WizardGeneratedVariant;
  rhymeGroups: { words: string[] }[];
  settingsSummary: string[];
  barCount: number;
};

export const MAX_APPROVAL_DRAFT_HISTORY = 8;

export function buildApprovalDraftSnapshot(
  variant: WizardGeneratedVariant,
  rhymeGroups: { words: string[] }[],
  settingsSummary: string[]
): ApprovalDraftSnapshot {
  const barCount = variant.sections.reduce((n, s) => n + s.bars.length, 0);
  return {
    id: `draft-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    savedAt: new Date().toISOString(),
    variant,
    rhymeGroups,
    settingsSummary,
    barCount,
  };
}

export function variantsMatch(
  a: WizardGeneratedVariant,
  b: WizardGeneratedVariant
): boolean {
  return JSON.stringify(a.sections) === JSON.stringify(b.sections);
}
