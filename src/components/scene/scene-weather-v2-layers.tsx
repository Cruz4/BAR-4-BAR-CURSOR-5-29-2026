'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import {
  clampWeatherIntensity,
  cloudIntensity,
  windDriftVector,
  type SceneSkyPhase,
  type SceneWeather,
} from '@/lib/scene/scene-sky';

function mulberry32(seed: number) {
  let a = seed;
  return function random() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type CloudLobe = { cx: number; cy: number; rx: number; ry: number };

type V2Cloud = {
  id: number;
  left: number;
  top: number;
  scale: number;
  opacity: number;
  depth: number;
  delay: number;
  duration: number;
  lobes: CloudLobe[];
};

type MistBand = {
  id: number;
  top: number;
  height: number;
  opacity: number;
  delay: number;
  duration: number;
};

const V2_CLOUDS: V2Cloud[] = (() => {
  const rand = mulberry32(77_021);
  return Array.from({ length: 9 }, (_, i) => {
    const lobeCount = 3 + Math.floor(rand() * 3);
    const lobes: CloudLobe[] = Array.from({ length: lobeCount }, (__, li) => ({
      cx: 18 + li * (14 + rand() * 10) + rand() * 6,
      cy: 22 + (rand() - 0.5) * 10,
      rx: 14 + rand() * 16,
      ry: 8 + rand() * 9,
    }));
    return {
      id: i,
      left: -8 + rand() * 96,
      top: 4 + rand() * 42,
      scale: 0.7 + rand() * 0.7,
      opacity: 0.35 + rand() * 0.45,
      depth: rand(),
      delay: rand() * 14,
      duration: 48 + rand() * 56,
      lobes,
    };
  });
})();

const MIST_BANDS: MistBand[] = (() => {
  const rand = mulberry32(40_404);
  return Array.from({ length: 4 }, (_, i) => ({
    id: i,
    top: 28 + i * 14 + rand() * 6,
    height: 10 + rand() * 12,
    opacity: 0.12 + rand() * 0.18,
    delay: rand() * 10,
    duration: 70 + rand() * 40,
  }));
})();

const LIGHTNING_BOLTS = [
  { id: 0, d: 'M62 8 L54 34 L66 34 L48 78 L72 40 L58 40 Z', left: 18, top: 6 },
  { id: 1, d: 'M48 4 L42 28 L55 28 L38 70 L61 36 L49 36 Z', left: 58, top: 10 },
] as const;

function cloudPath(lobes: CloudLobe[]): string {
  // Soft multi-lobe silhouette via overlapping ellipses → single filled path.
  return lobes
    .map((l) => {
      const x1 = l.cx - l.rx;
      const x2 = l.cx + l.rx;
      return [
        `M ${x1.toFixed(1)} ${l.cy.toFixed(1)}`,
        `A ${l.rx.toFixed(1)} ${l.ry.toFixed(1)} 0 1 1 ${x2.toFixed(1)} ${l.cy.toFixed(1)}`,
        `A ${l.rx.toFixed(1)} ${l.ry.toFixed(1)} 0 1 1 ${x1.toFixed(1)} ${l.cy.toFixed(1)}`,
        'Z',
      ].join(' ');
    })
    .join(' ');
}

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function SceneWeatherV2Layers({
  weather,
  phase,
  windy,
  gustsKmh,
  windDirectionDeg,
  cloudCoverPct,
  visibilityKm,
  windspeedKmh,
}: {
  weather: SceneWeather;
  phase: SceneSkyPhase;
  windy: boolean;
  gustsKmh?: number | null;
  windDirectionDeg?: number | null;
  cloudCoverPct?: number | null;
  visibilityKm?: number | null;
  windspeedKmh?: number | null;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [onScreen, setOnScreen] = useState(true);
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    setReduceMotion(prefersReducedMotion());
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onChange = () => setReduceMotion(mq.matches);
    mq.addEventListener?.('change', onChange);
    return () => mq.removeEventListener?.('change', onChange);
  }, []);

  useEffect(() => {
    const node = rootRef.current;
    if (!node || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(
      ([entry]) => setOnScreen(entry.isIntersecting && entry.intersectionRatio > 0.02),
      { threshold: [0, 0.02, 0.1] }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const animate = onScreen && !reduceMotion;
  const cover = clampWeatherIntensity(
    (typeof cloudCoverPct === 'number' ? cloudCoverPct : cloudIntensity(weather) * 100) / 100
  );
  const intensity = clampWeatherIntensity(Math.max(cloudIntensity(weather), cover * 0.85));
  const mistStrength = clampWeatherIntensity(
    weather === 'fog'
      ? 0.95
      : typeof visibilityKm === 'number'
        ? Math.max(0, 1 - visibilityKm / 12)
        : weather === 'drizzle' || weather === 'rain'
          ? 0.35
          : 0.12
  );
  const drift = useMemo(
    () => windDriftVector(windDirectionDeg, gustsKmh, windspeedKmh),
    [windDirectionDeg, gustsKmh, windspeedKmh]
  );
  const showStormShelf =
    weather === 'thunderstorm' || weather === 'hail' || weather === 'heavy_rain';
  const showLightning = weather === 'thunderstorm' || weather === 'hail';
  const cloudCount = Math.max(0, Math.round(2 + intensity * 7));
  const clouds = V2_CLOUDS.slice(0, cloudCount);

  const travelX = `${(drift.dx * (8 + drift.speedFactor * 18)).toFixed(2)}%`;
  const travelY = `${(drift.dy * (4 + drift.speedFactor * 6)).toFixed(2)}%`;
  const durationScale = Math.max(0.35, 1.15 - drift.speedFactor * 0.55);

  if (intensity <= 0.02 && mistStrength < 0.08 && !showStormShelf) {
    return <div ref={rootRef} className="pointer-events-none absolute inset-0" aria-hidden />;
  }

  return (
    <div
      ref={rootRef}
      className={cn(
        'scene-wx-v2 pointer-events-none absolute inset-0',
        windy && 'is-windy',
        !animate && 'is-paused'
      )}
      data-phase={phase}
      data-weather={weather}
      style={
        {
          ['--wx-travel-x' as string]: travelX,
          ['--wx-travel-y' as string]: travelY,
          ['--wx-duration-scale' as string]: String(durationScale),
          ['--wx-intensity' as string]: String(intensity),
        } as React.CSSProperties
      }
      aria-hidden
    >
      {mistStrength > 0.05 &&
        MIST_BANDS.map((band) => (
          <div
            key={band.id}
            className="scene-wx-v2-mist absolute inset-x-0"
            style={{
              top: `${band.top}%`,
              height: `${band.height}%`,
              opacity: band.opacity * mistStrength,
              animationDelay: `${band.delay}s`,
              animationDuration: `${band.duration * durationScale}s`,
            }}
          />
        ))}

      {showStormShelf ? (
        <div
          className="scene-wx-v2-storm-shelf absolute inset-x-0"
          style={{ opacity: 0.35 + intensity * 0.45 }}
        />
      ) : null}

      <div className="scene-wx-v2-clouds absolute inset-0" style={{ opacity: 0.55 + intensity * 0.4 }}>
        {clouds.map((cloud) => (
          <svg
            key={cloud.id}
            className="scene-wx-v2-cloud absolute overflow-visible"
            viewBox="0 0 120 48"
            style={{
              left: `${cloud.left}%`,
              top: `${cloud.top}%`,
              width: `${22 + cloud.scale * 28}%`,
              opacity: cloud.opacity * (0.55 + intensity * 0.5),
              animationDelay: `${cloud.delay}s`,
              animationDuration: `${cloud.duration * durationScale * (0.85 + cloud.depth * 0.4)}s`,
              zIndex: Math.round(cloud.depth * 10),
            }}
          >
            <path d={cloudPath(cloud.lobes)} className="scene-wx-v2-cloud-fill" />
          </svg>
        ))}
      </div>

      {showLightning && animate ? (
        <div className="scene-wx-v2-lightning absolute inset-0">
          {LIGHTNING_BOLTS.map((bolt, index) => (
            <svg
              key={bolt.id}
              className="scene-wx-v2-bolt absolute h-28 w-16"
              viewBox="0 0 100 90"
              style={{
                left: `${bolt.left}%`,
                top: `${bolt.top}%`,
                animationDelay: `${2.4 + index * 3.1}s`,
              }}
            >
              <path d={bolt.d} />
            </svg>
          ))}
          <div className="scene-wx-v2-flash absolute inset-0" />
        </div>
      ) : null}
    </div>
  );
}
