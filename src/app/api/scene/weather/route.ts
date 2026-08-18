import { NextResponse } from 'next/server';
import { buildSceneSkyState } from '@/lib/scene/scene-sky';
import {
  cityFromCoords,
  clientIpFromRequest,
  housePlace,
  placeFromIp,
  type SceneWeatherPlace,
} from '@/lib/scene/scene-weather-geo';

export const runtime = 'nodejs';

type OpenMeteoResponse = {
  current?: {
    weather_code?: number;
    wind_speed_10m?: number;
    temperature_2m?: number;
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

async function resolvePlace(req: Request): Promise<SceneWeatherPlace> {
  const url = new URL(req.url);
  const lat = parseCoord(url.searchParams.get('lat'), -90, 90);
  const lon = parseCoord(url.searchParams.get('lon'), -180, 180);
  if (lat != null && lon != null) {
    const named = url.searchParams.get('city')?.trim();
    return {
      lat,
      lon,
      city: named || (await cityFromCoords(lat, lon)),
      source: 'gps',
    };
  }

  const ipPlace = await placeFromIp(clientIpFromRequest(req));
  return ipPlace ?? housePlace();
}

/**
 * Scene sky weather proxy — Open-Meteo current + sunrise/sunset.
 * Coords from the client (GPS already granted) or IP city; NYC if both fail.
 */
export async function GET(req: Request) {
  try {
    const place = await resolvePlace(req);

    const upstream = new URL('https://api.open-meteo.com/v1/forecast');
    upstream.searchParams.set('latitude', place.lat.toFixed(4));
    upstream.searchParams.set('longitude', place.lon.toFixed(4));
    upstream.searchParams.set('current', 'weather_code,wind_speed_10m,temperature_2m');
    upstream.searchParams.set('temperature_unit', 'fahrenheit');
    upstream.searchParams.set('daily', 'sunrise,sunset');
    upstream.searchParams.set('timezone', 'auto');
    upstream.searchParams.set('forecast_days', '1');

    const res = await fetch(upstream.toString(), {
      next: { revalidate: place.source === 'gps' ? 1200 : 0 },
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
    const tempF =
      typeof data.current?.temperature_2m === 'number' && Number.isFinite(data.current.temperature_2m)
        ? Math.round(data.current.temperature_2m)
        : null;
    const sunriseIso = data.daily?.sunrise?.[0];
    const sunsetIso = data.daily?.sunset?.[0];

    const sky = buildSceneSkyState({
      wmoCode,
      windspeedKmh,
      sunriseIso,
      sunsetIso,
    });

    const cache =
      place.source === 'gps'
        ? 'public, s-maxage=1200, stale-while-revalidate=600'
        : 'private, max-age=600';

    return NextResponse.json(
      {
        sky,
        city: place.city,
        tempF,
        lat: Math.round(place.lat * 10) / 10,
        lon: Math.round(place.lon * 10) / 10,
        source: place.source,
        raw: {
          wmoCode,
          windspeedKmh,
          tempF,
          sunriseIso: sunriseIso ?? null,
          sunsetIso: sunsetIso ?? null,
        },
      },
      {
        headers: {
          'Cache-Control': cache,
        },
      }
    );
  } catch (err) {
    console.error('[scene/weather]', err);
    return NextResponse.json({ error: 'Weather fetch failed' }, { status: 500 });
  }
}
