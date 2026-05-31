import type { Direction, WizardAnalysis, WizardDirection, DnaPreset, StyleMetrics } from '@/lib/types';

export type StrainInjectionTarget =
  | { kind: 'direction'; field: CreativeDirectionField; label?: string }
  | { kind: 'intents' }
  | { kind: 'structure_guide' }
  | { kind: 'style_profile' };

type CreativeDirectionField =
  | 'setting_world'
  | 'emotion_core'
  | 'trigger_moment'
  | 'message_truth'
  | 'tone_palette';

/** Maps Analysis Step / Hub strain card titles to injection targets. */
const DIRECTION_FIELD_LABELS: Record<CreativeDirectionField, string> = {
  setting_world: 'Setting / World',
  emotion_core: 'Emotion / Core',
  trigger_moment: 'Trigger Moment',
  message_truth: 'Message / Truth',
  tone_palette: 'Tone / Palette',
};

export const STRAIN_TARGETS: Record<string, StrainInjectionTarget> = {
  Themes: { kind: 'direction', field: 'setting_world', label: 'Themes' },
  Emotion: { kind: 'direction', field: 'emotion_core' },
  Shift: { kind: 'direction', field: 'trigger_moment', label: 'Shift' },
  Arc: { kind: 'direction', field: 'message_truth', label: 'Arc' },
  POV: { kind: 'direction', field: 'tone_palette', label: 'POV' },
  Tense: { kind: 'direction', field: 'tone_palette', label: 'Tense' },
  Structure: { kind: 'structure_guide' },
  'Technical Fingerprint': { kind: 'direction', field: 'tone_palette', label: 'Voice' },
  'What Makes It Work': { kind: 'direction', field: 'message_truth', label: 'Magic' },
  Motifs: { kind: 'intents' },
  Style: { kind: 'style_profile' },
};

/** Hover text for ⚡ inject buttons on analysis strain cards. */
export function getStrainInjectTooltip(strainTitle: string): string {
  const target = STRAIN_TARGETS[strainTitle];
  if (!target) return 'Append this strain into the Calibration Hub';
  if (target.kind === 'intents') {
    return 'Add motifs to Intents — AI weaves them into lyrics and punchlines';
  }
  if (target.kind === 'structure_guide') {
    return 'Append to Structure guide in the Calibration Hub';
  }
  if (target.kind === 'style_profile') {
    return 'Replace Style DNA profile in the Calibration Hub';
  }
  const dest = DIRECTION_FIELD_LABELS[target.field];
  const tagged = target.label ? `[${target.label}]` : strainTitle;
  return `Append ${tagged} to ${dest} in Creative DNA (won't overwrite existing text)`;
}

/** Shared Calibration Hub UI tooltips. */
export const DNA_HUB_TOOLTIPS = {
  sectionCollapse:
    'Sections start minimized. They auto-expand when you inject strains, load a vault preset, or add remix paths.',
  destinationPill: 'Color matches the hub section — use ⚡ to send this strain there.',
  vaultFullLoad:
    'Load entire saved profile — Creative DNA, motifs, structure guide, Style DNA, and extraction archive.',
  vaultDelete: 'Delete this saved DNA profile from your album vault.',
  vaultInsightsTab: 'Current extraction from your latest analyze step.',
  vaultVaultTab: 'Saved album DNA profiles — full load or partial inject.',
  remixInfluence:
    'Relative weight among selected remix paths only — not vs Special Instructions or DNA.',
  saveDnaProfile:
    'Archive full extraction, hub mapping, structure guide, motifs, and Style DNA for reuse on any track.',
  reMatrixIdeas: 'Regenerate remix path options without re-analyzing source lyrics.',
  inheritAlbum: 'Pull album-level Creative DNA into this synthesis when enabled.',
  inheritTrack: "Pull this track's saved DNA fields into the hub when enabled.",
  structureGuideClear: 'Clear extracted structure guide text (does not remove your section list).',
  approvalAppend: 'Append generated sections to your current sheet without deleting existing lyrics.',
  approvalReplace: 'Replace all lyrics on the sheet with the generated draft.',
} as const;

/** Soft UI tint matching where a strain lands in the Calibration Hub. */
export type StrainDestinationTheme = {
  cardBg: string;
  cardBorder: string;
  cardHover: string;
  icon: string;
  title: string;
  pill: string;
  badgeBorder: string;
  badgeText: string;
  badgeBg: string;
  inject: string;
  injectHover: string;
  divider: string;
  hubSection: string;
  hubField?: string;
};

