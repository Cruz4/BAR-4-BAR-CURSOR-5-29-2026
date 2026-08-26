'use client';

import React from 'react';
import { MARKETING_HOW_IT_WORKS, MARKETING_MEDIA_ASPECT } from '@/lib/marketing-features';
import { useFirstDropsFeature } from '@/hooks/use-first-drops-feature';

export function HowItWorksSection() {
  const { enabled: firstDropsOn } = useFirstDropsFeature();
  return (
    <section id="how-it-works" className="py-20 px-4 relative z-10">
      <div className="container mx-auto max-w-5xl">
        <div className="text-center mb-14">
          <p className="text-[10px] font-bold uppercase tracking-[0.42em] text-primary/90 mb-3">How it works</p>
          <h3 className="font-headline text-3xl md:text-4xl font-bold uppercase tracking-tight leading-[0.95]">
            Three Moves. One Bar Closer.
          </h3>
        </div>

        <div className="space-y-16">
          {MARKETING_HOW_IT_WORKS.map((item) => (
            <article
              key={item.step}
              className="rounded-2xl overflow-hidden border border-white/[0.06] bg-white/[0.02] backdrop-blur-md"
            >
              <div className="p-3 sm:p-4">
                <div
                  className="relative w-full rounded-xl overflow-hidden bg-black/25"
                  style={{ aspectRatio: String(MARKETING_MEDIA_ASPECT) }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={item.media}
                    alt={item.title}
                    className="absolute inset-0 w-full h-full object-contain object-center block"
                    loading="lazy"
                    decoding="async"
                  />
                </div>
              </div>
              <div className="px-6 sm:px-8 pb-8 pt-2 space-y-2 max-w-2xl">
                <p className="text-sm font-bold text-primary uppercase tracking-widest">{item.step}</p>
                <h4 className="font-headline text-2xl font-bold uppercase">{item.title}</h4>
                <p className="font-code text-sm md:text-base text-muted-foreground leading-relaxed">
                  {firstDropsOn ? item.body : item.body.replace(/, sell a release/, '')}
                </p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
