'use client';

import React from 'react';
import { Droplets, Smartphone, Sparkles } from 'lucide-react';
import { getTrialDurationLabel } from '@/lib/trial';

export function SocialProofBar() {
  const stats = [
    { icon: Droplets, label: '300 free Ink on signup' },
    { icon: Sparkles, label: `${getTrialDurationLabel()} Pro trial included` },
    { icon: Smartphone, label: 'Install to home screen — no app store' },
  ] as const;

  return (
    <section className="py-6 px-4 relative z-10">
      <div className="container mx-auto max-w-5xl">
        <p className="text-center text-xs font-bold uppercase tracking-[0.35em] text-muted-foreground/80 mb-7">
          Built for writers who show up bar after bar
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-8 sm:gap-14">
          {stats.map(({ icon: Icon, label }) => (
            <div key={label} className="flex items-center gap-2.5 text-[11px] font-code text-muted-foreground/90">
              <Icon className="h-4 w-4 text-primary/80 shrink-0" />
              <span>{label}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
