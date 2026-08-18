'use client';

import { CloudRain } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSceneSky } from '@/hooks/use-scene-sky';
import { sceneWeatherChipLabel } from '@/lib/scene/scene-sky';

export function SceneWeatherChip({ className }: { className?: string }) {
  const { phase, weather, hasWeather, city, ready } = useSceneSky();
  const label = sceneWeatherChipLabel(weather, phase);

  return (
    <p
      className={cn(
        'inline-flex max-w-full items-center gap-1.5 rounded-full border border-white/15 bg-black/35 px-2.5 py-1 font-code text-[9px] font-bold uppercase tracking-[0.18em] text-white/80',
        className
      )}
      title={hasWeather ? `${city} sky` : 'Clock sky — weather still loading'}
      aria-live="polite"
    >
      <CloudRain className="h-3 w-3 shrink-0 opacity-80" aria-hidden />
      <span className="truncate">
        {city} · {ready ? label : 'Reading the sky…'}
      </span>
    </p>
  );
}
