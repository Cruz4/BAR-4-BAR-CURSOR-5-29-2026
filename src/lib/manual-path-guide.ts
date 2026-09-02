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
  | 'lock'
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
  { label: string; hint: string; accent: string }
> = {
  write: {
    label: 'Write',
    hint: 'Lyrics live in The Vault',
    accent: 'border-sky-400/40 bg-sky-500/10 text-sky-200',
  },
  release: {
    label: 'Release',
    hint: 'Audio sells from The Scene',
    accent: 'border-fuchsia-400/40 bg-fuchsia-500/10 text-fuchsia-200',
  },
  public: {
    label: 'Be seen',
    hint: 'Page, posts, people',
    accent: 'border-emerald-400/40 bg-emerald-500/10 text-emerald-200',
  },
  listen: {
    label: 'Listen',
    hint: 'Play what you pressed or bought',
    accent: 'border-amber-400/40 bg-amber-500/10 text-amber-100',
  },
  extra: {
    label: 'Extra',
    hint: 'Optional rooms',
    accent: 'border-white/20 bg-white/5 text-white/70',
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
      src: '/marketing/hero-workstation.png',
      alt: 'Lyric sheet with bars, DNA Suite, and Bar Workstation',
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
      src: '/marketing/feature-artist-home-live.jpg',
      alt: 'Public Artist Home with name, featured media, and modules',
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
    what: 'Publish a Pro lyric-snapshot link. No audio. Not New release.',
    where: 'Vault → sheet → left panel → DNA Drop',
    photoCaption: 'DNA lives on the sheet. The public link is a lyric page, not a song sale.',
    image: {
      src: '/marketing/how-step-dna.png',
      alt: 'DNA Suite on the lyric sheet',
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
      src: '/marketing/feature-artist-home-live.jpg',
      alt: 'Artist Home page that The Pressing skins',
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
    screen: 'pricing',
    family: 'extra',
    related: [{ laneId: 'write-lyrics', why: 'Typing on a sheet is free' }],
  },
  {
    laneId: 'lock-desk',
    want: 'Lock desk',
    what: 'Public bar challenges. Optional — skip until you have written on a sheet.',
    where: 'Lock desk',
    photoCaption: 'A side room for public bars, not the lyric workstation.',
    screen: 'lock',
    family: 'extra',
    related: [{ laneId: 'write-lyrics', why: 'Write on a sheet first' }],
  },
  {
    laneId: 'collab',
    want: 'Write with someone',
    what: 'Share a live editable lyric sheet. Pro.',
    where: 'Vault → sheet → Collab Sheet',
    photoCaption: 'Collab is on the sheet, not on The Scene wall.',
    image: {
      src: '/marketing/hero-workstation.png',
      alt: 'Lyric sheet where Collab Sheet lives',
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
      src: '/marketing/how-step-workstation.png',
      alt: 'Bar Workstation on the lyric sheet',
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
