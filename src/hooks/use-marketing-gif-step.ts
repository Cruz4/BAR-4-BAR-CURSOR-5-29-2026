'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';

/** Live loop for preview; frozen steps when `?capture=1` (Playwright drives via custom event). */
export function useMarketingGifStep(totalSteps: number, intervalMs: number) {
  const searchParams = useSearchParams();
  const captureMode = searchParams.get('capture') === '1';
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (captureMode) {
      const onSet = (event: Event) => {
        const detail = (event as CustomEvent<number>).detail;
        if (typeof detail === 'number') setStep(detail);
      };
      window.addEventListener('marketing-gif-set-step', onSet);
      return () => window.removeEventListener('marketing-gif-set-step', onSet);
    }

    const id = setInterval(() => {
      setStep((s) => (s + 1) % totalSteps);
    }, intervalMs);
    return () => clearInterval(id);
  }, [captureMode, totalSteps, intervalMs]);

  return step;
}
