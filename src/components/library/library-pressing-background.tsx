'use client';

import { useEffect, useRef } from 'react';
import { LivingPressField } from '@/components/profile/living-press-field';
import { DeckAuroraBackground } from '@/components/studio-page-background';
import { MUSICAL_EQ_BANDS, measureSpectrumBand, smoothSpectrumLevel } from '@/lib/audio-spectrum';
import type { PressingConfig } from '@/lib/profile/pressing';

export function LibraryPressingBackground({
  pressing,
  analyser,
  playing,
}: {
  pressing?: PressingConfig | null;
  analyser: AnalyserNode | null;
  playing: boolean;
}) {
  const reactiveRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const layer = reactiveRef.current;
    if (!layer) return;

    let frame = 0;
    let levels = [0.05, 0.05, 0.05, 0.05];
    const bins = analyser ? new Uint8Array(analyser.frequencyBinCount) : null;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const render = () => {
      if (playing && analyser && bins && !reducedMotion) {
        analyser.getByteFrequencyData(bins);
        levels = levels.map((current, index) =>
          smoothSpectrumLevel(current, measureSpectrumBand(analyser, bins, MUSICAL_EQ_BANDS[index]))
        );
      } else {
        levels = levels.map((current) => smoothSpectrumLevel(current, 0.05));
      }

      const low = levels[0];
      const middle = (levels[1] + levels[2]) / 2;
      const high = levels[3];
      const energy = (low + middle * 2 + high) / 4;
      layer.style.setProperty('--library-low', low.toFixed(3));
      layer.style.setProperty('--library-mid', middle.toFixed(3));
      layer.style.setProperty('--library-high', high.toFixed(3));
      layer.style.setProperty('--library-energy', energy.toFixed(3));

      if (playing && !reducedMotion) frame = window.requestAnimationFrame(render);
    };

    render();
    return () => window.cancelAnimationFrame(frame);
  }, [analyser, playing]);

  return (
    <>
      {pressing ? <LivingPressField config={pressing} /> : <DeckAuroraBackground />}
      <div
        ref={reactiveRef}
        className="pointer-events-none fixed inset-0 z-0 overflow-hidden motion-reduce:hidden"
        aria-hidden
      >
        <div
          className="absolute -inset-[8%] transition-opacity duration-300"
          style={{
            opacity: 'calc(0.06 + var(--library-energy, .05) * .24)',
            transform: 'scale(calc(1 + var(--library-low, .05) * .025))',
            background:
              'radial-gradient(circle at 24% 68%, var(--ph-accent, #e879f9), transparent 34%), radial-gradient(circle at 76% 28%, var(--ph-accent2, #22d3ee), transparent 38%)',
            filter: 'blur(34px)',
          }}
        />
        <div
          className="absolute inset-x-0 bottom-0 h-[42%] origin-bottom transition-opacity duration-300"
          style={{
            opacity: 'calc(0.025 + var(--library-mid, .05) * .12)',
            transform: 'scaleY(calc(.9 + var(--library-high, .05) * .14))',
            background:
              'linear-gradient(to top, var(--ph-accent-soft, rgba(232,121,249,.12)), transparent 72%)',
          }}
        />
      </div>
    </>
  );
}
