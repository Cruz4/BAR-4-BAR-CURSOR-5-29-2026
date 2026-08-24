'use client';

import React from 'react';
import { Globe, Droplets, Smartphone } from 'lucide-react';
import { getSignupInkMarketingLine } from '@/lib/studio-tiers';

export function SocialProofBar() {
  const stats = [
    { icon: Globe, label: 'Free music home — Artist, creator, or Music Fan' },
    { icon: Droplets, label: getSignupInkMarketingLine('social') },
    { icon: Smartphone, label: 'Install to home screen — no app store' },
  ] as const;

  return (
    <section className="py-6 px-4 relative z-10">
      <div className="container mx-auto max-w-5xl">
        <p className="text-center text-xs font-bold uppercase tracking-[0.35em] text-muted-foreground/80 mb-7">
          Built for people who make, discover, and support music
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
