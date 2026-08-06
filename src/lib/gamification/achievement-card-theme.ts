import type { AchievementDef } from '@/lib/gamification/achievements';

export type AchievementCardTheme = {
  gradientFrom: string;
  gradientVia: string;
  gradientTo: string;
  accent: string;
  accentSoft: string;
  glow: string;
  foil: string;
  categoryLabel: string;
  watermark: string;
};

const CATEGORY_THEMES: Record<AchievementDef['category'], Omit<AchievementCardTheme, 'watermark'>> = {
  activation: {
    gradientFrom: '#0c4a6e',
    gradientVia: '#0c1a26',
    gradientTo: '#020617',
    accent: '#38bdf8',
    accentSoft: 'rgba(56, 189, 248, 0.15)',
    glow: 'rgba(56, 189, 248, 0.45)',
    foil: 'linear-gradient(135deg, rgba(56,189,248,0.55), rgba(14,165,233,0.15), rgba(250,204,21,0.25))',
    categoryLabel: 'Activation',
  },
  retention: {
    gradientFrom: '#78350f',
    gradientVia: '#1c1208',
    gradientTo: '#0a0705',
    accent: '#fbbf24',
    accentSoft: 'rgba(251, 191, 36, 0.14)',
    glow: 'rgba(251, 191, 36, 0.4)',
    foil: 'linear-gradient(135deg, rgba(251,191,36,0.55), rgba(249,115,22,0.2), rgba(244,63,94,0.2))',
    categoryLabel: 'Retention',
  },
  conversion: {
    gradientFrom: '#831843',
    gradientVia: '#1a0a14',
    gradientTo: '#050208',
    accent: '#f472b6',
    accentSoft: 'rgba(244, 114, 182, 0.14)',
    glow: 'rgba(244, 114, 182, 0.42)',
    foil: 'linear-gradient(135deg, rgba(244,114,182,0.55), rgba(168,85,247,0.25), rgba(56,189,248,0.15))',
    categoryLabel: 'Studio Pro',
  },
  mastery: {
    gradientFrom: '#312e81',
    gradientVia: '#120f2e',
    gradientTo: '#030208',
    accent: '#a78bfa',
    accentSoft: 'rgba(167, 139, 250, 0.16)',
    glow: 'rgba(167, 139, 250, 0.45)',
    foil: 'linear-gradient(135deg, rgba(167,139,250,0.55), rgba(99,102,241,0.25), rgba(251,191,36,0.2))',
    categoryLabel: 'Mastery',
  },
  social: {
    gradientFrom: '#064e3b',
    gradientVia: '#0a1f18',
    gradientTo: '#020807',
    accent: '#34d399',
    accentSoft: 'rgba(52, 211, 153, 0.15)',
    glow: 'rgba(52, 211, 153, 0.42)',
    foil: 'linear-gradient(135deg, rgba(52,211,153,0.55), rgba(16,185,129,0.2), rgba(56,189,248,0.2))',
    categoryLabel: 'Social',
  },
};

const ACHIEVEMENT_WATERMARKS: Record<string, string> = {
  first_paste: '▮▯▮',
  first_next_bar: '✦',
  tour_graduate: '◎',
  rhyme_pulse_on: '〜',
  streak_3: '▲▲▲',
  streak_7: '▲▲▲▲▲▲▲',
  streak_30: '▲×30',
  bars_16_session: '16',
  album_builder: '◉◉◉',
  track_complete: '✓',
  vault_strain: '⧬',
  share_drop: '↗',
  second_album: '+',
  ai_trinity: '△',
  flame_14: '◇◇',
  flame_60: '◆◆◆',
  session_veteran: '◷',
  night_shift: '☾',
  graveyard_shift: '☽',
  track_64_deep: '▤▤',
  track_100_deep: '▥▥▥',
  bars_1000: '1K',
  bars_2500: '2.5K',
  next_line_50: '50',
  next_line_200: '200',
  dna_import_first: '↘',
  dna_import_5: '5↘',
  dna_import_12: '12↘',
  circle_formed: '◎',
  inner_circle: '◉◉',
  block_captain: '▣',
  wall_signal: '⌁',
  wall_residency: '⌁⌁',
  drop_resonance: '⊚',
  drop_echo_chamber: '⊚⊚',
  triple_live: 'Ⅲ',
};

export function achievementCardBackgroundColor(theme: AchievementCardTheme): string {
  return theme.gradientTo;
}

export function getAchievementCardTheme(achievement?: AchievementDef | null): AchievementCardTheme {
  const base = achievement
    ? CATEGORY_THEMES[achievement.category]
    : {
        gradientFrom: '#1e3a8a',
        gradientVia: '#0c1a26',
        gradientTo: '#020617',
        accent: '#60a5fa',
        accentSoft: 'rgba(96, 165, 250, 0.14)',
        glow: 'rgba(96, 165, 250, 0.4)',
        foil: 'linear-gradient(135deg, rgba(96,165,250,0.5), rgba(56,189,248,0.2), rgba(167,139,250,0.2))',
        categoryLabel: 'Studio Stats',
      };

  return {
    ...base,
    watermark: achievement ? ACHIEVEMENT_WATERMARKS[achievement.id] || '♪' : '♪',
  };
}

/** Short ticket-style serial for the card footer. */
export function getAchievementSerial(achievementId: string, displayName: string): string {
  const slug = achievementId.replace(/_/g, '-').toUpperCase().slice(0, 12);
  const hash = displayName
    .split('')
    .reduce((acc, ch) => acc + ch.charCodeAt(0), 0)
    .toString(16)
    .toUpperCase()
    .slice(-4)
    .padStart(4, '0');
  return `B4B-${slug}-${hash}`;
}

export function formatUnlockDate(iso?: string): string {
  if (!iso) return 'Unlocked';
  try {
    return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(
      new Date(iso)
    );
  } catch {
    return 'Unlocked';
  }
}

export function pickFeaturedAchievementId(
  unlocked: Record<string, string>,
  preferredId?: string
): string | undefined {
  const ids = Object.keys(unlocked);
  if (!ids.length) return preferredId;
  if (preferredId && unlocked[preferredId]) return preferredId;
  return ids.sort((a, b) => unlocked[b].localeCompare(unlocked[a]))[0];
}
