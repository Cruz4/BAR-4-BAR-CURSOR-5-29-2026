'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { getAchievement } from '@/lib/gamification/achievements';
import {
  formatUnlockDate,
  getAchievementCardTheme,
  getAchievementSerial,
  pickFeaturedAchievementId,
} from '@/lib/gamification/achievement-card-theme';
import {
  CheckCircle2,
  ClipboardPaste,
  Compass,
  Copy,
  Disc3,
  Dna,
  Download,
  Flame,
  Globe,
  Lock,
  Music,
  Sparkles,
  Trophy,
  Waves,
  type LucideIcon,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const ACHIEVEMENT_ICONS: Record<string, LucideIcon> = {
  paste: ClipboardPaste,
  sparkles: Sparkles,
  compass: Compass,
  waves: Waves,
  flame: Flame,
  music: Music,
  disc: Disc3,
  check: CheckCircle2,
  dna: Dna,
  globe: Globe,
  lock: Lock,
};

type AchievementShareCardProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  displayName: string;
  rankLabel: string;
  streak: number;
  xp: number;
  recentBadge?: string;
  unlockedAchievements?: Record<string, string>;
};

function Barcode({ accent }: { accent: string }) {
  const bars = [3, 1, 2, 4, 1, 3, 2, 1, 4, 2, 1, 3, 1, 2, 4, 1, 3, 2, 2, 1, 4, 3, 1];
  return (
    <div className="flex items-end gap-[2px] h-8 opacity-80" aria-hidden>
      {bars.map((w, i) => (
        <div
          key={i}
          className="rounded-[1px]"
          style={{ width: w, height: i % 3 === 0 ? '100%' : '72%', backgroundColor: accent }}
        />
      ))}
    </div>
  );
}

