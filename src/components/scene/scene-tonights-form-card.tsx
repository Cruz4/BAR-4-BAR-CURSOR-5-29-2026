'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Archive, Moon, PenLine } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/hooks/use-auth';
import { useGamification } from '@/context/gamification-context';
import { useTonightsForm } from '@/hooks/use-tonights-form';
import { useToast } from '@/hooks/use-toast';
import { profileHref } from '@/lib/profile/profile-slug';
import {
  TONIGHTS_FORM_MAX_BAR_CHARS,
  TONIGHTS_FORM_SLOT_COUNT,
  type TonightsFormSlot,
} from '@/lib/tonights-form';
import { cn } from '@/lib/utils';

function SlotRow({
  slotNumber,
  slot,
  highlight,
}: {
  slotNumber: number;
  slot: TonightsFormSlot | null;
  highlight?: boolean;
}) {
  if (!slot) {
    return (
      <div className="flex gap-3 rounded-lg border border-dashed border-white/15 bg-black/20 px-3 py-2.5 text-sm text-muted-foreground">
        <span className="font-code text-[11px] font-bold tabular-nums text-indigo-300/80 w-6 shrink-0">
          {slotNumber}
        </span>
        <span className="italic">Empty seat</span>
      </div>
    );
  }

  const href = slot.profileSlug ? profileHref(slot.profileSlug) : undefined;

  return (
    <div
      className={cn(
        'flex gap-3 rounded-lg border px-3 py-2.5 text-sm',
        highlight
          ? 'border-indigo-400/50 bg-indigo-500/10'
          : 'border-white/10 bg-black/25'
      )}
    >
      <span className="font-code text-[11px] font-bold tabular-nums text-indigo-300/90 w-6 shrink-0">
        {slotNumber}
      </span>
      <div className="min-w-0 flex-1">
        {href ? (
          <Link href={href} className="font-bold text-indigo-200 hover:underline">
            {slot.displayName}
          </Link>
        ) : (
          <span className="font-bold text-indigo-200">{slot.displayName}</span>
        )}
        <p className="mt-0.5 font-code text-[13px] leading-snug text-white/90">&ldquo;{slot.barText}&rdquo;</p>
      </div>
    </div>
  );
}

export function SceneTonightsFormCard({ className }: { className?: string }) {
  const { user } = useAuth();
  const { summary } = useGamification();
  const { toast } = useToast();
  const userId = user?.id;
  const { form, loading, reload, on } = useTonightsForm(userId);
  const [claimSlot, setClaimSlot] = useState<number | null>(null);
  const [barText, setBarText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const displayName = user?.displayName || 'Artist';
  const profileSlug = summary.profileSlug;

  const statusLine = useMemo(() => {
    if (!form) return '';
    if (form.active) return `${form.filledCount} / ${TONIGHTS_FORM_SLOT_COUNT} seats · open until sunrise`;
    if (form.frozen) return `${form.filledCount} / ${TONIGHTS_FORM_SLOT_COUNT} seats · frozen`;
    return `Opens 6 PM Eastern`;
  }, [form]);

  if (loading || !on || !form) return null;

  const canClaim = Boolean(form.active && userId && !form.yourSlot);

  const handleClaim = async () => {
    if (!userId || !claimSlot) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/tonights-form/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          displayName,
          profileSlug,
          slot: claimSlot,
          barText,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Could not claim seat');
      toast({ title: `Seat ${claimSlot} is yours`, description: 'Your bar is on Tonight\'s Form.' });
      setClaimSlot(null);
      setBarText('');
      await reload();
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Could not claim seat',
        description: error instanceof Error ? error.message : 'Try again.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Card
        className={cn(
          'relative overflow-hidden border border-indigo-500/35 bg-gradient-to-br from-indigo-500/10 via-card/90 to-card/70 p-4 sm:p-5',
          className
        )}
      >
        <p className="flex items-center gap-2 font-code text-[9px] font-bold uppercase tracking-[0.28em] text-indigo-300">
          <Moon className="h-3.5 w-3.5" />
          Tonight&apos;s Form
        </p>
        <h2 className="mt-1.5 font-headline text-lg font-bold uppercase tracking-tight">{form.label}</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {form.active
            ? 'Claim one seat. Write one bar. The city fills the form before sunrise.'
            : form.frozen
              ? 'Last night\'s form — frozen at sunrise. A new form opens at 6 PM Eastern.'
              : 'Returns at 6 PM Eastern.'}
        </p>
        <p className="mt-2 font-code text-[10px] uppercase tracking-wider text-indigo-200/80">{statusLine}</p>

        <div className="mt-3 max-h-[min(52vh,28rem)] space-y-2 overflow-y-auto pr-1">
          {form.slots.map((slot, index) => {
            const slotNumber = index + 1;
            const taken = Boolean(slot);
            const isYours = form.yourSlot === slotNumber;
            return (
              <div key={slotNumber} className="relative">
                <SlotRow slotNumber={slotNumber} slot={slot} highlight={isYours} />
                {canClaim && !taken ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="absolute right-1 top-1 h-7 px-2 text-[10px] font-bold uppercase tracking-wider text-indigo-200"
                    onClick={() => {
                      setClaimSlot(slotNumber);
                      setBarText('');
                    }}
                  >
                    <PenLine className="mr-1 h-3 w-3" />
                    Claim
                  </Button>
                ) : null}
              </div>
            );
          })}
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          {!userId && form.active ? (
            <Button asChild size="sm" className="h-8 font-bold uppercase tracking-wider">
              <Link href="/login">Sign in to claim a seat</Link>
            </Button>
          ) : null}
          {form.yourSlot ? (
            <span className="inline-flex items-center rounded-md border border-indigo-400/40 bg-indigo-500/10 px-2.5 py-1 font-code text-[10px] font-bold uppercase tracking-wider text-indigo-200">
              Your seat: {form.yourSlot}
            </span>
          ) : null}
          <Button asChild size="sm" variant="ghost" className="h-8 font-bold uppercase tracking-wider">
            <Link href={`/form/${form.nightKey}`}>
              <Archive className="mr-1.5 h-3.5 w-3.5" />
              Open full page
            </Link>
          </Button>
          <Button asChild size="sm" variant="ghost" className="h-8 font-bold uppercase tracking-wider">
            <Link href="/form">Past forms</Link>
          </Button>
        </div>
      </Card>

      <Dialog open={claimSlot !== null} onOpenChange={(open) => !open && setClaimSlot(null)}>
        <DialogContent className="border-indigo-500/30 bg-[hsl(216_35%_7%)] text-white sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-headline uppercase">Seat {claimSlot}</DialogTitle>
            <DialogDescription>
              One bar for the city tonight. This does not create a Vault track — it lives on the Form.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={barText}
            onChange={(e) => setBarText(e.target.value)}
            maxLength={TONIGHTS_FORM_MAX_BAR_CHARS}
            rows={4}
            placeholder="Write your bar…"
            className="font-code text-sm"
            autoFocus
          />
          <p className="text-[10px] text-muted-foreground font-code">
            {barText.trim().length} / {TONIGHTS_FORM_MAX_BAR_CHARS}
          </p>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setClaimSlot(null)} disabled={submitting}>
              Cancel
            </Button>
            <Button onClick={() => void handleClaim()} disabled={submitting || barText.trim().length < 4}>
              {submitting ? 'Posting…' : 'Post bar & claim seat'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
