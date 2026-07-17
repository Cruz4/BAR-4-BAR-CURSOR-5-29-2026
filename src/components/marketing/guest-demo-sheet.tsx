'use client';

/**
 * Guest demo sheet — mirrors studio Intents + Precision Lock + Rhyme Pulse
 * (phonetic end-rhyme highlighting on user-written and assisted bars).
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, ArrowUpRight, Lock, PenLine, PlusCircle, RotateCcw, Trash2, Waves } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { HighlightedText } from '@/components/highlighted-text';
import { cn } from '@/lib/utils';
import { persistDemoLines } from '@/lib/demo-session';
import { buildLandingSignupUrl } from '@/lib/login-links';
import { SIGNUP_INK } from '@/lib/subscription';
import { coWriterIntentRowClass } from '@/lib/co-writer-rules';
import {
  lineEndWord,
  nearRhymeScore,
  NEAR_RHYME_THRESHOLD,
  rhymeKey,
} from '@/lib/lyrics-analysis';

type DemoOption = { line: string; syllables: number; rhymeKey: string };

const MAX_SHEET_LINES = 8;
const MAX_MOTIF = 48;
const MAX_MOTIFS = 6;
const LOCK_HIGHLIGHT = 'bg-sky-500/30 text-sky-100 ring-1 ring-sky-400/50 font-bold';

/** Build app-style rhymeGroups from end-words across sheet lines (user + assist). */
function buildRhymeGroups(lines: string[]): { words: string[] }[] {
  const ends = lines
    .map((line) => lineEndWord(line))
    .filter((w): w is string => !!w && w.length > 0);
  if (ends.length < 2) return [];

  const parent = ends.map((_, i) => i);
  const find = (i: number): number => {
    let cur = i;
    while (parent[cur] !== cur) cur = parent[cur];
    return cur;
  };
  const union = (a: number, b: number) => {
    const ra = find(a);
    const rb = find(b);
    if (ra !== rb) parent[rb] = ra;
  };

  for (let i = 0; i < ends.length; i++) {
    for (let j = i + 1; j < ends.length; j++) {
      const a = ends[i];
      const b = ends[j];
      if (a.toLowerCase() === b.toLowerCase()) {
        union(i, j);
        continue;
      }
      const ka = rhymeKey(a);
      const kb = rhymeKey(b);
      if (ka !== '?' && kb !== '?' && ka === kb) {
        union(i, j);
        continue;
      }
      if (nearRhymeScore(a, b) >= NEAR_RHYME_THRESHOLD) {
        union(i, j);
      }
    }
  }

  const buckets = new Map<number, Set<string>>();
  ends.forEach((word, i) => {
    const root = find(i);
    if (!buckets.has(root)) buckets.set(root, new Set());
    buckets.get(root)!.add(word.toLowerCase());
  });

  return Array.from(buckets.values())
    .map((set) => ({ words: Array.from(set) }))
    .filter((g) => g.words.length >= 2);
}

function highlightLockedEnding(line: string, endWith: string) {
  const lock = endWith.trim();
  if (!lock) return line;
  const lower = line.toLowerCase();
  const target = lock.toLowerCase();
  const idx = lower.lastIndexOf(target);
  if (idx < 0) return line;
  return (
    <>
      {line.slice(0, idx)}
      <span className={cn('rounded px-1 py-0.5', LOCK_HIGHLIGHT)}>{line.slice(idx, idx + lock.length)}</span>
      {line.slice(idx + lock.length)}
    </>
  );
}

