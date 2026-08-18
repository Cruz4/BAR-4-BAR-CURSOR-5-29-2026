'use client';

import { useEffect, useState } from 'react';
import {
  buildSceneSkyState,
  defaultSceneSkyState,
  SCENE_HOUSE_CITY,
  type SceneSkyState,
} from '@/lib/scene/scene-sky';

const WEATHER_POLL_MS = 35 * 60 * 1000;
const PHASE_TICK_MS = 2 * 60 * 1000;
const STALE_GEO_KEY = 'b4b-scene-geo';

type WeatherBits = {
  wmoCode?: number | null;
  windspeedKmh?: number | null;
  sunriseIso?: string;
  sunsetIso?: string;
};

type WeatherApiPayload = {
  sky?: SceneSkyState;
  raw?: {
    wmoCode: number | null;
    windspeedKmh: number | null;
    sunriseIso: string | null;
    sunsetIso: string | null;
  };
};

let sharedSky: SceneSkyState = defaultSceneSkyState();
let sharedBits: WeatherBits = {};
let inFlight: Promise<void> | null = null;
let lastFetchAt = 0;

function clearStaleGeoCache() {
  try {
    localStorage.removeItem(STALE_GEO_KEY);
  } catch {
    /* ignore */
  }
}

async function fetchHouseWeather(): Promise<void> {
  if (inFlight) {
    await inFlight;
    return;
  }
  if (lastFetchAt > 0 && Date.now() - lastFetchAt < 60_000) return;
  inFlight = (async () => {
    const { lat, lon } = SCENE_HOUSE_CITY;
    const res = await fetch(
      `/api/scene/weather?lat=${encodeURIComponent(String(lat))}&lon=${encodeURIComponent(String(lon))}`
    );
    if (!res.ok) throw new Error('weather failed');
    const data = (await res.json()) as WeatherApiPayload;
    const raw = data.raw;
    sharedBits = {
      wmoCode: raw?.wmoCode ?? null,
      windspeedKmh: raw?.windspeedKmh ?? null,
      sunriseIso: raw?.sunriseIso ?? undefined,
      sunsetIso: raw?.sunsetIso ?? undefined,
    };
    sharedSky =
      data.sky ??
      buildSceneSkyState({
        wmoCode: sharedBits.wmoCode,
        windspeedKmh: sharedBits.windspeedKmh,
        sunriseIso: sharedBits.sunriseIso,
        sunsetIso: sharedBits.sunsetIso,
      });
    lastFetchAt = Date.now();
  })().finally(() => {
    inFlight = null;
  });
  await inFlight;
}

function tickPhaseFromBits(): SceneSkyState {
  const b = sharedBits;
  if (typeof b.wmoCode !== 'number') {
    return defaultSceneSkyState();
  }
  return buildSceneSkyState({
    wmoCode: b.wmoCode,
    windspeedKmh: b.windspeedKmh,
    sunriseIso: b.sunriseIso,
    sunsetIso: b.sunsetIso,
  });
}

/**
 * House-city weather for The Scene skyline.
 * Does not use geolocation — Permissions-Policy blocks it, and the room
 * should still rain when NYC is raining.
 */
export function useSceneSky() {
  const [sky, setSky] = useState<SceneSkyState>(() => sharedSky);
  const [ready, setReady] = useState(lastFetchAt > 0);

  useEffect(() => {
    let cancelled = false;
    let weatherTimer = 0;
    let phaseTimer = 0;

    clearStaleGeoCache();

    const apply = (next: SceneSkyState) => {
      sharedSky = next;
      if (!cancelled) setSky(next);
    };

    (async () => {
      try {
        await fetchHouseWeather();
        if (!cancelled) apply(sharedSky);
      } catch {
        if (!cancelled) apply(defaultSceneSkyState());
      }
      if (!cancelled) setReady(true);
    })();

    weatherTimer = window.setInterval(() => {
      void fetchHouseWeather()
        .then(() => {
          if (!cancelled) apply(sharedSky);
        })
        .catch(() => undefined);
    }, WEATHER_POLL_MS);

    phaseTimer = window.setInterval(() => {
      if (!cancelled) apply(tickPhaseFromBits());
    }, PHASE_TICK_MS);

    return () => {
      cancelled = true;
      if (weatherTimer) window.clearInterval(weatherTimer);
      if (phaseTimer) window.clearInterval(phaseTimer);
    };
  }, []);

  return {
    phase: sky.phase,
    weather: sky.weather,
    hasWeather: sky.hasWeather,
    windy: sky.windy,
    updatedAt: sky.updatedAt,
    city: SCENE_HOUSE_CITY.shortName,
    sky,
    ready,
    locationDenied: false,
  };
}
