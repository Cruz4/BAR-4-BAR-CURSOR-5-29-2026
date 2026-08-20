'use client';

import { CloudRain } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSceneSky } from '@/hooks/use-scene-sky';
import { formatSceneTempF, sceneWeatherChipLabel } from '@/lib/scene/scene-sky';
import {
  activeEclipse,
  activeMeteorShower,
} from '@/lib/scene/scene-celestial';

export function SceneWeatherChip({ className }: { className?: string }) {
  const { phase, weather, hasWeather, city, tempF, ready, lat, lon } = useSceneSky();
  const label = sceneWeatherChipLabel(weather, phase);
  const degrees = formatSceneTempF(tempF);
  const place = degrees ? `${city} ${degrees}` : city;
  const shower = activeMeteorShower();
  const eclipse = activeEclipse(new Date(), lat, lon, phase);
  const extras = [
    shower && (phase === 'night' || phase === 'dusk') ? shower.name : null,
    eclipse?.label ?? null,
  ].filter(Boolean);
  const title = [hasWeather ? `${place} sky` : 'Clock sky — weather still loading', ...extras]
    .filter(Boolean)
    .join(' · ');

  return (
    <p
      className={cn(
        'inline-flex max-w-full items-center gap-1.5 rounded-full border border-white/15 bg-black/35 px-2.5 py-1 font-code text-[9px] font-bold uppercase tracking-[0.18em] text-white/80',
        className
      )}
      title={title}
      aria-live="polite"
    >
      <CloudRain className="h-3 w-3 shrink-0 opacity-80" aria-hidden />
      <span className="truncate">
        {place} · {ready ? label : 'Reading the sky…'}
      </span>
    </p>
  );
}
