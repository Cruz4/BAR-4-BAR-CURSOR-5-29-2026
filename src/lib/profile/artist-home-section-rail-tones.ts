import type { LucideIcon } from 'lucide-react';
import {
  BookOpen,
  Disc3,
  Dna,
  Fingerprint,
  LayoutGrid,
  Lock,
  Music2,
  PenLine,
  Quote,
  Sparkles,
  Trophy,
  Users,
} from 'lucide-react';

export type ArtistHomeRailTone = {
  icon: LucideIcon;
  idle: string;
  hover: string;
  active: string;
  flashRgb: string;
};

const DEFAULT_TONE: ArtistHomeRailTone = {
  icon: PenLine,
  idle:
    'border-white/15 bg-black/50 text-white/85 hover:border-[var(--ph-accent,#7dd3fc)]/50 hover:bg-[var(--ph-accent,#7dd3fc)]/10 hover:text-[var(--ph-accent,#7dd3fc)]',
  hover: '',
  active:
    'border-[var(--ph-accent,#7dd3fc)] bg-[var(--ph-accent,#7dd3fc)]/18 text-[var(--ph-accent,#7dd3fc)] shadow-[0_0_22px_rgba(125,211,252,0.32)]',
  flashRgb: '125, 211, 252',
};

/** Per-module rail chrome — matches Studio / Scene lane colors where they exist. */
const MODULE_TONES: Record<string, ArtistHomeRailTone> = {
  'first-drops': {
    icon: Music2,
    idle: 'border-fuchsia-500/40 bg-fuchsia-500/10 text-fuchsia-200/90 hover:border-fuchsia-400/70 hover:bg-fuchsia-500/18 hover:text-fuchsia-100',
    hover: '',
    active:
      'border-fuchsia-400 bg-fuchsia-500/28 text-fuchsia-50 shadow-[0_0_24px_rgba(232,121,249,0.42)]',
    flashRgb: '232, 121, 249',
  },
  nowPlaying: {
    icon: Disc3,
    idle: 'border-fuchsia-500/35 bg-fuchsia-500/8 text-fuchsia-200/85 hover:border-fuchsia-400/65 hover:bg-fuchsia-500/16 hover:text-fuchsia-100',
    hover: '',
    active:
      'border-fuchsia-400 bg-fuchsia-500/24 text-fuchsia-50 shadow-[0_0_22px_rgba(232,121,249,0.38)]',
    flashRgb: '232, 121, 249',
  },
  dropShelf: {
    icon: Dna,
    idle: 'border-emerald-500/35 bg-emerald-500/8 text-emerald-200/90 hover:border-emerald-400/60 hover:bg-emerald-500/16 hover:text-emerald-100',
    hover: '',
    active:
      'border-emerald-400 bg-emerald-500/22 text-emerald-50 shadow-[0_0_22px_rgba(52,211,153,0.35)]',
    flashRgb: '52, 211, 153',
  },
  barOfWeek: {
    icon: Quote,
    idle: 'border-amber-500/30 bg-amber-500/8 text-amber-100/85 hover:border-amber-400/55 hover:bg-amber-500/14 hover:text-amber-50',
    hover: '',
    active:
      'border-amber-400 bg-amber-500/20 text-amber-50 shadow-[0_0_20px_rgba(251,191,36,0.32)]',
    flashRgb: '251, 191, 36',
  },
  wall: {
    icon: PenLine,
    idle: 'border-sky-500/35 bg-sky-500/10 text-sky-200/90 hover:border-sky-400/60 hover:bg-sky-500/16 hover:text-sky-100',
    hover: '',
    active:
      'border-sky-400 bg-sky-500/22 text-sky-50 shadow-[0_0_22px_rgba(56,189,248,0.38)]',
    flashRgb: '56, 189, 248',
  },
  imprintShelf: {
    icon: Sparkles,
    idle: 'border-violet-500/35 bg-violet-500/10 text-violet-200/90 hover:border-violet-400/60 hover:bg-violet-500/16 hover:text-violet-100',
    hover: '',
    active:
      'border-violet-400 bg-violet-500/22 text-violet-50 shadow-[0_0_22px_rgba(167,139,250,0.38)]',
    flashRgb: '167, 139, 250',
  },
  openLock: {
    icon: Lock,
    idle: 'border-yellow-500/30 bg-yellow-500/8 text-yellow-100/85 hover:border-yellow-400/55 hover:bg-yellow-500/14 hover:text-yellow-50',
    hover: '',
    active:
      'border-yellow-400 bg-yellow-500/20 text-yellow-50 shadow-[0_0_20px_rgba(250,204,21,0.34)]',
    flashRgb: '250, 204, 21',
  },
  barBoard: {
    icon: LayoutGrid,
    idle: 'border-orange-500/32 bg-orange-500/8 text-orange-200/88 hover:border-orange-400/55 hover:bg-orange-500/14 hover:text-orange-100',
    hover: '',
    active:
      'border-orange-400 bg-orange-500/20 text-orange-50 shadow-[0_0_20px_rgba(251,146,60,0.34)]',
    flashRgb: '251, 146, 60',
  },
  rhymeFingerprint: {
    icon: Fingerprint,
    idle: 'border-cyan-500/35 bg-cyan-500/10 text-cyan-200/90 hover:border-cyan-400/60 hover:bg-cyan-500/16 hover:text-cyan-100',
    hover: '',
    active:
      'border-cyan-400 bg-cyan-500/22 text-cyan-50 shadow-[0_0_22px_rgba(34,211,238,0.36)]',
    flashRgb: '34, 211, 238',
  },
  proofWall: {
    icon: Trophy,
    idle: 'border-amber-400/35 bg-amber-400/10 text-amber-100/90 hover:border-amber-300/55 hover:bg-amber-400/16 hover:text-amber-50',
    hover: '',
    active:
      'border-amber-300 bg-amber-400/24 text-amber-50 shadow-[0_0_22px_rgba(251,191,36,0.4)]',
    flashRgb: '251, 191, 36',
  },
  friends: {
    icon: Users,
    idle: 'border-indigo-500/35 bg-indigo-500/10 text-indigo-200/90 hover:border-indigo-400/60 hover:bg-indigo-500/16 hover:text-indigo-100',
    hover: '',
    active:
      'border-indigo-400 bg-indigo-500/22 text-indigo-50 shadow-[0_0_22px_rgba(129,140,248,0.38)]',
    flashRgb: '129, 140, 248',
  },
  guestbook: {
    icon: BookOpen,
    idle: 'border-rose-500/32 bg-rose-500/10 text-rose-200/90 hover:border-rose-400/55 hover:bg-rose-500/16 hover:text-rose-100',
    hover: '',
    active:
      'border-rose-400 bg-rose-500/22 text-rose-50 shadow-[0_0_22px_rgba(251,113,133,0.36)]',
    flashRgb: '251, 113, 133',
  },
};

// `theCatch` aliases `barBoard` — fill after barBoard is defined.
MODULE_TONES.theCatch = MODULE_TONES.barBoard;

export function artistHomeRailSectionKey(sectionId: string): string {
  if (sectionId === 'first-drops') return 'first-drops';
  if (sectionId.startsWith('artist-home-')) return sectionId.slice('artist-home-'.length);
  return sectionId;
}

export function artistHomeRailTone(sectionId: string): ArtistHomeRailTone {
  const key = artistHomeRailSectionKey(sectionId);
  return MODULE_TONES[key] ?? DEFAULT_TONE;
}