export function GuestDemoSheet() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [lines, setLines] = useState<string[]>([]);
  const [draft, setDraft] = useState('');
  const [motifs, setMotifs] = useState<string[]>([]);
  const [checkedMotifs, setCheckedMotifs] = useState<string[]>([]);
  const [endWith, setEndWith] = useState<string | null>(null);
  const [newMotif, setNewMotif] = useState('');
  const [options, setOptions] = useState<DemoOption[] | null>(null);
  const [remaining, setRemaining] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [gateMessage, setGateMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeLock, setActiveLock] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  /** Include in-progress draft so pulse updates as they write. */
  const pulseLines = useMemo(() => {
    const draftText = draft.trim();
    return draftText ? [...lines, draftText] : lines;
  }, [lines, draft]);

  const rhymeGroups = useMemo(() => buildRhymeGroups(pulseLines), [pulseLines]);
  const pulseConnectionCount = rhymeGroups.length;

  useEffect(() => {
    fetch('/api/ai/demo')
      .then((r) => r.json())
      .then((d) => {
        if (typeof d.remaining === 'number') {
          setRemaining(d.remaining);
          if (d.remaining <= 0) {
            setGateMessage('You already used your free demo bars on this device.');
          }
        }
      })
      .catch(() => undefined);
  }, []);

  const goSignup = useCallback(() => {
    persistDemoLines([...lines, draft]);
    router.push(buildLandingSignupUrl(searchParams));
  }, [lines, draft, router, searchParams]);

  /** Keep demo bars ready for signup even if they use the header CTA. */
  useEffect(() => {
    persistDemoLines([...lines, draft]);
  }, [lines, draft]);

  const commitDraft = useCallback((): string[] => {
    const text = draft.trim();
    if (!text) return lines;
    const next = [...lines, text].slice(-MAX_SHEET_LINES);
    setLines(next);
    setDraft('');
    return next;
  }, [draft, lines]);

  const handleAddMotif = useCallback(() => {
    const text = newMotif.trim().slice(0, MAX_MOTIF);
    if (!text) return;
    if (motifs.some((m) => m.toLowerCase() === text.toLowerCase())) {
      setNewMotif('');
      return;
    }
    if (motifs.length >= MAX_MOTIFS) {
      setError(`Demo allows up to ${MAX_MOTIFS} motifs — delete one to add another.`);
      return;
    }
    setMotifs((prev) => [...prev, text]);
    setNewMotif('');
    setError(null);
  }, [newMotif, motifs]);

  const handleMotifCheck = useCallback(
    (motif: string, checked: boolean) => {
      setCheckedMotifs((prev) => {
        const next = checked ? Array.from(new Set([...prev, motif])) : prev.filter((m) => m !== motif);
        return next;
      });
      if (!checked && endWith === motif) {
        setEndWith(null);
      }
    },
    [endWith]
  );

  /** Same toggle semantics as studio handleIntentPrecisionLock. */
  const handlePrecisionLock = useCallback(
    (motif: string) => {
      if (endWith === motif) {
        setEndWith(null);
        return;
      }
      setCheckedMotifs((prev) => Array.from(new Set([...prev, motif])));
      setEndWith(motif);
    },
    [endWith]
  );

  const handleDeleteMotif = useCallback(
    (motif: string) => {
      setMotifs((prev) => prev.filter((m) => m !== motif));
      setCheckedMotifs((prev) => prev.filter((m) => m !== motif));
      if (endWith === motif) setEndWith(null);
    },
    [endWith]
  );

  const generate = useCallback(async () => {
    if (loading || gateMessage) return;
    const sheet = commitDraft();
    if (sheet.length === 0) {
      setError('Write a bar first — one line is all it takes.');
      inputRef.current?.focus();
      return;
    }
    setLoading(true);
    setError(null);
    setOptions(null);
    const lock = endWith?.trim() || '';
    const activeIntents = checkedMotifs.filter((m) => motifs.includes(m));
    try {
      const res = await fetch('/api/ai/demo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lines: sheet,
          ...(lock ? { endWith: lock } : {}),
          ...(activeIntents.length ? { intents: activeIntents } : {}),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.code === 'DEMO_LIMIT') {
          setRemaining(0);
          setGateMessage(data.error);
        } else {
          setError(data.error || 'Something glitched — try again.');
        }
        return;
      }
      setOptions(data.options ?? []);
      setActiveLock(lock);
      if (typeof data.remaining === 'number') setRemaining(data.remaining);
    } catch {
      setError('Connection hiccup — try again.');
    } finally {
      setLoading(false);
    }
  }, [loading, gateMessage, commitDraft, endWith, checkedMotifs, motifs]);

  const acceptOption = useCallback(
    (opt: DemoOption) => {
      setLines((prev) => [...prev, opt.line].slice(-MAX_SHEET_LINES));
      setOptions(null);
      setActiveLock('');
      if (remaining !== null && remaining <= 0) {
        setGateMessage('That was your last free demo bar on this device.');
      } else {
        inputRef.current?.focus();
      }
    },
    [remaining]
  );

  const outOfInk = gateMessage !== null;
  const showIntents = !outOfInk && (lines.length > 0 || draft.trim().length > 0);

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div className="rounded-2xl border border-primary/25 bg-black/55 backdrop-blur-xl shadow-[0_25px_80px_rgba(0,0,0,0.6)] overflow-hidden">
        <div className="flex items-center justify-between px-4 sm:px-5 py-3 border-b border-white/[0.07] bg-white/[0.02]">
          <p className="text-[10px] font-code font-bold uppercase tracking-[0.25em] text-emerald-300 flex items-center gap-2">
            <PenLine className="h-3.5 w-3.5" /> Smart rhyme sheet — no account needed
          </p>
          {remaining !== null && !outOfInk && (
            <p className="text-[10px] font-code font-bold uppercase tracking-widest text-muted-foreground">
              {remaining} studio {remaining === 1 ? 'assist' : 'assists'} left
            </p>
          )}
        </div>

        <div className="px-4 sm:px-6 py-5 space-y-1 min-h-[120px]">
          {lines.length === 0 && (
            <p className="text-xs font-code text-muted-foreground/70 italic pb-2">
              Write your first bar. Press Enter to add it.
            </p>
          )}
          <AnimatePresence initial={false}>
            {lines.map((line, i) => (
              <motion.p
                key={`${i}-${line}`}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="font-code text-sm sm:text-base text-foreground/95 leading-relaxed border-b border-white/[0.05] py-1.5"
              >
                <span className="text-muted-foreground/40 mr-3 select-none">{i + 1}</span>
                <HighlightedText text={line} rhymeGroups={rhymeGroups} />
              </motion.p>
            ))}
          </AnimatePresence>

          {!outOfInk && (
            <div className="flex items-center gap-3 pt-2">
              <span className="text-muted-foreground/40 font-code text-sm select-none">{lines.length + 1}</span>
              <input
                ref={inputRef}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    commitDraft();
                  }
                }}
                maxLength={200}
                placeholder={
                  lines.length === 0
                    ? 'e.g. Been counting these losses like blessings in disguise...'
                    : 'Add another bar (optional)...'
                }
                className="flex-1 bg-transparent border-none outline-none font-code text-sm sm:text-base text-foreground placeholder:text-muted-foreground/40 caret-primary"
              />
            </div>
          )}

          {/* Live draft pulse preview (same highlighter as committed bars) */}
          {!outOfInk && draft.trim() && rhymeGroups.length > 0 && (
            <p className="font-code text-[11px] text-muted-foreground/80 pt-1 pl-7">
              Pulse preview:{' '}
              <span className="text-foreground/90">
                <HighlightedText text={draft.trim()} rhymeGroups={rhymeGroups} />
              </span>
            </p>
          )}
        </div>

        {pulseLines.length > 0 && (
          <div className="px-4 sm:px-6 py-2.5 border-t border-white/[0.06] bg-sky-500/[0.035] flex items-center gap-2">
            <Waves className={cn('h-3.5 w-3.5', pulseConnectionCount > 0 ? 'text-sky-300' : 'text-muted-foreground')} />
            <p className="text-[9px] font-code font-bold uppercase tracking-[0.22em] text-muted-foreground">
              Rhyme Pulse ·{' '}
              <span className={pulseConnectionCount > 0 ? 'text-sky-300' : 'text-muted-foreground/70'}>
                {pulseConnectionCount > 0
                  ? `${pulseConnectionCount} rhyme group${pulseConnectionCount === 1 ? '' : 's'} · your bars + assists`
                  : 'listening as you write'}
              </span>
            </p>
          </div>
        )}

        {showIntents && (
          <div className="px-4 sm:px-6 py-3.5 border-t border-sky-500/20 bg-sky-500/[0.05] space-y-3">
            <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
              <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-sky-300">Intents · Motifs</p>
              <p className="text-[9px] font-code text-muted-foreground">
                ✓ use it in the bar · ↗ make the bar end with it
              </p>
            </div>

            {motifs.length > 0 && (
              <div className="space-y-2">
                {motifs.map((motif) => {
                  const isLocked = endWith === motif;
                  const isChecked = checkedMotifs.includes(motif) || isLocked;
                  return (
                    <div
                      key={motif}
                      className={cn(coWriterIntentRowClass(true, isLocked, isChecked), 'flex-col items-stretch gap-2')}
                    >
                      <div className="flex items-start gap-2 w-full min-w-0">
                        <Checkbox
                          checked={isChecked}
                          onCheckedChange={(c) => handleMotifCheck(motif, !!c)}
                          className="border-sky-500 data-[state=checked]:bg-sky-500 shrink-0 mt-0.5 self-center"
                        />
                        <span
                          className={cn(
                            'text-xs font-code min-w-0 whitespace-normal break-words leading-snug flex-1',
                            isLocked ? 'text-sky-300 font-bold' : isChecked ? 'text-foreground/90' : 'text-foreground/85'
                          )}
                        >
                          {motif}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 justify-end w-full pl-6">
                        {isLocked && (
                          <span className="mr-auto text-[9px] font-bold uppercase tracking-[0.2em] text-sky-400 whitespace-nowrap">
                            End in
                          </span>
                        )}
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className={cn(
                            'h-7 w-7 transition-colors',
                            isLocked ? 'text-sky-400' : 'text-sky-400/40 hover:text-sky-400 hover:bg-sky-500/10'
                          )}
                          onClick={() => handlePrecisionLock(motif)}
                          aria-label={isLocked ? 'Release Precision Lock' : 'Precision Lock'}
                          title={
                            isLocked
                              ? 'Release Precision Lock — synthesizer no longer forced to end on this motif'
                              : 'Precision Lock — force the next suggestion to end on this motif'
                          }
                        >
                          <ArrowUpRight className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-red-500/40 hover:text-red-500 hover:bg-red-500/10"
                          onClick={() => handleDeleteMotif(motif)}
                          aria-label="Delete motif"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="flex items-center gap-2">
              <input
                value={newMotif}
                onChange={(e) => setNewMotif(e.target.value.slice(0, MAX_MOTIF))}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddMotif();
                  }
                }}
                maxLength={MAX_MOTIF}
                placeholder="Exact word or phrase… e.g. my city"
                className="flex-1 h-9 rounded-md border border-sky-500/20 bg-black/40 px-3 font-code text-xs text-foreground outline-none placeholder:text-muted-foreground/40 focus:border-sky-400"
              />
              <Button
                type="button"
                size="sm"
                className="h-9 px-3 bg-sky-600 hover:bg-sky-700"
                onClick={handleAddMotif}
                aria-label="Add motif"
              >
                <PlusCircle className="h-4 w-4" />
              </Button>
            </div>

            {endWith && (
              <p className="text-[9px] font-code text-sky-300/90">
                Precision Lock active — next Continue must End With “{endWith}”
              </p>
            )}
          </div>
        )}

        <AnimatePresence>
          {options && options.length > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="border-t border-primary/20 bg-primary/[0.04]"
            >
              <p className="px-4 sm:px-6 pt-3 text-[10px] font-code font-bold uppercase tracking-[0.25em] text-primary">
                {activeLock
                  ? `End With “${activeLock}” · both options locked`
                  : 'Two ways your rhyme could move'}
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 sm:px-6">
                {options.map((opt, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => acceptOption(opt)}
                    className="text-left rounded-xl border border-primary/30 bg-black/40 hover:bg-primary/10 hover:border-primary/60 transition-all p-3 group"
                  >
                    <p className="text-[9px] font-code font-bold uppercase tracking-widest text-primary/70 mb-1">
                      Opt {i + 1} · {opt.syllables} syll
                      {activeLock ? ' · locked' : ''}
                    </p>
                    <p className="font-code text-sm text-foreground/95 leading-snug group-hover:text-white">
                      {activeLock ? highlightLockedEnding(opt.line, activeLock) : (
                        <HighlightedText text={opt.line} rhymeGroups={buildRhymeGroups([...lines, opt.line])} />
                      )}
                    </p>
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="px-4 sm:px-6 py-4 border-t border-white/[0.07] bg-white/[0.02]">
          {outOfInk ? (
            <div className="flex flex-col sm:flex-row items-center gap-3">
              <p className="text-xs font-code text-muted-foreground flex items-center gap-2 flex-1">
                <Lock className="h-3.5 w-3.5 text-primary shrink-0" />
                {gateMessage} Your bars come with you.
              </p>
              <Button onClick={goSignup} className="font-bold uppercase text-xs tracking-widest px-6 shrink-0 w-full sm:w-auto">
                Keep this track free — {SIGNUP_INK} Ink <ArrowRight className="ml-1.5 h-4 w-4" />
              </Button>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row items-center gap-3">
              <Button
                onClick={generate}
                disabled={loading}
                className="font-bold uppercase text-xs tracking-widest px-6 w-full sm:w-auto bg-primary hover:bg-primary/90 shadow-[0_0_25px_rgba(59,130,246,0.35)]"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <RotateCcw className="h-4 w-4 animate-spin" /> Listening...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    {endWith ? <Lock className="h-4 w-4" /> : <Waves className="h-4 w-4" />}
                    {endWith ? 'Continue · End With Locked' : 'Continue My Rhyme'}
                  </span>
                )}
              </Button>
              {error && <p className="text-xs font-code text-red-400">{error}</p>}
              {!error && lines.length > 0 && (
                <button
                  type="button"
                  onClick={goSignup}
                  className={cn(
                    'text-[10px] font-code font-bold uppercase tracking-widest',
                    'text-muted-foreground hover:text-primary transition-colors'
                  )}
                >
                  Save this track — sign up free
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
