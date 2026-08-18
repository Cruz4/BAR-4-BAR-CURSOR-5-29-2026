import { NextResponse } from 'next/server';
import { buildSceneSkyState, SCENE_HOUSE_CITY } from '@/lib/scene/scene-sky';

export const runtime = 'nodejs';

type OpenMeteoResponse = {
  current?: {
    weather_code?: number;
    wind_speed_10m?: number;
    time?: string;
  };
  daily?: {
    sunrise?: string[];
    sunset?: string[];
  };
};

function parseCoord(raw: string | null, min: number, max: number): number | null {
  if (raw == null || raw === '') return null;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < min || n > max) return null;
  return n;
}

/**
 * Scene sky weather proxy — Open-Meteo current + sunrise/sunset.
 * No API key. Cached ~20 minutes at the edge/CDN via Cache-Control.
 */
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const lat = parseCoord(url.searchParams.get('lat'), -90, 90) ?? SCENE_HOUSE_CITY.lat;
    const lon = parseCoord(url.searchParams.get('lon'), -180, 180) ?? SCENE_HOUSE_CITY.lon;

    const upstream = new URL('https://api.open-meteo.com/v1/forecast');
    upstream.searchParams.set('latitude', lat.toFixed(4));
    upstream.searchParams.set('longitude', lon.toFixed(4));
    upstream.searchParams.set('current', 'weather_code,wind_speed_10m');
    upstream.searchParams.set('daily', 'sunrise,sunset');
    upstream.searchParams.set('timezone', 'auto');
    upstream.searchParams.set('forecast_days', '1');

    const res = await fetch(upstream.toString(), {
      next: { revalidate: 1200 },
      headers: { Accept: 'application/json' },
    });

    if (!res.ok) {
      return NextResponse.json({ error: 'Weather upstream failed' }, { status: 502 });
    }

    const data = (await res.json()) as OpenMeteoResponse;
    const wmoCode =
      typeof data.current?.weather_code === 'number' ? data.current.weather_code : null;
    const windspeedKmh =
      typeof data.current?.wind_speed_10m === 'number' ? data.current.wind_speed_10m : null;
    const sunriseIso = data.daily?.sunrise?.[0];
    const sunsetIso = data.daily?.sunset?.[0];

    const sky = buildSceneSkyState({
      wmoCode,
      windspeedKmh,
      sunriseIso,
      sunsetIso,
    });

    return NextResponse.json(
      {
        sky,
        city: SCENE_HOUSE_CITY.shortName,
        raw: {
          wmoCode,
          windspeedKmh,
          sunriseIso: sunriseIso ?? null,
          sunsetIso: sunsetIso ?? null,
        },
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=1200, stale-while-revalidate=600',
        },
      }
    );
  } catch (err) {
    console.error('[scene/weather]', err);
    return NextResponse.json({ error: 'Weather fetch failed' }, { status: 500 });
  }
}