export function AchievementShareCard({
  open,
  onOpenChange,
  displayName,
  rankLabel,
  streak,
  xp,
  recentBadge,
  unlockedAchievements = {},
}: AchievementShareCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const unlockedIds = useMemo(() => Object.keys(unlockedAchievements), [unlockedAchievements]);
  const [selectedId, setSelectedId] = useState<string | undefined>(() =>
    pickFeaturedAchievementId(unlockedAchievements, recentBadge)
  );

  useEffect(() => {
    if (open) {
      setSelectedId(pickFeaturedAchievementId(unlockedAchievements, recentBadge));
    }
  }, [open, unlockedAchievements, recentBadge]);

  const badge = selectedId ? getAchievement(selectedId) : null;
  const theme = getAchievementCardTheme(badge);
  const Icon = badge ? ACHIEVEMENT_ICONS[badge.icon] || Trophy : Trophy;
  const unlockDate = selectedId ? unlockedAchievements[selectedId] : undefined;
  const serial = getAchievementSerial(selectedId || 'studio-stats', displayName);

  const copySummary = () => {
    const text = badge
      ? `🏆 ${badge.title} — ${displayName}\n${badge.description}\n${rankLabel} · ${xp.toLocaleString()} XP · ${streak}d streak\nUnlocked ${formatUnlockDate(unlockDate)}\nBar 4 Bar Studio · ${serial}`
      : `${displayName} · ${rankLabel} · ${xp.toLocaleString()} XP · ${streak}d streak — Bar 4 Bar Studio`;
    void navigator.clipboard.writeText(text);
    toast({ title: 'Copied to clipboard' });
  };

  const downloadPng = async () => {
    if (!cardRef.current) return;
    try {
      const html2canvas = (await import('html2canvas')).default;
      const canvas = await html2canvas(cardRef.current, {
        backgroundColor: theme.gradientTo,
        scale: 2,
        useCORS: true,
      });
      const slug = (badge?.id || 'studio-stats').replace(/_/g, '-');
      const link = document.createElement('a');
      link.download = `bar4bar-${slug}-${displayName.replace(/\s+/g, '-').toLowerCase()}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
      toast({ title: 'Card downloaded' });
    } catch {
      toast({ variant: 'destructive', title: 'Download failed — try copy instead' });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Share achievement card</DialogTitle>
          <DialogDescription>
            Your studio status with your latest milestone front and center. Pick a badge if you have several. No lyrics
            included.
          </DialogDescription>
        </DialogHeader>

        {unlockedIds.length > 1 && (
          <Select value={selectedId} onValueChange={setSelectedId}>
            <SelectTrigger className="h-9 text-xs font-bold uppercase">
              <SelectValue placeholder="Choose achievement" />
            </SelectTrigger>
            <SelectContent>
              {unlockedIds
                .sort((a, b) => unlockedAchievements[b].localeCompare(unlockedAchievements[a]))
                .map((id) => {
                  const def = getAchievement(id);
                  return (
                    <SelectItem key={id} value={id} className="text-xs">
                      {def?.title || id}
                    </SelectItem>
                  );
                })}
            </SelectContent>
          </Select>
        )}

        <div
          ref={cardRef}
          className="relative overflow-hidden rounded-2xl text-left shadow-[0_24px_80px_rgba(0,0,0,0.55)]"
          style={{
            background: `linear-gradient(145deg, ${theme.gradientFrom} 0%, ${theme.gradientVia} 45%, ${theme.gradientTo} 100%)`,
          }}
        >
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.07]"
            style={{
              backgroundImage:
                'radial-gradient(circle at 20% 10%, white 0, transparent 42%), radial-gradient(circle at 85% 75%, white 0, transparent 35%)',
            }}
          />
          <div
            className="pointer-events-none absolute -right-8 -top-10 text-[120px] font-headline font-bold leading-none opacity-[0.06] select-none"
            style={{ color: theme.accent }}
          >
            {theme.watermark}
          </div>

          <div className="relative p-[3px] rounded-2xl" style={{ background: theme.foil }}>
            <div className="rounded-[13px] p-5 space-y-5" style={{ backgroundColor: 'rgba(2, 6, 23, 0.72)' }}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[8px] font-bold uppercase tracking-[0.35em] text-white/50">Bar 4 Bar Studio</p>
                  <p className="text-[10px] font-bold uppercase tracking-widest mt-1" style={{ color: theme.accent }}>
                    {badge ? 'Latest Milestone' : 'Studio Status'}
                  </p>
                </div>
                <span
                  className="shrink-0 rounded-full px-2.5 py-1 text-[8px] font-bold uppercase tracking-wider border"
                  style={{
                    color: theme.accent,
                    borderColor: `${theme.accent}55`,
                    backgroundColor: theme.accentSoft,
                  }}
                >
                  {theme.categoryLabel}
                </span>
              </div>

              <div className="flex flex-col items-center text-center space-y-3 py-1">
                <div
                  className="relative flex h-20 w-20 items-center justify-center rounded-full border-2"
                  style={{
                    borderColor: `${theme.accent}88`,
                    background: `radial-gradient(circle at 30% 25%, ${theme.accentSoft}, transparent 70%)`,
                    boxShadow: `0 0 40px ${theme.glow}`,
                  }}
                >
                  <Icon className="h-9 w-9" style={{ color: theme.accent }} strokeWidth={1.75} />
                </div>
                <div className="space-y-1.5 max-w-[280px]">
                  <h3
                    className="text-2xl font-headline font-bold uppercase tracking-tight leading-none text-white"
                    style={{ textShadow: `0 0 28px ${theme.glow}` }}
                  >
                    {badge?.title || 'Studio Artist'}
                  </h3>
                  <p className="text-[11px] text-white/65 font-code leading-snug">
                    {badge?.description || 'Building rank, streak, and studio milestones.'}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: 'Rank', value: rankLabel },
                  { label: 'XP', value: xp.toLocaleString() },
                  { label: 'Streak', value: `${streak}d` },
                ].map((stat) => (
                  <div
                    key={stat.label}
                    className="rounded-lg border px-2 py-2 text-center"
                    style={{ borderColor: `${theme.accent}33`, backgroundColor: theme.accentSoft }}
                  >
                    <p className="text-[8px] uppercase tracking-widest text-white/45 font-bold">{stat.label}</p>
                    <p className="text-[11px] font-bold text-white mt-0.5 truncate">{stat.value}</p>
                  </div>
                ))}
              </div>

              <div
                className="border-t border-dashed pt-4 space-y-3"
                style={{ borderColor: `${theme.accent}44` }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[8px] uppercase tracking-[0.25em] text-white/40 font-bold">Artist</p>
                    <p className="text-sm font-headline font-bold uppercase text-white truncate">{displayName}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-[8px] uppercase tracking-[0.25em] text-white/40 font-bold">
                      {badge ? 'Unlocked' : 'Status'}
                    </p>
                    <p className="text-[10px] font-code text-white/75">
                      {badge ? formatUnlockDate(unlockDate) : rankLabel}
                    </p>
                  </div>
                </div>
                <div className="flex items-end justify-between gap-4">
                  <Barcode accent={theme.accent} />
                  <div className="text-right">
                    <p className="text-[8px] font-mono text-white/45">bar4bar.studio</p>
                    <p className="text-[9px] font-mono font-bold" style={{ color: theme.accent }}>
                      {serial}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex gap-2 justify-end">
          <Button variant="outline" size="sm" onClick={copySummary}>
            <Copy className="h-4 w-4 mr-2" /> Copy text
          </Button>
          <Button size="sm" onClick={downloadPng}>
            <Download className="h-4 w-4 mr-2" /> Download PNG
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
