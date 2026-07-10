'use client';

/**
 * Three just-in-time coach marks for a brand-new artist's first session.
 * Non-blocking bottom-center callouts that replace the 9-step guided tour
 * during the first ~30 minutes after signup. See src/lib/first-session.ts.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Droplets, RefreshCw, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AI_COSTS } from '@/lib/costs';
import {
  COACH_FIRST_ACCEPT_EVENT,
  COACH_FIRST_INK_EVENT,
  hasSeenCoachMark,
  isFirstWriteSession,
  markCoachMarkSeen,
  type CoachMarkStage,
} from '@/lib/first-session';
import type { Track, User } from '@/lib/types';

const AUTO_DISMISS_MS = 15000;

const STAGE_CONTENT: Record<CoachMarkStage, { icon: React.ComponentType<{ className?: string }>; title: string; text: string }> = {
  generate: {
    icon: Sparkles,
    title: 'First line down',
    text: `Click your line, then hit Generate Next in the bar workstation below — the AI writes the next bar to match your rhyme (${AI_COSTS.generateNextLine} Ink).`,
  },
  ink: {
    icon: Droplets,
    title: 'That used Ink',
    text: `Ink is your AI fuel — every generation spends a little. Your welcome Ink balance lives in the header. Now pick Opt 1 or Opt 2 below to drop a line in.`,
  },
  accept: {
    icon: RefreshCw,
    title: 'Line added',
    text: 'Not feeling it? Hit Generate Next again for fresh options — your own written lines always stay put, and the sheet autosaves as you go.',
  },
};

export function FirstSessionCoachMarks({ user, track }: { user: User | null; track: Track | null }) {
  const [stage, setStage] = useState<CoachMarkStage | null>(null);

  const eligible = useMemo(() => isFirstWriteSession(user), [user]);

  const hasWrittenLine = useMemo(() => {
    if (!track) return false;
    return track.sections.some((s) => s.bars.some((b) => b.text.trim().length > 0));
  }, [track]);

  const show = useCallback(
    (next: CoachMarkStage) => {
      if (!user?.id || !eligible) return;
      if (hasSeenCoachMark(user.id, next)) return;
      markCoachMarkSeen(user.id, next);
      setStage(next);
    },
    [user?.id, eligible]
  );

  const dismiss = useCallback(() => setStage(null), []);

  // Stage 1: the first non-empty line appears on the sheet.
  useEffect(() => {
    if (!eligible || !hasWrittenLine) return;
    const t = window.setTimeout(() => show('generate'), 700);
    return () => window.clearTimeout(t);
  }, [eligible, hasWrittenLine, show]);

  // Stages 2 and 3: fired by the editor at first Ink spend / first accepted option.
  useEffect(() => {
    if (!eligible) return;
    const onInk = () => show('ink');
    const onAccept = () => show('accept');
    window.addEventListener(COACH_FIRST_INK_EVENT, onInk);
    window.addEventListener(COACH_FIRST_ACCEPT_EVENT, onAccept);
    return () => {
      window.removeEventListener(COACH_FIRST_INK_EVENT, onInk);
      window.removeEventListener(COACH_FIRST_ACCEPT_EVENT, onAccept);
    };
  }, [eligible, show]);

  useEffect(() => {
    if (!stage) return;
    const t = window.setTimeout(dismiss, AUTO_DISMISS_MS);
    return () => window.clearTimeout(t);
  }, [stage, dismiss]);

  if (!eligible || !stage) return null;
  const content = STAGE_CONTENT[stage];
  const Icon = content.icon;

  return (
    <AnimatePresence>
      <motion.div
        key={stage}
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 12 }}
        className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[1500] w-[calc(100vw-2rem)] max-w-md pointer-events-none"
      >
        <div className="pointer-events-auto rounded-xl border border-primary/30 bg-card/95 backdrop-blur-md shadow-[0_20px_45px_rgba(0,0,0,0.45)] p-4 flex items-start gap-3">
          <div className="p-2 rounded-lg bg-primary/10 border border-primary/20 shrink-0">
            <Icon className="h-4 w-4 text-primary" />
          </div>
          <div className="min-w-0 space-y-1">
            <p className="text-[10px] font-bold uppercase tracking-widest text-primary">{content.title}</p>
            <p className="text-xs text-foreground/85 leading-relaxed">{content.text}</p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 rounded-full shrink-0 text-muted-foreground hover:text-foreground"
            onClick={dismiss}
            aria-label="Dismiss tip"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
