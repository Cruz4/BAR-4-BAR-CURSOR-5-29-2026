'use client';

import React from 'react';
import Link from 'next/link';
import { X } from 'lucide-react';

export type FoldSlip = {
  id: string;
  foldId: string;
  name: string;
  text: string;
};

export function FoldLiveSlip({
  slip,
  onDismiss,
}: {
  slip: FoldSlip;
  onDismiss: () => void;
}) {
  return (
    <div className="fixed right-3 top-16 z-[80] w-[min(20rem,calc(100vw-1.5rem))] sm:right-5">
      <div className="relative overflow-hidden border border-amber-400/40 bg-[#16110c] shadow-[0_18px_40px_rgba(0,0,0,0.45),0_0_24px_rgba(251,191,36,0.18)] animate-in fade-in slide-in-from-right-4 duration-300">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-y-2 left-1/2 w-px bg-gradient-to-b from-transparent via-amber-200/30 to-transparent"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -right-5 -top-6 h-12 w-12 rotate-45 border-l border-amber-200/25 bg-amber-100/[0.06]"
        />
        <Link href={`/folds/${slip.foldId}`} onClick={onDismiss} className="block px-4 py-3 pr-9">
          <p className="font-code text-[9px] font-bold uppercase tracking-[0.28em] text-amber-300/80">
            Wet ink
          </p>
          <p className="mt-1 truncate font-headline text-base uppercase tracking-tight text-amber-50">
            {slip.name}
          </p>
          <p className="mt-1 line-clamp-2 font-serif text-sm leading-relaxed text-amber-50/80">
            {slip.text}
          </p>
        </Link>
        <button
          type="button"
          onClick={onDismiss}
          className="absolute right-1.5 top-1.5 p-1 text-amber-100/50 hover:text-amber-50"
          aria-label="Dismiss"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
