import { getManualPath, type ManualPathLane } from '@/lib/manual-paths';

/** How this branch relates to the thing you said you want. */
export type PathBranchKind = 'more' | 'less' | 'else';

export type PathTreeLink = {
  kind: PathBranchKind;
  /** Short reason this branch exists. */
  why: string;
  /** Walk this path. Omit for a stay-here note. */
  laneId?: string;
};

export type PathTreeIntent = {
  id: string;
  /** Plain-language want. */
  want: string;
  /** The path that does that want. */
  laneId: string;
  links: PathTreeLink[];
};

export const PATH_BRANCH_LABEL: Record<PathBranchKind, string> = {
  more: 'More',
  less: 'Less',
  else: 'Other route',
};

/**
 * Intent tree. Same lanes as the coach — this only says how they fork:
 * go further, stop, or take a different thing so names do not get mixed.
 */
export const MANUAL_PATH_TREE: PathTreeIntent[] = [
  {
    id: 'write',
    want: 'Write lyrics',
    laneId: 'write-lyrics',
    links: [
      { kind: 'more', why: 'Sell a recording of it', laneId: 'press-song' },
      { kind: 'more', why: 'Share the lyrics as a page', laneId: 'dna-drop' },
      { kind: 'more', why: 'Speak onto the sheet', laneId: 'freestyle' },
      { kind: 'more', why: 'Write with someone', laneId: 'collab' },
      { kind: 'less', why: 'Stay on the sheet — typing is free. Skip Ink until you want AI.' },
    ],
  },
  {
    id: 'press',
    want: 'Put a song or album out',
    laneId: 'press-song',
    links: [
      { kind: 'more', why: 'Get paid when it sells', laneId: 'get-paid' },
      { kind: 'more', why: 'Play it in Library', laneId: 'play-buy' },
      { kind: 'else', why: 'Lyrics only — not audio', laneId: 'dna-drop' },
      { kind: 'else', why: 'Page skin — not a sale', laneId: 'the-pressing' },
    ],
  },
  {
    id: 'post',
    want: 'Post a photo or clip',
    laneId: 'post-clip',
    links: [
      { kind: 'more', why: 'Be findable on Artist Home', laneId: 'go-public' },
      { kind: 'else', why: 'Friends wall', laneId: 'your-block' },
      { kind: 'else', why: 'Signed-in home', laneId: 'the-scene' },
    ],
  },
  {
    id: 'public',
    want: 'Be findable',
    laneId: 'go-public',
    links: [
      { kind: 'more', why: 'Skin the page', laneId: 'the-pressing' },
      { kind: 'more', why: 'Find other artists', laneId: 'find-artists' },
      { kind: 'less', why: 'Keep Live off. Lyrics stay private either way.' },
    ],
  },
  {
    id: 'dna',
    want: 'Share lyrics, not audio',
    laneId: 'dna-drop',
    links: [
      { kind: 'less', why: 'Write the lyrics first', laneId: 'write-lyrics' },
      { kind: 'else', why: 'Sell the recording instead', laneId: 'press-song' },
    ],
  },
  {
    id: 'later',
    want: 'Listen, get paid, or extras',
    laneId: 'play-buy',
    links: [
      { kind: 'more', why: 'Cash out sales', laneId: 'get-paid' },
      { kind: 'more', why: 'Find artists', laneId: 'find-artists' },
      { kind: 'else', why: 'Ink and Studio Pro', laneId: 'ink-store' },
      { kind: 'else', why: 'Lock desk', laneId: 'lock-desk' },
      { kind: 'else', why: 'Refer a friend', laneId: 'refer' },
    ],
  },
];

export function treeLane(laneId: string): ManualPathLane | undefined {
  return getManualPath(laneId);
}