const HUB_THEMES = {
  dna: {
    cardBg: 'bg-green-500/[0.06]',
    cardBorder: 'border-green-500/20',
    cardHover: 'hover:bg-green-500/[0.1]',
    icon: 'text-green-500',
    title: 'text-green-600',
    pill: 'text-green-500/80',
    badgeBorder: 'border-green-500/25',
    badgeText: 'text-green-400',
    badgeBg: 'bg-green-500/[0.04]',
    inject: 'text-green-500',
    injectHover: 'hover:bg-green-500/15',
    divider: 'divide-green-500/10',
    hubSection: 'Creative DNA',
  },
  structure: {
    cardBg: 'bg-yellow-500/[0.06]',
    cardBorder: 'border-yellow-500/20',
    cardHover: 'hover:bg-yellow-500/[0.1]',
    icon: 'text-yellow-500',
    title: 'text-yellow-600',
    pill: 'text-yellow-500/80',
    badgeBorder: 'border-yellow-500/25',
    badgeText: 'text-yellow-500',
    badgeBg: 'bg-yellow-500/[0.04]',
    inject: 'text-yellow-500',
    injectHover: 'hover:bg-yellow-500/15',
    divider: 'divide-yellow-500/10',
    hubSection: 'Structure',
  },
  intents: {
    cardBg: 'bg-sky-500/[0.06]',
    cardBorder: 'border-sky-500/20',
    cardHover: 'hover:bg-sky-500/[0.1]',
    icon: 'text-sky-500',
    title: 'text-sky-500',
    pill: 'text-sky-500/80',
    badgeBorder: 'border-sky-500/25',
    badgeText: 'text-sky-400',
    badgeBg: 'bg-sky-500/[0.04]',
    inject: 'text-sky-500',
    injectHover: 'hover:bg-sky-500/15',
    divider: 'divide-sky-500/10',
    hubSection: 'Intents',
  },
  style: {
    cardBg: 'bg-fuchsia-500/[0.06]',
    cardBorder: 'border-fuchsia-500/20',
    cardHover: 'hover:bg-fuchsia-500/[0.1]',
    icon: 'text-fuchsia-500',
    title: 'text-fuchsia-500',
    pill: 'text-fuchsia-500/80',
    badgeBorder: 'border-fuchsia-500/25',
    badgeText: 'text-fuchsia-400',
    badgeBg: 'bg-fuchsia-500/[0.04]',
    inject: 'text-fuchsia-500',
    injectHover: 'hover:bg-fuchsia-500/15',
    divider: 'divide-fuchsia-500/10',
    hubSection: 'Style DNA',
  },
} satisfies Record<string, Omit<StrainDestinationTheme, 'hubField'>>;

export function getStrainDestinationTheme(strainTitle: string): StrainDestinationTheme {
  const target = STRAIN_TARGETS[strainTitle];
  if (!target) return { ...HUB_THEMES.dna };

  if (target.kind === 'intents') {
    return { ...HUB_THEMES.intents };
  }
  if (target.kind === 'structure_guide') {
    return { ...HUB_THEMES.structure };
  }
  if (target.kind === 'style_profile') {
    return { ...HUB_THEMES.style };
  }

  return {
    ...HUB_THEMES.dna,
    hubField: DIRECTION_FIELD_LABELS[target.field],
  };
}

/** Hover text for ⚡ partial-load buttons in the DNA Vault. */
export function getVaultFieldInjectTooltip(fieldKey: keyof Direction): string {
  const labels: Record<keyof Direction, string> = {
    ...DIRECTION_FIELD_LABELS,
    enabled: 'DNA toggle',
    inheritFromAlbum: 'Inherit album DNA',
    updatedAt: 'Updated',
  };
  return `Load saved value into ${labels[fieldKey] ?? fieldKey} — replaces current field text`;
}

export function appendDirectionField(
  prev: Partial<Direction>,
  field: keyof Direction,
  label: string | undefined,
  value: string
): Partial<Direction> {
  const trimmed = value.trim();
  if (!trimmed) return prev;

  const existing = String(prev[field] ?? '').trim();
  const tagged = label ? `[${label}] ${trimmed}` : trimmed;

  if (!existing) return { ...prev, [field]: tagged };
  if (existing.includes(tagged) || existing.includes(trimmed)) return prev;
  return { ...prev, [field]: `${existing}\n${tagged}` };
}

