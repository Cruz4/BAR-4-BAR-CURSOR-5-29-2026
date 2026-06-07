import type { DraftChestEntry, DraftChestSource, TrackSection, WizardGeneratedVariant } from '@/lib/types';
import type { ApprovalDraftSnapshot } from '@/lib/approval-draft-history';
import { variantsMatch } from '@/lib/approval-draft-history';
import { withLineSource } from '@/lib/gamification/line-attribution';

export const MAX_DRAFT_CHEST_ENTRIES = 48;

export function createChestEntryId(): string {
  return `chest-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function sectionsToChestEntry(
  sections: TrackSection[],
  label: string,
  source: DraftChestEntry['source'] = 'full-draft'
): DraftChestEntry {
  const lineCount = sections.reduce((n, s) => n + s.bars.length, 0);
  return {
    id: createChestEntryId(),
    kind: 'sheet',
    sections: cloneSections(sections),
    source,
    label,
    savedAt: new Date().toISOString(),
    meta: { lineCount },
  };
}

export function variantToTrackSections(variant: WizardGeneratedVariant): TrackSection[] {
  const stamp = Date.now();
  return variant.sections.map((s, i) => ({
    id: `chest-${stamp}-${i}`,
    type: normalizeSectionType(s.name),
    bars: s.bars.map((line, j) =>
      withLineSource(
        {
          idx: j + 1,
          text: line.trim(),
          accepted: true,
          rhymeKey: '?',
          syllables: line.trim().split(/\s+/).filter(Boolean).length,
        },
        'generated'
      )
    ),
  }));
}

function normalizeSectionType(name: string): TrackSection['type'] {
  const key = name.trim().toLowerCase();
  const allowed: TrackSection['type'][] = ['verse', 'hook', 'bridge', 'intro', 'outro', 'pre', 'chorus'];
  if (allowed.includes(key as TrackSection['type'])) return key as TrackSection['type'];
  if (key.includes('hook') || key.includes('chorus')) return 'hook';
  if (key.includes('bridge')) return 'bridge';
  if (key.includes('intro')) return 'intro';
  if (key.includes('outro')) return 'outro';
  return 'verse';
}

function cloneSections(sections: TrackSection[]): TrackSection[] {
  return JSON.parse(JSON.stringify(sections)) as TrackSection[];
}

function sectionsFingerprint(sections: TrackSection[]): string {
  return JSON.stringify(
    sections.map((s) => ({
      type: s.type,
      bars: s.bars.map((b) => b.text.trim()),
    }))
  );
}

export function snapshotToChestEntry(snap: ApprovalDraftSnapshot): DraftChestEntry {
  const sections = variantToTrackSections(snap.variant);
  const source: DraftChestSource =
    snap.source ??
    (snap.settingsSummary.some((s) => s.toLowerCase().includes('remix')) ? 'remix' : 'full-draft');
  const label =
    snap.variant.title?.trim() ||
    (source === 'remix' ? 'DNA remix draft' : 'Studio draft');
  return {
    id: createChestEntryId(),
    kind: 'sheet',
    sections,
    source,
    label,
    savedAt: snap.savedAt,
    meta: { lineCount: snap.barCount },
  };
}

export function snapshotsToChestEntries(snapshots: ApprovalDraftSnapshot[]): DraftChestEntry[] {
  return snapshots.map(snapshotToChestEntry);
}

export function chestContainsWizardVariant(
  entries: DraftChestEntry[] | undefined,
  variant: WizardGeneratedVariant
): boolean {
  return sheetDraftEntries(entries).some((e) => {
    const asVariant: WizardGeneratedVariant = {
      title: e.label,
      sections: e.sections.map((s) => ({
        name: s.type,
        bars: s.bars.map((b) => b.text),
      })),
    };
    return variantsMatch(asVariant, variant);
  });
}

export function mergeChestEntries(
  existing: DraftChestEntry[] | undefined,
  incoming: DraftChestEntry[]
): DraftChestEntry[] {
  if (!incoming.length) return existing ?? [];
  const base = sheetDraftEntries(existing);
  const seen = new Set(base.map((e) => sectionsFingerprint(e.sections)));
  const novel = incoming.filter((e) => {
    const fp = sectionsFingerprint(e.sections);
    if (seen.has(fp)) return false;
    seen.add(fp);
    return true;
  });
  if (!novel.length) return existing ?? [];
  return [...novel, ...base].slice(0, MAX_DRAFT_CHEST_ENTRIES);
}

export function appendSectionsToSheet(existing: TrackSection[], incoming: TrackSection[]): TrackSection[] {
  const stamp = Date.now();
  const normalized = incoming.map((s, i) => ({
    ...s,
    id: `chest-${stamp}-${i}`,
    bars: s.bars.map((b, j) => ({ ...b, idx: j + 1 })),
  }));
  return [...existing, ...normalized];
}

export function replaceSheetWithSections(incoming: TrackSection[]): TrackSection[] {
  const stamp = Date.now();
  return incoming.map((s, i) => ({
    ...s,
    id: `chest-${stamp}-${i}`,
    bars: s.bars.map((b, j) => ({ ...b, idx: j + 1 })),
  }));
}

/** Only full sheet drafts belong in the chest — filters legacy line entries. */
export function sheetDraftEntries(entries: DraftChestEntry[] | undefined): DraftChestEntry[] {
  return (entries ?? []).filter((e) => e.kind === 'sheet' && e.sections?.length);
}
