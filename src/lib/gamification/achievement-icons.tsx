import {
  BrainCircuit,
  Calendar,
  CheckCircle2,
  ClipboardPaste,
  Compass,
  Disc3,
  Dna,
  Flame,
  Globe,
  Layers,
  Lock,
  Moon,
  Music,
  PenLine,
  Sparkles,
  Trophy,
  Waves,
  type LucideIcon,
} from 'lucide-react';

const ACHIEVEMENT_ICON_MAP: Record<string, LucideIcon> = {
  paste: ClipboardPaste,
  sparkles: Sparkles,
  compass: Compass,
  waves: Waves,
  brain: BrainCircuit,
  flame: Flame,
  calendar: Calendar,
  music: Music,
  moon: Moon,
  layers: Layers,
  pen: PenLine,
  check: CheckCircle2,
  disc: Disc3,
  dna: Dna,
  globe: Globe,
  lock: Lock,
};

export function achievementIcon(iconKey: string): LucideIcon {
  return ACHIEVEMENT_ICON_MAP[iconKey] || Trophy;
}
