import type { Direction, WizardAnalysis, WizardDirection, DnaPreset, StyleMetrics } from '@/lib/types';
import type { CoWriterSectionKey } from '@/lib/track-panel-state';

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

/** Co-Writer panel sections opened when a full DNA profile is loaded. */
export const COWRITER_SUITE_SECTION_KEYS: CoWriterSectionKey[] = [
  'dna',
  'vibe',
  'intents',
  'guardrails',
  'coWriter',
];

/** Which Co-Writer section to expand when a vault strain is injected. */
export function coWriterSectionForStrain(strainTitle: string): CoWriterSectionKey {
  const target = STRAIN_TARGETS[strainTitle];
  if (!target) return 'dna';
  if (target.kind === 'intents') return 'intents';
  if (target.kind === 'style_profile') return 'coWriter';
  return 'dna';
}

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
  vaultPresetsTab: 'Studio DNA suites — load full profiles or inject individual strains.',
  vaultVaultTab: 'Your saved album DNA profiles — full load or partial inject (Pro).',
  remixInfluence:
    'Relative weight among selected remix paths only — not vs Special Instructions or DNA.',
  saveDnaProfile:
    'Save the entire extraction — themes, motifs, arc, structure guide, Style DNA, and mapped Creative DNA — to your vault for any track. Use ⚡ on individual strain cards first if you only want parts in this remix session.',
  analysisStepIntro:
    'Analysis Step decodes your source text into strain cards. Save DNA Profile archives the full extraction; ⚡ injects one strain into the Calibration Hub (Creative DNA, Intents, Structure, or Style). Edit or type manually anytime in DNA Suite after you load or extract.',
  seedDnaRemix:
    'Paste lyrics, a poem, rough ideas, or inspiration — or turn on Sync Current Lyrics to pull from your sheet. Then run extraction to reach Analysis Step.',
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
  sourceKind?: 'album' | 'track';
}): DnaPreset {
  return {
    name: options.name.trim(),
    createdAt: new Date().toISOString(),
    sourceKind: options.sourceKind ?? 'track',
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
    sourceKind?: 'album' | 'track';
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
    sourceKind: options.sourceKind ?? 'track',
    sourceTrackTitle: options.sourceTrackTitle,
    analysis,
    mapping,
    intents,
    structure: options.hubStructure?.map((s) => ({ ...s })),
    ...(structureGuide ? { structureGuide } : {}),
    ...(styleAnalysis ? { styleAnalysis, styleMetrics: styleMetrics ?? DEFAULT_STYLE_METRICS } : {}),
  };
}

/** Classify vault DNA for album Load UI (legacy presets inferred from title). */
export function getDnaPresetSourceKind(preset: DnaPreset): 'album' | 'track' {
  if (preset.sourceKind === 'album' || preset.sourceKind === 'track') return preset.sourceKind;
  const src = (preset.sourceTrackTitle || '').trim().toLowerCase();
  if (!src || src === 'album extract' || src === 'album dna' || src.startsWith('album ')) {
    return 'album';
  }
  return 'track';
}

export function partitionDnaPresetsBySource(presets: DnaPreset[]): {
  album: Array<{ preset: DnaPreset; index: number }>;
  track: Array<{ preset: DnaPreset; index: number }>;
} {
  const album: Array<{ preset: DnaPreset; index: number }> = [];
  const track: Array<{ preset: DnaPreset; index: number }> = [];
  presets.forEach((preset, index) => {
    if (getDnaPresetSourceKind(preset) === 'album') album.push({ preset, index });
    else track.push({ preset, index });
  });
  return { album, track };
}

export type ArchiveProfileKind = 'DNA' | 'Vibe' | 'Style';

const ARCHIVE_PROFILE_LABEL: Record<ArchiveProfileKind, string> = {
  DNA: 'DNA Profile',
  Vibe: 'Vibe Profile',
  Style: 'Style Profile',
};

/** Default vault name when archiving from a track (e.g. "Night Shift — DNA Profile"). */
export function suggestArchiveProfileName(
  kind: ArchiveProfileKind,
  sourceTrackTitle?: string | null,
  options?: { label?: string | null }
): string {
  const base = sourceTrackTitle?.trim() || 'Studio';
  const label = options?.label?.trim() || ARCHIVE_PROFILE_LABEL[kind];
  return `${base} — ${label}`;
}

export type VaultStrainRow = { title: string; content: string | string[] };

const VAULT_STRAIN_ORDER = [
  'Themes',
  'Motifs',
  'Emotion',
  'Shift',
  'Arc',
  'Structure',
  'POV',
  'Tense',
  'Technical Fingerprint',
  'What Makes It Work',
  'Style',
] as const;

