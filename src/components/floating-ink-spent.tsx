'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Droplets } from 'lucide-react';
import { useUsage } from '@/context/usage-context';
import { DNASynthesisLoader, type ActiveRules } from '@/components/dna-synthesis-loader';
import { INK_ACTION_LABELS } from '@/lib/ink-labels';

/** Bar workstation buttons sit low — float ink label above the click */
const RAISE_INK_LABEL_ACTIONS = new Set(['generateNextLine']);

function inkAnchorY(actionName: string | undefined, pressY: number): number {
  if (actionName && RAISE_INK_LABEL_ACTIONS.has(actionName)) {
    return pressY - 72;
  }
  return pressY;
}

/** Skip full-screen DNA/logo loader (ink + emoji sequence still runs) */
const SKIP_DNA_OVERLAY_ACTIONS = new Set([
  'generateSongDraft',
  'analyzeRelayAssets',
  'generateRelayDraft',
  'freestyleTranscription',
]);

/** Full ink → -Ink → emoji timing without the DNA phase (matches pre-loader freestyle feel) */
const FULL_EMOJI_SEQUENCE_MS = 7800;
const SHORT_EMOJI_SEQUENCE_MS = 4800;

function emojiSequenceDurationMs(actionName: string | undefined): number {
  if (actionName === 'freestyleTranscription') return FULL_EMOJI_SEQUENCE_MS;
  return SHORT_EMOJI_SEQUENCE_MS;
}

type InkNotification = {
  id: number;
  amount: number;
  px: number;
  py: number;
  bx: number;
  by: number;
  activeRules?: ActiveRules;
  showDna?: boolean;
  dnaProgress?: number;
  skipDnaOverlay?: boolean;
  actionName?: string;
};