export function buildDirectionMappingFromAnalysis(
  analysis: WizardAnalysis,
  existing: Partial<Direction> = {}
): Partial<Direction> {
  let mapping = { ...existing };

  if (analysis.themes?.length) {
    mapping = appendDirectionField(
      mapping,
      'setting_world',
      'Setting/Themes',
      analysis.themes.join(', ')
    );
  }

  const emotion = [analysis.emotionalTone?.primaryEmotion, analysis.emotionalTone?.secondaryEmotion]
    .filter(Boolean)
    .join(' / ');
  if (emotion) {
    mapping = appendDirectionField(mapping, 'emotion_core', undefined, emotion);
  }

  if (analysis.emotionalShift?.trim()) {
    mapping = appendDirectionField(mapping, 'trigger_moment', 'Shift', analysis.emotionalShift);
  }

  if (analysis.whatMakesItWork?.trim()) {
    mapping = appendDirectionField(mapping, 'message_truth', 'Magic', analysis.whatMakesItWork);
  } else if (analysis.themes?.length) {
    mapping = appendDirectionField(
      mapping,
      'message_truth',
      'Themes',
      analysis.themes.join(', ')
    );
  }

  if (analysis.narrativeArc?.trim()) {
    mapping = appendDirectionField(mapping, 'message_truth', 'Arc', analysis.narrativeArc);
  }

  if (analysis.pov?.trim()) {
    mapping = appendDirectionField(mapping, 'tone_palette', 'POV', analysis.pov);
  }

  if (analysis.tense?.trim()) {
    mapping = appendDirectionField(mapping, 'tone_palette', 'Tense', analysis.tense);
  }

  if (analysis.voiceStyle?.trim()) {
    mapping = appendDirectionField(mapping, 'tone_palette', 'Voice', analysis.voiceStyle);
  }

  return mapping;
}

export function emptyWizardAnalysis(): WizardAnalysis {
  return {
    themes: [],
    motifs: [],
    emotionalTone: {
      primaryEmotion: '',
      secondaryEmotion: '',
      valence: 50,
      intensity: 50,
    },
    emotionalShift: '',
    narrativeArc: '',
    structure: '',
    pov: '',
    tense: '',
    voiceStyle: '',
    whatMakesItWork: '',
    styleAnalysis: '',
    styleMetrics: { vocabularyScore: 50, rhymeComplexity: 50, cadenceMap: 'Neutral' },
  };
}

export const DEFAULT_STYLE_METRICS: StyleMetrics = {
  vocabularyScore: 50,
  rhymeComplexity: 50,
  cadenceMap: 'Neutral',
};

export function normalizeWizardAnalysis(
  analysis?: Partial<WizardAnalysis> | null
): WizardAnalysis {
  const base = emptyWizardAnalysis();
  if (!analysis) return base;
  return {
    ...base,
    ...analysis,
    themes: analysis.themes ?? base.themes,
    motifs: analysis.motifs ?? base.motifs,
    emotionalTone: { ...base.emotionalTone, ...analysis.emotionalTone },
    styleMetrics: { ...base.styleMetrics!, ...analysis.styleMetrics },
  };
}

/** Save current track direction (no extraction archive) into the vault. */
export function buildDnaPresetFromDirection(options: {
  name: string;
  sourceTrackTitle: string;
  direction: Partial<Direction>;
  intents?: string[];
}): DnaPreset {
  return {
    name: options.name.trim(),
    createdAt: new Date().toISOString(),
    sourceTrackTitle: options.sourceTrackTitle,
    analysis: emptyWizardAnalysis(),
    mapping: JSON.parse(JSON.stringify({ enabled: true, ...options.direction })) as Direction,
    ...(options.intents?.length ? { intents: [...options.intents] } : {}),
  };
}

