'use client';

import Link from 'next/link';
import { Moon } from 'lucide-react';
import { profileHref } from '@/lib/profile/profile-slug';
import {
  TONIGHTS_FORM_SLOT_COUNT,
  type TonightsFormPublic,
  type TonightsFormSlot,
} from '@/lib/tonights-form';
import { cn } from '@/lib/utils';

function SlotBlock({
  slotNumber,
  slot,
}: {
  slotNumber: number;
  slot: TonightsFormSlot | null;
}) {
  if (!slot) {
    return (
      <li className="rounded-xl border border-dashed border-white/12 bg-black/20 px-4 py-3">
        <span className="font-code text-[11px] font-bold text-indigo-300/70">{slotNumber}.</span>
        <span className="ml-2 text-sm italic text-muted-foreground">Empty</span>
      </li>
    );
  }
  const href = slot.profileSlug ? profileHref(slot.profileSlug) : undefined;
  return (
    <li className="rounded-xl border border-white/10 bg-black/30 px-4 py-3">
      <div className="flex items-baseline gap-2">
        <span className="font-code text-[11px] font-bold text-indigo-300">{slotNumber}.</span>
        {href ? (
          <Link href={href} className="text-sm font-bold text-indigo-200 hover:underline">
            {slot.displayName}
          </Link>
        ) : (
          <span className="text-sm font-bold text-indigo-200">{slot.displayName}</span>
        )}
      </div>
      <p className="mt-1.5 font-code text-[15px] leading-relaxed text-white/90">&ldquo;{slot.barText}&rdquo;</p>
    </li>
  );
}

export function TonightsFormSheet({
  form,
  className,
}: {
  form: TonightsFormPublic;
  className?: string;
}) {
  return (
    <div className={cn('space-y-4', className)}>
      <div>
        <p className="flex items-center gap-2 font-code text-[10px] font-bold uppercase tracking-[0.28em] text-indigo-300">
          <Moon className="h-3.5 w-3.5" />
          Tonight&apos;s Form
        </p>
        <h1 className="mt-2 font-headline text-2xl font-bold uppercase tracking-tight sm:text-3xl">
          {form.label}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {form.filledCount} / {TONIGHTS_FORM_SLOT_COUNT} seats
          {form.frozen ? ' · frozen at sunrise' : form.active ? ' · open tonight' : ''}
        </p>
      </div>
      <ol className="space-y-2">
        {form.slots.map((slot, index) => (
          <SlotBlock key={index + 1} slotNumber={index + 1} slot={slot} />
        ))}
      </ol>
    </div>
  );
}
