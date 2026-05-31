import type { GamificationUnlock } from '@/lib/gamification/types';

export type AchievementDef = GamificationUnlock & {
  category: 'activation' | 'retention' | 'conversion';
  icon: string;
};

export const ACHIEVEMENTS: AchievementDef[] = [
  {
    id: 'first_paste',
    title: 'Structure Surgeon',
    description: 'Used Smart Structure to organize lyrics into bars.',
    inkReward: 25,
    category: 'activation',
    icon: 'paste',
  },
  {
    id: 'first_next_bar',
    title: 'Next Bar Graduate',
    description: 'Generated your first next-line suggestion.',
    inkReward: 25,
    category: 'activation',
    icon: 'sparkles',
  },
  {
    id: 'tour_graduate',
    title: 'Studio Tour Graduate',
    description: 'Completed the lyrics-page guided tour.',
    inkReward: 0,
    category: 'activation',
    icon: 'compass',
  },
  {
    id: 'rhyme_pulse_on',
    title: 'Rhyme Pulse Active',
    description: 'Turned on Rhyme Pulse highlighting.',
    inkReward: 0,
    category: 'activation',
    icon: 'waves',
  },
  {
    id: 'streak_3',
    title: '3-Day Streak',
    description: 'Wrote in the studio three days in a row.',
    inkReward: 25,
    category: 'retention',
    icon: 'flame',
  },
  {
    id: 'streak_7',
    title: '7-Day Streak',
    description: 'A full week of studio sessions.',
    inkReward: 50,
    category: 'retention',
    icon: 'flame',
  },
  {
    id: 'streak_30',
    title: '30-Day Streak',
    description: 'Thirty consecutive days in the booth.',
    inkReward: 50,
    category: 'retention',
    icon: 'flame',
  },
  {
    id: 'bars_16_session',
    title: '16-Bar Session',
    description: 'Wrote 16+ bars on one track in a session.',
    inkReward: 25,
    category: 'retention',
    icon: 'music',
  },
  {
    id: 'album_builder',
    title: 'Album Builder',
    description: 'Built an album with three or more tracks.',
    inkReward: 25,
    category: 'retention',
    icon: 'disc',
  },
  {
    id: 'track_complete',
    title: 'Track Locked',
    description: 'Marked a track complete.',
    inkReward: 25,
    category: 'retention',
    icon: 'check',
  },
  {
    id: 'vault_strain',
    title: 'Vault Strain',
    description: 'Saved a custom DNA strain to your vault.',
    inkReward: 0,
    proOnly: true,
    category: 'conversion',
    icon: 'dna',
  },
  {
    id: 'share_drop',
    title: 'DNA Drop Live',
    description: 'Published a shareable project link.',
    inkReward: 0,
    proOnly: true,
    category: 'conversion',
    icon: 'globe',
  },
  {
    id: 'second_album',
    title: 'Vault Expansion',
    description: 'Ready for unlimited albums — upgrade to Studio Pro.',
    inkReward: 0,
    category: 'conversion',
    icon: 'lock',
  },
];

export const ACHIEVEMENT_MAP = Object.fromEntries(ACHIEVEMENTS.map((a) => [a.id, a])) as Record<
  string,
  AchievementDef
>;

export function getAchievement(id: string): AchievementDef | undefined {
  return ACHIEVEMENT_MAP[id];
}
