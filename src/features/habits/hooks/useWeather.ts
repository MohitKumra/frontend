/**
 * useWeather.ts
 * Fetches real weather data using free APIs:
 * 1. IP geolocation (fast, non-blocking) or quick GPS
 * 2. Weather: https://api.open-meteo.com/v1/forecast (free, no key)
 * Caches results in localStorage with a 15-minute TTL and TanStack Query deduplication.
 */

import { useQuery } from '@tanstack/react-query';
import { WEATHER_CACHE_KEY } from '../../../config/brand';

export interface WeatherData {
  temp: number;
  high: number;
  low: number;
  feelsLike: number;
  humidity: number;
  windSpeed: number;
  condition: 'sunny' | 'cloudy' | 'rainy' | 'snowy' | 'windy';
  location: string;
}

interface CachedWeather {
  data: WeatherData;
  timestamp: number;
}

const CACHE_KEY = WEATHER_CACHE_KEY;
const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes

function getWeatherCondition(code: number): WeatherData['condition'] {
  if (code === 0 || code === 1) return 'sunny';
  if (code === 2 || code === 3) return 'cloudy';
  if ((code >= 45 && code <= 48) || (code >= 51 && code <= 67)) return 'rainy';
  if (code >= 71 && code <= 86) return 'snowy';
  if (code >= 95 && code <= 99) return 'windy';
  return 'cloudy';
}

function loadCache(): CachedWeather | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const cached: CachedWeather = JSON.parse(raw);
    if (Date.now() - cached.timestamp > CACHE_TTL_MS) {
      return null;
    }
    return cached;
  } catch {
    return null;
  }
}

function saveCache(data: WeatherData) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ data, timestamp: Date.now() }));
  } catch {
    /* ignore */
  }
}

interface GeoResult {
  latitude: number;
  longitude: number;
  city: string;
  country: string;
}

/** Quick GPS probe (max 1200ms) only if supported and fast */
async function probeGPS(): Promise<{ lat: number; lon: number } | null> {
  if (typeof navigator === 'undefined' || !navigator.geolocation) return null;
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(null), 1200);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        clearTimeout(timer);
        resolve({ lat: pos.coords.latitude, lon: pos.coords.longitude });
      },
      () => {
        clearTimeout(timer);
        resolve(null);
      },
      { timeout: 1200, enableHighAccuracy: false, maximumAge: 600000 }
    );
  });
}

/** Fast IP Geolocation fallback */
async function getGeoFromIp(): Promise<GeoResult | null> {
  try {
    const res = await fetch('https://ipwho.is/', { signal: AbortSignal.timeout(2500) });
    if (res.ok) {
      const data = await res.json();
      if (data.latitude && data.longitude) {
        return {
          latitude: data.latitude,
          longitude: data.longitude,
          city: data.city || '',
          country: data.country || '',
        };
      }
    }
  } catch {
    /* try secondary */
  }

  try {
    const res = await fetch('https://ipapi.co/json/', { signal: AbortSignal.timeout(2500) });
    if (res.ok) {
      const data = await res.json();
      if (data.latitude && data.longitude) {
        return {
          latitude: data.latitude,
          longitude: data.longitude,
          city: data.city || '',
          country: data.country_name || '',
        };
      }
    }
  } catch {
    /* fallback */
  }

  return null;
}

async function resolveWeather(): Promise<WeatherData> {
  let lat = 40.7128;
  let lon = -74.006;
  let city = 'Your Location';
  let country = '';

  const gps = await probeGPS();
  if (gps) {
    lat = gps.lat;
    lon = gps.lon;
    try {
      const rev = await fetch(
        `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=en`,
        { signal: AbortSignal.timeout(2000) }
      );
      if (rev.ok) {
        const revData = await rev.json();
        city = revData.city || revData.locality || city;
        country = revData.countryName || '';
      }
    } catch {
      /* continue with coords */
    }
  } else {
    const ipGeo = await getGeoFromIp();
    if (ipGeo) {
      lat = ipGeo.latitude;
      lon = ipGeo.longitude;
      city = ipGeo.city || city;
      country = ipGeo.country || '';
    }
  }

  const weatherRes = await fetch(
    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
      `&current=temperature_2m,weathercode,apparent_temperature,relative_humidity_2m,wind_speed_10m` +
      `&daily=temperature_2m_max,temperature_2m_min&timezone=auto`,
    { signal: AbortSignal.timeout(4000) }
  );

  if (!weatherRes.ok) throw new Error('Weather API failed');
  const weatherJson = await weatherRes.json();
  const current = weatherJson.current;
  const daily = weatherJson.daily;

  if (!current || !daily) throw new Error('Unexpected weather structure');

  const locationParts = [city, country].filter(Boolean);
  const data: WeatherData = {
    temp: Math.round(current.temperature_2m),
    high: Math.round(daily.temperature_2m_max[0]),
    low: Math.round(daily.temperature_2m_min[0]),
    feelsLike: Math.round(current.apparent_temperature ?? current.temperature_2m),
    humidity: Math.round(current.relative_humidity_2m ?? 0),
    windSpeed: Math.round(current.wind_speed_10m ?? 0),
    condition: getWeatherCondition(current.weathercode ?? 0),
    location: locationParts.join(', ') || 'Your Location',
  };

  saveCache(data);
  return data;
}

export function useWeather() {
  const query = useQuery({
    queryKey: ['weather', 'current'],
    queryFn: resolveWeather,
    initialData: () => loadCache()?.data,
    staleTime: CACHE_TTL_MS,
    gcTime: 60 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  return {
    weather: query.data ?? null,
    loading: query.isLoading && !query.data,
    error: query.isError ? (query.error as Error).message : null,
  };
}