export function buildDnaPresetPayload(
  analysis: WizardAnalysis,
  options: {
    hubDirection?: Partial<Direction>;
    hubIntents?: string[];
    hubStructure?: Array<{ name: string; bars: number; enabled: boolean }>;
    hubStructureGuide?: string;
    hubStyleAnalysis?: string;
    hubStyleMetrics?: StyleMetrics;
    name: string;
    sourceTrackTitle: string;
  }
): DnaPreset {
  const mapping = buildDirectionMappingFromAnalysis(
    analysis,
    JSON.parse(JSON.stringify(options.hubDirection ?? { enabled: true }))
  ) as Direction;

  const intents = [...new Set([...(options.hubIntents ?? []), ...(analysis.motifs ?? [])])];

  let structureGuide = options.hubStructureGuide?.trim() ?? '';
  if (analysis.structure?.trim()) {
    const tagged = `[Structure] ${analysis.structure.trim()}`;
    if (!structureGuide.includes(analysis.structure.trim())) {
      structureGuide = structureGuide ? `${structureGuide}\n${tagged}` : tagged;
    }
  }

  const styleAnalysis =
    options.hubStyleAnalysis?.trim() || analysis.styleAnalysis?.trim() || '';
  const styleMetrics = options.hubStyleMetrics ?? analysis.styleMetrics;

  return {
    name: options.name.trim(),
    createdAt: new Date().toISOString(),
    sourceTrackTitle: options.sourceTrackTitle,
    analysis,
    mapping,
    intents,
    structure: options.hubStructure?.map((s) => ({ ...s })),
    ...(structureGuide ? { structureGuide } : {}),
    ...(styleAnalysis ? { styleAnalysis, styleMetrics: styleMetrics ?? DEFAULT_STYLE_METRICS } : {}),
  };
}

/** Individual extraction strains for vault display (full fidelity archive). */
export function getVaultAnalysisStrains(analysis?: Partial<WizardAnalysis> | null) {
  if (!analysis) return [];

  const emotion = [analysis.emotionalTone?.primaryEmotion, analysis.emotionalTone?.secondaryEmotion]
    .filter(Boolean)
    .join(' / ');

  return [
    { title: 'Themes', content: analysis.themes?.length ? analysis.themes : null },
    { title: 'Motifs', content: analysis.motifs?.length ? analysis.motifs : null },
    { title: 'Emotion', content: emotion || null },
    { title: 'Shift', content: analysis.emotionalShift?.trim() || null },
    { title: 'Arc', content: analysis.narrativeArc?.trim() || null },
    { title: 'Structure', content: analysis.structure?.trim() || null },
    { title: 'POV', content: analysis.pov?.trim() || null },
    { title: 'Tense', content: analysis.tense?.trim() || null },
    { title: 'Technical Fingerprint', content: analysis.voiceStyle?.trim() || null },
    { title: 'What Makes It Work', content: analysis.whatMakesItWork?.trim() || null },
    { title: 'Style', content: analysis.styleAnalysis?.trim() || null },
  ].filter((s) => s.content && (!(Array.isArray(s.content)) || s.content.length > 0));
}

export const MAPPING_FIELD_LABELS: Record<keyof Direction, string> = {
  ...DIRECTION_FIELD_LABELS,
  enabled: 'Enabled',
  inheritFromAlbum: 'Inherit Album',
  updatedAt: 'Updated',
};

export const CREATIVE_DNA_FIELDS: Array<{ key: keyof Direction; label: string }> = [
  { key: 'setting_world', label: 'Setting / World' },
  { key: 'emotion_core', label: 'Emotion / Core' },
  { key: 'trigger_moment', label: 'Trigger Moment' },
  { key: 'message_truth', label: 'Message / Truth' },
  { key: 'tone_palette', label: 'Tone / Palette' },
];

export function rebalanceRemixWeights(directions: WizardDirection[]): WizardDirection[] {
  if (directions.length === 0) return directions;
  const each = Math.floor(100 / directions.length);
  const remainder = 100 - each * directions.length;
  return directions.map((d, i) => ({
    ...d,
    weight: each + (i === 0 ? remainder : 0),
  }));
}

export function formatRemixDirectionsWithWeights(directions: WizardDirection[]): string {
  if (directions.length === 0) {
    return 'No remix paths selected — follow Calibration Hub rules only.';
  }

  const lines = directions.map((d) => {
    const weight = d.weight ?? Math.floor(100 / directions.length);
    return `- ${d.name} (${weight}% influence): ${d.description}`;
  });

  return [
    'Blend these remix pivots by their influence percentages (relative to each other):',
    ...lines,
  ].join('\n');
}
