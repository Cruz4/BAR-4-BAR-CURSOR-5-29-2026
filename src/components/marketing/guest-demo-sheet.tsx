'use client';

/**
 * Guest demo sheet — the first thing anonymous visitors see on bar4bar.ink.
 * Write a bar, get two AI options that rhyme with it, no account needed.
 * Server enforces all limits (/api/ai/demo); lines carry into the first
 * real track after signup via demo-session.ts.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, ArrowRight, PenLine, RotateCcw, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { persistDemoLines } from '@/lib/demo-session';
import { buildLandingSignupUrl } from '@/lib/login-links';
import { SIGNUP_INK } from '@/lib/subscription';

type DemoOption = { line: string; syllables: number; rhymeKey: string };

const MAX_SHEET_LINES = 8;

export function GuestDemoSheet() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [lines, setLines] = useState<string[]>([]);
  const [draft, setDraft] = useState('');
  const [options, setOptions] = useState<DemoOption[] | null>(null);
  const [remaining, setRemaining] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [gateMessage, setGateMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

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

  const commitDraft = useCallback((): string[] => {
    const text = draft.trim();
    if (!text) return lines;
    const next = [...lines, text].slice(-MAX_SHEET_LINES);
    setLines(next);
    setDraft('');
    return next;
  }, [draft, lines]);

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
    try {
      const res = await fetch('/api/ai/demo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lines: sheet }),
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
      if (typeof data.remaining === 'number') setRemaining(data.remaining);
    } catch {
      setError('Connection hiccup — try again.');
    } finally {
      setLoading(false);
    }
  }, [loading, gateMessage, commitDraft]);

  const acceptOption = useCallback(
    (opt: DemoOption) => {
      setLines((prev) => [...prev, opt.line].slice(-MAX_SHEET_LINES));
      setOptions(null);
      if (remaining !== null && remaining <= 0) {
        setGateMessage('That was your last free demo bar on this device.');
      } else {
        inputRef.current?.focus();
      }
    },
    [remaining]
  );

  const outOfInk = gateMessage !== null;

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div className="rounded-2xl border border-primary/25 bg-black/55 backdrop-blur-xl shadow-[0_25px_80px_rgba(0,0,0,0.6)] overflow-hidden">
        <div className="flex items-center justify-between px-4 sm:px-5 py-3 border-b border-white/[0.07] bg-white/[0.02]">
          <p className="text-[10px] font-code font-bold uppercase tracking-[0.25em] text-emerald-300 flex items-center gap-2">
            <PenLine className="h-3.5 w-3.5" /> Live demo sheet — no account needed
          </p>
          {remaining !== null && !outOfInk && (
            <p className="text-[10px] font-code font-bold uppercase tracking-widest text-muted-foreground">
              {remaining} free {remaining === 1 ? 'generation' : 'generations'} left
            </p>
          )}
        </div>

        <div className="px-4 sm:px-6 py-5 space-y-1 min-h-[120px]">
          {lines.length === 0 && (
            <p className="text-xs font-code text-muted-foreground/70 italic pb-2">
              Type one bar about anything — your city, your grind, last night — then hit Generate Next.
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
                {line}
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
                    if (draft.trim() && lines.length === 0) generate();
                    else commitDraft();
                  }
                }}
                maxLength={200}
                placeholder={lines.length === 0 ? 'e.g. Been counting these losses like blessings in disguise...' : 'Add another bar (optional)...'}
                className="flex-1 bg-transparent border-none outline-none font-code text-sm sm:text-base text-foreground placeholder:text-muted-foreground/40 caret-primary"
              />
            </div>
          )}
        </div>

        <AnimatePresence>
          {options && options.length > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="border-t border-primary/20 bg-primary/[0.04]"
            >
              <p className="px-4 sm:px-6 pt-3 text-[10px] font-code font-bold uppercase tracking-[0.25em] text-primary">
                AI heard you — pick a bar
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
                    </p>
                    <p className="font-code text-sm text-foreground/95 leading-snug group-hover:text-white">
                      {opt.line}
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
                  <span className="flex items-center gap-2"><RotateCcw className="h-4 w-4 animate-spin" /> Writing...</span>
                ) : (
                  <span className="flex items-center gap-2"><Sparkles className="h-4 w-4" /> Generate Next</span>
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
