import { getManualPath, type ManualPathLane } from '@/lib/manual-paths';

export type PathGuideFamily = 'write' | 'release' | 'public' | 'listen' | 'extra';

export type PathScreenKind =
  | 'scene-booth'
  | 'scene-block'
  | 'scene-home'
  | 'vault'
  | 'sheet'
  | 'library'
  | 'earnings'
  | 'discover'
  | 'pricing';

export type PathGuide = {
  laneId: string;
  want: string;
  what: string;
  where: string;
  /** Shown on the picture. */
  photoCaption: string;
  image?: { src: string; alt: string };
  screen: PathScreenKind;
  family: PathGuideFamily;
  /** Other jobs — chips that switch paths, never nest their steps here. */
  related: Array<{ laneId: string; why: string }>;
};

export const PATH_FAMILY_META: Record<
  PathGuideFamily,
  { label: string; hint: string; accent: string; heading: string }
> = {
  write: {
    label: 'Write',
    hint: 'Lyrics live in The Vault',
    accent: 'border-sky-400/40 bg-sky-500/10 text-sky-200',
    heading: 'text-sky-300',
  },
  release: {
    label: 'Release',
    hint: 'Audio sells from The Scene',
    accent: 'border-fuchsia-400/40 bg-fuchsia-500/10 text-fuchsia-200',
    heading: 'text-fuchsia-300',
  },
  public: {
    label: 'Be Seen',
    hint: 'Page, posts, people',
    accent: 'border-emerald-400/40 bg-emerald-500/10 text-emerald-200',
    heading: 'text-emerald-300',
  },
  listen: {
    label: 'Listen',
    hint: 'Play what you pressed or bought',
    accent: 'border-amber-400/40 bg-amber-500/10 text-amber-200',
    heading: 'text-amber-300',
  },
  extra: {
    label: 'Extra',
    hint: 'Optional rooms',
    accent: 'border-violet-300/35 bg-violet-500/10 text-violet-100',
    heading: 'text-violet-300',
  },
};

