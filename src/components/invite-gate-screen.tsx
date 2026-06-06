'use client';

import React, { useState } from 'react';
import { KeyRound, Sparkles, Lock, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import type { InviteGateCopy } from '@/lib/invite-gate';
import { DEFAULT_INVITE_GATE_COPY } from '@/lib/invite-gate';
import { persistInviteGateUnlock } from '@/lib/invite-gate-client';

type InviteGateScreenProps = {
  copy?: Partial<InviteGateCopy>;
  onUnlocked: (version: number) => void;
};

export function InviteGateScreen({ copy: copyPartial, onUnlocked }: InviteGateScreenProps) {
  const copy = { ...DEFAULT_INVITE_GATE_COPY, ...copyPartial };
  const [code, setCode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch('/api/invite-gate/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ code }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok || !body.ok) {
        setError(body.error || 'Invalid access code.');
        return;
      }

      const version = Number(body.version) || 1;
      persistInviteGateUnlock(version);
      setSuccess(true);
      onUnlocked(version);
    } catch {
      setError('Network error — try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center overflow-hidden bg-[#030712]">
      <div
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          background:
            'radial-gradient(ellipse 80% 60% at 50% 0%, rgba(59,130,246,0.35) 0%, transparent 55%), radial-gradient(ellipse 60% 50% at 80% 100%, rgba(245,158,11,0.2) 0%, transparent 50%)',
        }}
      />
      <div className="pointer-events-none absolute inset-0 bg-[url('/Logo.png')] bg-center bg-no-repeat opacity-[0.03] bg-[length:min(480px,80vw)]" />

      <div className="relative z-10 mx-auto w-full max-w-lg px-6 py-10 animate-in fade-in zoom-in-95 duration-700">
        <div className="mb-8 flex flex-col items-center text-center">
          <div
            className={cn(
              'mb-6 flex h-16 w-16 items-center justify-center rounded-2xl border-2 shadow-[0_0_40px_rgba(59,130,246,0.25)] transition-all duration-700',
              success
                ? 'border-amber-400/60 bg-amber-500/10 shadow-[0_0_50px_rgba(245,158,11,0.35)]'
                : 'border-primary/40 bg-primary/10'
            )}
          >
            {success ? (
              <Sparkles className="h-8 w-8 text-amber-400 animate-pulse" />
            ) : (
              <Lock className="h-8 w-8 text-primary" />
            )}
          </div>

          <p className="text-[10px] font-code uppercase tracking-[0.35em] text-primary/80 mb-3">
            Bar 4 Bar Studio · Private Beta
          </p>

          <h1 className="font-headline text-3xl sm:text-4xl font-bold uppercase tracking-tight text-white leading-tight">
            {success ? copy.successHeadline : copy.headline}
          </h1>
          <p className="mt-4 text-sm sm:text-base text-muted-foreground leading-relaxed max-w-md">
            {success ? copy.successSubheadline : copy.subheadline}
          </p>
        </div>

        {!success && (
          <form
            onSubmit={handleSubmit}
            className="space-y-4 rounded-2xl border border-white/10 bg-black/50 p-6 shadow-2xl backdrop-blur-md"
          >
            <label className="block space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                <KeyRound className="h-3.5 w-3.5 text-primary" />
                Access code
              </span>
              <Input
                type="password"
                autoComplete="off"
                placeholder="Enter invite code"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="h-12 font-code text-center text-lg tracking-[0.2em] uppercase bg-background/60 border-primary/30 focus-visible:ring-primary"
                disabled={submitting}
              />
            </label>

            {error && (
              <p className="text-center text-xs text-destructive font-medium animate-in fade-in">{error}</p>
            )}

            <Button
              type="submit"
              disabled={submitting || !code.trim()}
              className="w-full h-12 text-sm font-bold uppercase tracking-[0.2em] shadow-[0_0_30px_rgba(59,130,246,0.35)]"
            >
              {submitting ? 'Checking…' : copy.ctaLabel}
              {!submitting && <ChevronRight className="ml-2 h-4 w-4" />}
            </Button>

            <p className="text-center text-[10px] text-muted-foreground/80 uppercase tracking-wider">
              Invite-only for now · Public launch soon
            </p>
          </form>
        )}

        {success && (
          <p className="text-center text-xs font-code uppercase tracking-[0.25em] text-amber-400/90 animate-pulse">
            Opening the vault…
          </p>
        )}
      </div>
    </div>
  );
}