/** Individual extraction strains from analysis only (no saved hub duplicates). */
export function getVaultAnalysisStrains(analysis?: Partial<WizardAnalysis> | null): VaultStrainRow[] {
  if (!analysis) return [];

  const emotion = [analysis.emotionalTone?.primaryEmotion, analysis.emotionalTone?.secondaryEmotion]
    .filter(Boolean)
    .join(' / ');

  const rows: Array<{ title: string; content: string | string[] | null }> = [
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
  ];
  return rows.flatMap((s) => {
    if (!s.content || (Array.isArray(s.content) && s.content.length === 0)) return [];
    return [{ title: s.title, content: s.content }];
  });
}

/** Vault UI strains — merges saved intents/style once; never repeats structureGuide blob. */
export function getVaultPresetStrains(preset: DnaPreset): VaultStrainRow[] {
  const motifs = [
    ...new Set([...(preset.intents ?? []), ...(preset.analysis?.motifs ?? [])]),
  ].filter(Boolean);

  const styleText =
    preset.styleAnalysis?.trim() || preset.analysis?.styleAnalysis?.trim() || '';

  const byTitle = new Map<string, VaultStrainRow>(
    getVaultAnalysisStrains(preset.analysis).map((s) => [s.title, s])
  );

  if (motifs.length) {
    byTitle.set('Motifs', { title: 'Motifs', content: motifs });
  }

  const structure = preset.analysis?.structure?.trim();
  if (structure) {
    byTitle.set('Structure', { title: 'Structure', content: structure });
  } else {
    byTitle.delete('Structure');
  }

  if (styleText) {
    byTitle.set('Style', { title: 'Style', content: styleText });
  }

  return VAULT_STRAIN_ORDER.map((title) => byTitle.get(title)).filter(
    (s): s is VaultStrainRow => !!s?.content
  );
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

const FALLBACK_RELAY_PIVOTS: Array<{ name: string; description: string }> = [
  {
    name: 'POV Shift — The Observer',
    description: 'Witness the scene from outside the main voice — distance and detail replace immersion.',
  },
  {
    name: 'Tense Shift — Nostalgic Past',
    description: 'Retell the same DNA through memory — hindsight adds weight and regret.',
  },
  {
    name: 'Outcome Shift — The Epiphany',
    description: 'Keep the setup, change what the speaker realizes at the turn.',
  },
  {
    name: 'Imagery Palette — Gritty Realism',
    description: 'Double down on concrete sensory detail pulled from the extraction.',
  },
  {
    name: 'POV Shift — Second Person',
    description: 'Address the listener directly while keeping the core motifs intact.',
  },
  {
    name: 'Scale Shift — Intimate Close-Up',
    description: 'Zoom into one moment from the source and expand it bar by bar.',
  },
];

type RelayDirectionLike = {
  name?: string;
  description?: string;
  title?: string;
  desc?: string;
  summary?: string;
  pivot?: string;
};

/** Normalize API remix paths and synthesize theme-based fallbacks when the model omits directions. */
export function normalizeRelayDirections(
  directions: RelayDirectionLike[] | null | undefined,
  analysis?: Partial<WizardAnalysis> | null
): WizardDirection[] {
  const fromApi = (directions ?? [])
    .map((d) => ({
      name: String(d.name ?? d.title ?? d.pivot ?? '').trim(),
      description:
        String(d.description ?? d.desc ?? d.summary ?? '').trim() ||
        'A fresh creative pivot on your source material.',
    }))
    .filter((d) => d.name.length > 0);

  if (fromApi.length > 0) return fromApi;

  return buildFallbackRelayDirections(analysis);
}

export function buildFallbackRelayDirections(
  analysis?: Partial<WizardAnalysis> | null
): WizardDirection[] {
  const themes = (analysis?.themes ?? []).filter(Boolean).slice(0, 6);
  const themePivots = themes.map((theme) => ({
    name: `Theme Pivot — ${theme}`,
    description: `Reframe the source through "${theme}" — new imagery and angle, same DNA core.`,
  }));

  const emotion = [
    analysis?.emotionalTone?.primaryEmotion,
    analysis?.emotionalTone?.secondaryEmotion,
  ]
    .filter(Boolean)
    .join(' / ');
  const moodPivot = emotion
    ? [
        {
          name: `Mood Pivot — ${emotion}`,
          description: `Push the ${emotion} tone harder — amplify valence and intensity from the extraction.`,
        },
      ]
    : [];

  const combined = [...themePivots, ...moodPivot, ...FALLBACK_RELAY_PIVOTS];
  const seen = new Set<string>();
  const out: WizardDirection[] = [];
  for (const d of combined) {
    if (seen.has(d.name)) continue;
    seen.add(d.name);
    out.push(d);
    if (out.length >= 12) break;
  }
  return out.length >= 3 ? out : [...FALLBACK_RELAY_PIVOTS];
}

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
