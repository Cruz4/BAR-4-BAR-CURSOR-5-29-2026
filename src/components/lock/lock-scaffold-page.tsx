'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { isLockEnabled, LOCK_HOUSE_ID } from '@/lib/lock-feature';

const HOUSE_SEED =
  'I was talking to the moon before it knew my name…';

type LockScaffoldPageProps = {
  lockId: string;
};

/**
 * LOCK scaffold shell — UI only. No Firestore, no audio, LOCK IT is a no-op.
 */
export function LockScaffoldPage({ lockId }: LockScaffoldPageProps) {
  const router = useRouter();
  const enabled = isLockEnabled();
  const [bar, setBar] = useState('');
  const [tapped, setTapped] = useState(false);

  useEffect(() => {
    if (!enabled) {
      router.replace('/');
    }
  }, [enabled, router]);

  if (!enabled) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-muted-foreground font-code text-sm">
        Redirecting…
      </div>
    );
  }

  const label = lockId === LOCK_HOUSE_ID || lockId === 'house' ? 'HOUSE LOCK' : `LOCK · ${lockId}`;

  return (
    <div className="min-h-screen bg-background text-foreground font-code selection:bg-primary/30">
      <header className="sticky top-0 z-50 border-b border-border/60 bg-background/80 backdrop-blur-md px-4 py-3 flex items-center justify-between gap-3">
        <Link
          href="/"
          className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground hover:text-foreground"
        >
          bar4bar
        </Link>
        <span className="text-[9px] uppercase tracking-[0.2em] font-bold text-primary/90">{label}</span>
        <div className="flex items-center gap-2">
          <Button asChild variant="ghost" size="sm" className="h-7 px-2 text-[9px] uppercase font-bold">
            <Link href="/welcome">About</Link>
          </Button>
          <Button asChild variant="ghost" size="sm" className="h-7 px-2 text-[9px] uppercase font-bold">
            <Link href="/try">Full sheet</Link>
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-lg px-4 py-10 sm:py-14 space-y-8">
        <div className="space-y-2">
          <p className="text-[10px] uppercase tracking-[0.25em] font-bold text-muted-foreground">
            Scaffold · flag on
          </p>
          <h1 className="font-headline text-3xl sm:text-4xl tracking-tight">Open LOCK</h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Finish the bar. No account required to type. Scoring, bloodline, and picks come later.
          </p>
        </div>

        <section className="space-y-3">
          <p className="text-[10px] uppercase tracking-widest font-bold text-primary">Started this</p>
          <blockquote className="border-l-2 border-primary/50 pl-4 text-lg sm:text-xl leading-snug font-medium">
            “{HOUSE_SEED}”
          </blockquote>
        </section>

        <section className="space-y-3">
          <label htmlFor="lock-bar" className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground">
            Your turn
          </label>
          <Textarea
            id="lock-bar"
            value={bar}
            onChange={(e) => setBar(e.target.value)}
            placeholder="Type one bar…"
            rows={3}
            className="resize-none text-base leading-relaxed"
          />
          <Button
            type="button"
            className="w-full h-11 font-bold uppercase tracking-wide"
            disabled={!bar.trim()}
            onClick={() => setTapped(true)}
          >
            Lock it
          </Button>
          {tapped && (
            <p className="text-[11px] text-amber-200/90 leading-snug">
              Scaffold only — nothing is saved yet. Turn the flag off anytime with{' '}
              <code className="text-amber-100">NEXT_PUBLIC_LOCK=0</code>.
            </p>
          )}
        </section>

        <p className="text-[10px] text-muted-foreground leading-relaxed border-t border-border/50 pt-6">
          No ownership by submitting. Display only until Artist Pick / clear-for-release (not built yet).
          No music gen. No audio stored on Bar 4 Bar.
        </p>
      </main>
    </div>
  );
}
