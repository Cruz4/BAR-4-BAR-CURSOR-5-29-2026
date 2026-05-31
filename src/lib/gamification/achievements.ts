import type { GamificationUnlock } from '@/lib/gamification/types';

export type AchievementDef = GamificationUnlock & {
  category: 'activation' | 'retention' | 'conversion';
  icon: string;
  /** Short hint for how to unlock in the app */
  howTo: string;
};

export const ACHIEVEMENTS: AchievementDef[] = [
  {
    id: 'first_paste',
    title: 'Structure Surgeon',
    description: 'Used Smart Structure to organize lyrics into bars.',
    howTo: 'Lyrics page → paste raw text → Smart Structure dialog → Apply.',
    inkReward: 25,
    xpReward: 40,
    category: 'activation',
    icon: 'paste',
  },
  {
    id: 'first_next_bar',
    title: 'Next Bar Graduate',
    description: 'Generated your first next-line suggestion.',
    howTo: 'Lyrics page → select a bar → Bar Workstation → Generate Next.',
    inkReward: 25,
    xpReward: 40,
    category: 'activation',
    icon: 'sparkles',
  },
  {
    id: 'tour_graduate',
    title: 'Studio Tour Graduate',
    description: 'Completed the lyrics-page guided tour.',
    howTo: 'Open any track → finish the guided tour (don’t skip).',
    inkReward: 0,
    xpReward: 25,
    category: 'activation',
    icon: 'compass',
  },
  {
    id: 'rhyme_pulse_on',
    title: 'Rhyme Pulse Active',
    description: 'Turned on Rhyme Pulse highlighting.',
    howTo: 'Lyrics page → center panel → toggle Rhyme Pulse on.',
    inkReward: 0,
    xpReward: 20,
    category: 'activation',
    icon: 'waves',
  },
  {
    id: 'streak_3',
    title: '3-Day Streak',
    description: 'Wrote in the studio three days in a row.',
    howTo: 'Open the app and write on three consecutive days.',
    inkReward: 25,
    xpReward: 35,
    category: 'retention',
    icon: 'flame',
  },
  {
    id: 'streak_7',
    title: '7-Day Streak',
    description: 'A full week of studio sessions.',
    howTo: 'Open the app and write seven days in a row.',
    inkReward: 50,
    xpReward: 50,
    category: 'retention',
    icon: 'flame',
  },
  {
    id: 'streak_30',
    title: '30-Day Streak',
    description: 'Thirty consecutive days in the booth.',
    howTo: 'Keep your daily studio streak going for 30 days.',
    inkReward: 50,
    xpReward: 75,
    category: 'retention',
    icon: 'flame',
  },
  {
    id: 'bars_16_session',
    title: '16-Bar Session',
    description: 'Wrote 16+ bars on one track in a session.',
    howTo: 'Write 16+ non-empty bars on a single track (auto-tracks on save).',
    inkReward: 25,
    xpReward: 40,
    category: 'retention',
    icon: 'music',
  },
  {
    id: 'album_builder',
    title: 'Album Builder',
    description: 'Built an album with three or more tracks.',
    howTo: 'Add at least 3 tracks to one concept album.',
    inkReward: 25,
    xpReward: 45,
    category: 'retention',
    icon: 'disc',
  },
  {
    id: 'track_complete',
    title: 'Track Locked',
    description: 'Marked a track complete.',
    howTo: 'Lyrics page → left Workstation → Track Status → Mark Track Complete.',
    inkReward: 25,
    xpReward: 50,
    category: 'retention',
    icon: 'check',
  },
  {
    id: 'vault_strain',
    title: 'Vault Strain',
    description: 'Saved a custom DNA strain to your vault.',
    howTo: 'Lyrics page → Co-Writer panel → Creative DNA → Archive strain (Pro).',
    inkReward: 0,
    xpReward: 30,
    proOnly: true,
    category: 'conversion',
    icon: 'dna',
  },
  {
    id: 'share_drop',
    title: 'DNA Drop Live',
    description: 'Published a shareable project link.',
    howTo: 'Track or album page → DNA Drop (Share) → Confirm DNA Drop (Pro).',
    inkReward: 0,
    xpReward: 30,
    proOnly: true,
    category: 'conversion',
    icon: 'globe',
  },
  {
    id: 'second_album',
    title: 'Vault Expansion',
    description: 'Ready for unlimited albums — upgrade to Studio Pro.',
    howTo: 'Free tier → Create New → try to add a second concept album.',
    inkReward: 0,
    xpReward: 15,
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
