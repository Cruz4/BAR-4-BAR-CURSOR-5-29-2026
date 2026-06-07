'use client';

import React from 'react';
import { Check } from 'lucide-react';
import { MARKETING_COMPARISON } from '@/lib/marketing-features';

export function ComparisonTable() {
  const { otherLabel, b4bLabel, rows } = MARKETING_COMPARISON;

  return (
    <section className="py-16 px-4 relative z-10">
      <div className="container mx-auto max-w-3xl">
        <h3 className="font-headline text-2xl md:text-3xl font-bold uppercase text-center mb-8 tracking-tight">
          Other AI vs. Bar 4 Bar
        </h3>
        <div className="rounded-2xl overflow-hidden font-code text-sm border border-white/[0.06] bg-white/[0.02] backdrop-blur-md">
          <div className="grid grid-cols-2 border-b border-white/[0.05]">
            <div className="p-4 text-muted-foreground font-bold uppercase text-[10px] tracking-widest">{otherLabel}</div>
            <div className="p-4 text-primary font-bold uppercase text-[10px] tracking-widest">{b4bLabel}</div>
          </div>
          {rows.map(([other, b4b]) => (
            <div key={other} className="grid grid-cols-2 border-b border-white/[0.04] last:border-b-0">
              <div className="p-4 text-muted-foreground/85 text-[12px] leading-relaxed">{other}</div>
              <div className="p-4 flex items-start gap-2 text-[12px] leading-relaxed">
                <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                <span>{b4b}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