export const MANUAL_PATH_GUIDES: PathGuide[] = [
  {
    laneId: 'write-lyrics',
    want: 'Write lyrics',
    what: 'Open a lyric sheet and type. Ink only pays AI — typing is free.',
    where: 'Vault → album → sheet',
    photoCaption: 'This is the sheet. You get here from The Vault, not from New release.',
    image: {
      src: '/marketing/paths/write-lyrics.png',
      alt: 'Lyric sheet in The Vault',
    },
    screen: 'sheet',
    family: 'write',
    related: [
      { laneId: 'press-song', why: 'Sell a recording of it — different job' },
      { laneId: 'dna-drop', why: 'Share the lyrics as a page' },
    ],
  },
  {
    laneId: 'press-song',
    want: 'Press a song live',
    what: 'Upload finished audio, set a price, and publish it for listening or sale.',
    where: 'Scene → Your Booth or dock → New release',
    photoCaption: 'New release lives on Your Booth. It is not The Vault and not DNA Drop.',
    image: {
      src: '/marketing/paths/press-song.png',
      alt: 'New release dialog on The Scene',
    },
    screen: 'scene-booth',
    family: 'release',
    related: [
      { laneId: 'write-lyrics', why: 'Write the lyrics first' },
      { laneId: 'get-paid', why: 'Cash out after a sale' },
      { laneId: 'dna-drop', why: 'Lyrics-only link instead' },
    ],
  },
  {
    laneId: 'post-clip',
    want: 'Post a photo or clip',
    what: 'Put a photo or short clip on a wall. Same Camera and Photo buttons everywhere.',
    where: 'Your Booth, Your Block, or Artist Home wall',
    photoCaption: 'Composer on The Scene — Camera, Photo, then Post.',
    image: {
      src: '/marketing/paths/post-clip.png',
      alt: 'Scene wall composer with Camera, Photo, and Post',
    },
    screen: 'scene-block',
    family: 'public',
    related: [
      { laneId: 'go-public', why: 'Make the page findable' },
      { laneId: 'your-block', why: 'Friends wall' },
    ],
  },
  {
    laneId: 'go-public',
    want: 'Go public',
    what: 'Turn Artist Home live so people can open your page. Lyrics stay private.',
    where: 'Scene → Your Booth → Live switch',
    photoCaption: 'Artist Home after Live is on. Flip Live on Your Booth first.',
    image: {
      src: '/marketing/paths/go-public.png',
      alt: 'Your Booth Live switch on The Scene',
    },
    screen: 'scene-booth',
    family: 'public',
    related: [
      { laneId: 'the-pressing', why: 'Skin the page background' },
      { laneId: 'post-clip', why: 'Post on the wall' },
    ],
  },
  {
    laneId: 'dna-drop',
    want: 'Share lyrics (DNA Drop)',
    what: 'Publish, view, and import lyric snapshots — Studio Pro only. No audio. Not New release.',
    where: 'Vault → sheet → left panel → DNA Drop',
    photoCaption: 'DNA lives on the sheet. The public link is a lyric page, not a song sale.',
    image: {
      src: '/marketing/paths/dna-drop.png',
      alt: 'DNA Drop control on the lyric sheet',
    },
    screen: 'sheet',
    family: 'write',
    related: [
      { laneId: 'write-lyrics', why: 'Write the lyrics first' },
      { laneId: 'press-song', why: 'Sell audio instead' },
    ],
  },
  {
    laneId: 'find-artists',
    want: 'Find artists',
    what: 'Browse Discover cards or search a name.',
    where: 'Scene → Discover, or /discover',
    photoCaption: 'Discover sits on The Scene after you sign in.',
    image: {
      src: '/marketing/paths/find-artists.png',
      alt: 'Discover on The Scene',
    },
    screen: 'discover',
    family: 'public',
    related: [{ laneId: 'go-public', why: 'Be findable yourself' }],
  },
  {
    laneId: 'play-buy',
    want: 'Play or buy music',
    what: 'Hear songs you pressed, songs you bought, or House tracks.',
    where: 'Library',
    photoCaption: 'Library is the player — not The Vault and not New release.',
    image: {
      src: '/marketing/paths/play-buy.png',
      alt: 'Library player',
    },
    screen: 'library',
    family: 'listen',
    related: [
      { laneId: 'press-song', why: 'Press something to play' },
      { laneId: 'get-paid', why: 'Get paid when someone buys' },
    ],
  },
  {
    laneId: 'get-paid',
    want: 'Get paid',
    what: 'Fans pay money for a live release. Connect Stripe on Earnings and cash out.',
    where: 'Press live first → Earnings',
    photoCaption: 'Earnings is for payouts. A sale needs a pressed song or album.',
    image: {
      src: '/marketing/paths/get-paid.png',
      alt: 'Earnings payouts page',
    },
    screen: 'earnings',
    family: 'release',
    related: [{ laneId: 'press-song', why: 'Press the audio first' }],
  },
  {
    laneId: 'the-pressing',
    want: 'The Pressing',
    what: 'Living background skin on Artist Home. Free. Not a song sale.',
    where: 'Edit Public Page → The Pressing',
    photoCaption: 'The page skin. It does not upload audio or take money.',
    image: {
      src: '/marketing/paths/the-pressing.png',
      alt: 'The Pressing controls on Edit Public Page',
    },
    screen: 'scene-booth',
    family: 'public',
    related: [
      { laneId: 'go-public', why: 'Turn the page live' },
      { laneId: 'press-song', why: 'Sell audio instead' },
    ],
  },
  {
    laneId: 'ink-store',
    want: 'Ink and Studio Pro',
    what: 'Ink pays AI only. Fans never pay Ink. Pro unlocks catalog, DNA Drop, Collab, Freestyle.',
    where: 'Pricing',
    photoCaption: 'Ink store and Studio Pro — not where you press a song.',
    image: {
      src: '/marketing/paths/ink-store.png',
      alt: 'Pricing page with Ink and Studio Pro',
    },
    screen: 'pricing',
    family: 'extra',
    related: [{ laneId: 'write-lyrics', why: 'Typing on a sheet is free' }],
  },
  {
    laneId: 'collab',
    want: 'Write with someone',
    what: 'Share a live editable lyric sheet. Pro.',
    where: 'Vault → sheet → Collab Sheet',
    photoCaption: 'Collab is on the sheet, not on The Scene wall.',
    image: {
      src: '/marketing/paths/collab.png',
      alt: 'Collab Sheet control on the lyric sheet',
    },
    screen: 'sheet',
    family: 'write',
    related: [{ laneId: 'write-lyrics', why: 'Open a sheet first' }],
  },
  {
    laneId: 'freestyle',
    want: 'Speak onto the sheet',
    what: 'Record spoken bars onto the lyric page. Pro. Ink for transcription.',
    where: 'Vault → sheet → Freestyle',
    photoCaption: 'Freestyle drops words onto this sheet.',
    image: {
      src: '/marketing/paths/freestyle.png',
      alt: 'Freestyle on Bar Workstation',
    },
    screen: 'sheet',
    family: 'write',
    related: [{ laneId: 'write-lyrics', why: 'Open a sheet first' }],
  },
  {
    laneId: 'refer',
    want: 'Refer a friend',
    what: 'Share your link. They get welcome Ink. You can earn Ink after they spend.',
    where: 'Scene → under Discover',
    photoCaption: 'Referral sits on The Scene, under Discover.',
    image: {
      src: '/marketing/paths/refer.png',
      alt: 'Refer a friend on The Scene',
    },
    screen: 'discover',
    family: 'extra',
    related: [],
  },
  {
    laneId: 'the-scene',
    want: 'Land on The Scene',
    what: 'Signed-in home: friends, Discover, Your Booth. Write still happens in The Vault.',
    where: 'The Scene (/)',
    photoCaption: 'Home after sign-in. New release is on Your Booth. Sheets are in The Vault.',
    image: {
      src: '/marketing/paths/the-scene.png',
      alt: 'The Scene home after sign-in',
    },
    screen: 'scene-home',
    family: 'public',
    related: [
      { laneId: 'write-lyrics', why: 'Go write' },
      { laneId: 'press-song', why: 'Press a song' },
    ],
  },
  {
    laneId: 'your-block',
    want: 'Open Your Block',
    what: 'Friends wall — posts, camera, comments. Same composer as Your Booth.',
    where: 'Scene → Your Block',
    photoCaption: 'The friends feed on The Scene.',
    image: {
      src: '/marketing/paths/your-block.png',
      alt: 'Your Block friends feed on The Scene',
    },
    screen: 'scene-block',
    family: 'public',
    related: [{ laneId: 'post-clip', why: 'Post a clip there' }],
  },
];

export const PATH_GUIDE_FAMILIES: PathGuideFamily[] = [
  'write',
  'release',
  'public',
  'listen',
  'extra',
];

export function getPathGuide(laneId: string): PathGuide | undefined {
  return MANUAL_PATH_GUIDES.find((guide) => guide.laneId === laneId);
}

export function guideLane(laneId: string): ManualPathLane | undefined {
  return getManualPath(laneId);
}