export function FloatingInkSpent() {
    const { lastSpent, mousePos } = useUsage();
    const [notifications, setNotifications] = useState<InkNotification[]>([]);
    const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

    useEffect(() => {
        return () => {
            timersRef.current.forEach(clearTimeout);
            timersRef.current = [];
        };
    }, []);

    useEffect(() => {
        if (!lastSpent || lastSpent.amount <= 0) return;

        const skipDnaOverlay = SKIP_DNA_OVERLAY_ACTIONS.has(lastSpent.actionName ?? '');

        const id = Date.now();
        const anchorY = inkAnchorY(lastSpent.actionName, lastSpent.pressY);
        setNotifications(prev => [...prev, {
            id,
            amount: lastSpent.amount,
            px: lastSpent.pressX,
            py: anchorY,
            bx: mousePos.x,
            by: mousePos.y,
            activeRules: lastSpent.activeRules,
            showDna: false,
            dnaProgress: 0,
            skipDnaOverlay,
            actionName: lastSpent.actionName,
        }]);

        if (!skipDnaOverlay) {
            const dnaStart = setTimeout(() => {
                setNotifications(prev => prev.map(n => n.id === id ? { ...n, showDna: true, dnaProgress: 0 } : n));
            }, 4500);
            timersRef.current.push(dnaStart);

            const progressInterval = setInterval(() => {
                setNotifications(prev => prev.map(n => {
                    if (n.id !== id || !n.showDna) return n;
                    return { ...n, dnaProgress: Math.min(100, (n.dnaProgress ?? 0) + 5) };
                }));
            }, 120);

            const cleanup = setTimeout(() => {
                clearInterval(progressInterval);
                setNotifications(prev => prev.filter(n => n.id !== id));
            }, 7800);
            timersRef.current.push(cleanup);
        } else {
            const durationMs = emojiSequenceDurationMs(lastSpent.actionName);
            const cleanup = setTimeout(() => {
                setNotifications(prev => prev.filter(n => n.id !== id));
            }, durationMs);
            timersRef.current.push(cleanup);
        }
    }, [lastSpent]);

    return (
        <div className="fixed inset-0 pointer-events-none z-[9999] overflow-hidden">
            <AnimatePresence>
                {notifications.map((n) => (
                    <React.Fragment key={n.id}>
                        {/* PHASE 1: THE INK DRIP & SPLATTER (At Interaction Point) */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute"
                            style={{ left: n.px, top: n.py }}
                        >
                            <motion.div
                                initial={{ y: -20, opacity: 0, scale: 0.5 }}
                                animate={{ y: n.actionName && RAISE_INK_LABEL_ACTIONS.has(n.actionName) ? 20 : 40, opacity: [0, 1, 1, 0], scale: [0.5, 1.2, 1, 1.5] }}
                                transition={{ duration: 1, ease: "easeIn" }}
                                className="text-primary"
                            >
                                <Droplets className="h-6 w-6 fill-current" />
                            </motion.div>

                            <motion.div
                                initial={{ scale: 0, opacity: 0, y: 8 }}
                                animate={{ scale: [0, 1.2, 1], opacity: [0, 1, 1, 0], y: n.actionName && RAISE_INK_LABEL_ACTIONS.has(n.actionName) ? -48 : 0 }}
                                transition={{ delay: 0.8, duration: 2 }}
                                className="flex flex-col items-center gap-1 -translate-x-1/2"
                            >
                                <div className="bg-primary/20 backdrop-blur-md border border-primary/40 px-3 py-1.5 rounded-full shadow-[0_0_15px_rgba(59,130,246,0.3)] text-center">
                                    <span className="text-sm font-bold font-code text-primary uppercase tracking-tighter">-{n.amount} Ink</span>
                                    {n.actionName && INK_ACTION_LABELS[n.actionName as keyof typeof INK_ACTION_LABELS] && (
                                      <p className="text-[8px] font-bold text-primary/80 uppercase tracking-wide mt-0.5">
                                        {INK_ACTION_LABELS[n.actionName as keyof typeof INK_ACTION_LABELS]}
                                      </p>
                                    )}
                                </div>
                                <div className="w-8 h-8 bg-primary/30 rounded-full blur-lg animate-pulse" />
                            </motion.div>
                        </motion.div>

                        {/* PHASE 2: THE NEURAL BLOOM (At LIVE Cursor Focus) */}
                        <motion.div
                            initial={{ opacity: 0, scale: 0.5 }}
                            animate={{ 
                                opacity: [0, 1, 1, 0], 
                                scale: [0.5, 1.5, 1, 2],
                                filter: ["blur(0px)", "blur(0px)", "blur(0px)", "blur(10px)"]
                            }}
                            transition={{ delay: 1.8, duration: 3, times: [0, 0.2, 0.8, 1] }}
                            className="absolute flex items-center justify-center"
                            style={{ left: n.bx - 20, top: n.by - 20 }}
                        >
                            <span className="text-4xl drop-shadow-[0_0_20px_rgba(59,130,246,0.6)]">🧠</span>
                            <motion.div 
                                animate={{ scale: [1, 2, 1], opacity: [0.1, 0.3, 0.1] }}
                                transition={{ duration: 1, repeat: Infinity }}
                                className="absolute inset-0 bg-primary/10 rounded-full blur-3xl"
                            />
                        </motion.div>

                        {/* PHASE 3: DNA SYNTHESIS — centered (skipped when inline UI already active) */}
                        {n.showDna && !n.skipDnaOverlay && (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: [0, 1, 1, 0] }}
                                exit={{ opacity: 0 }}
                                transition={{ duration: 2.8, times: [0, 0.12, 0.78, 1] }}
                                className="fixed inset-0 flex items-center justify-center pointer-events-none"
                            >
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.8, y: 24 }}
                                    animate={{ opacity: [0, 1, 1, 0], scale: [0.8, 1, 1, 0.96], y: [24, 0, 0, -16] }}
                                    transition={{ duration: 2.8, times: [0, 0.15, 0.75, 1] }}
                                    className="rounded-2xl border border-white/10 bg-black/75 backdrop-blur-xl px-6 py-5 shadow-[0_0_48px_rgba(217,70,239,0.3)]"
                                >
                                    <DNASynthesisLoader
                                        compact={false}
                                        progress={n.dnaProgress ?? 0}
                                        activeRules={n.activeRules}
                                        statusText="Creative Syncing..."
                                    />
                                </motion.div>
                            </motion.div>
                        )}
                    </React.Fragment>
                ))}
            </AnimatePresence>
        </div>
    );
}
