/**
 * useWeather.ts
 * Fetches real weather data using free APIs:
 * 1. navigator.geolocation.getCurrentPosition() (GPS — most accurate)
 * 2. https://ipwho.is/
 * 3. https://ipapi.co/json/
 * 4. https://ipinfo.io/json
 * Weather: https://api.open-meteo.com/v1/forecast (free, no key)
 * Caches results in localStorage with a 5-minute TTL.
 */

import { useState, useEffect } from 'react';

interface Coords {
  lat: number;
  lon: number;
}

interface GeoResult {
  latitude: number;
  longitude: number;
  city: string;
  country: string;
}

interface WeatherData {
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

const CACHE_KEY = 'finamite-weather-cache';
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

function getWeatherCondition(code: number): WeatherData['condition'] {
  if (code === 0 || code === 1) return 'sunny';
  if (code === 2 || code === 3) return 'cloudy';
  if ((code >= 45 && code <= 48) || (code >= 51 && code <= 67)) return 'rainy';
  if (code >= 71 && code <= 86) return 'snowy';
  if (code >= 95 && code <= 99) return 'windy';
  return 'cloudy';
}

function loadCache(): CachedWeather | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const cached: CachedWeather = JSON.parse(raw);
    if (Date.now() - cached.timestamp > CACHE_TTL_MS) {
      localStorage.removeItem(CACHE_KEY);
      return null;
    }
    return cached;
  } catch {
    localStorage.removeItem(CACHE_KEY);
    return null;
  }
}

function saveCache(data: WeatherData) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ data, timestamp: Date.now() }));
  } catch {
    /* ignore */
  }
}

// ── Geolocation providers ──────────────────────────────────────────────

/** Try browser GPS. Resolves to lat/lon; city derived from reverse geocode or a fallback. */
function getCoordsFromGPS(): Promise<Coords> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation not supported'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
      (err) => reject(err),
      { timeout: 5000, enableHighAccuracy: false }
    );
  });
}

/** Parse ipwho.is response. */
async function getGeoFromIpWho(): Promise<GeoResult | null> {
  const res = await fetch('https://ipwho.is/', { signal: AbortSignal.timeout(5000) });
  if (!res.ok) return null;
  const data = await res.json();
  if (!data.latitude || !data.longitude) return null;
  return {
    latitude: data.latitude,
    longitude: data.longitude,
    city: data.city || '',
    country: data.country || '',
  };
}

/** Parse ipapi.co response. */
async function getGeoFromIpApi(): Promise<GeoResult | null> {
  const res = await fetch('https://ipapi.co/json/', { signal: AbortSignal.timeout(5000) });
  if (!res.ok) return null;
  const data = await res.json();
  if (!data.latitude || !data.longitude) return null;
  return {
    latitude: data.latitude,
    longitude: data.longitude,
    city: data.city || '',
    country: data.country_name || '',
  };
}

/** Parse ipinfo.io response. loc is "lat,lng" string. */
async function getGeoFromIpInfo(): Promise<GeoResult | null> {
  const res = await fetch('https://ipinfo.io/json', { signal: AbortSignal.timeout(5000) });
  if (!res.ok) return null;
  const data = await res.json();
  if (!data.loc) return null;
  const [lat, lon] = data.loc.split(',').map(Number);
  if (!lat || !lon) return null;
  return {
    latitude: lat,
    longitude: lon,
    city: data.city || '',
    country: data.country || '',
  };
}

/** Try all geo providers in order, return the first success. */
async function resolveGeo(): Promise<GeoResult> {
  // 1. GPS – get lat/lon, then use BigDataCloud reverse geocode for exact city name
  try {
    const coords = await getCoordsFromGPS();
    // Reverse geocode via BigDataCloud (free, no key, CORS-friendly)
    const revRes = await fetch(
      `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${coords.lat}&longitude=${coords.lon}&localityLanguage=en`,
      { signal: AbortSignal.timeout(3000) }
    );
    let city = '';
    let country = '';
    if (revRes.ok) {
      const revData = await revRes.json();
      city = revData.city || revData.locality || '';
      country = revData.countryName || '';
    }
    return { latitude: coords.lat, longitude: coords.lon, city, country };
  } catch {
    // GPS failed, continue to IP-based APIs
  }

  // 2. ipwho.is
  const fromIpWho = await getGeoFromIpWho();
  if (fromIpWho) return fromIpWho;

  // 3. ipapi.co
  const fromIpApi = await getGeoFromIpApi();
  if (fromIpApi) return fromIpApi;

  // 4. ipinfo.io
  const fromIpInfo = await getGeoFromIpInfo();
  if (fromIpInfo) return fromIpInfo;

  throw new Error('All geolocation providers failed');
}

/** Fetch weather from Open-Meteo using lat/lon. */
async function fetchWeatherFromOpenMeteo(lat: number, lon: number) {
  const res = await fetch(
    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
      `&current=temperature_2m,weathercode,apparent_temperature,relative_humidity_2m,wind_speed_10m` +
      `&daily=temperature_2m_max,temperature_2m_min&timezone=auto`,
    { signal: AbortSignal.timeout(5000) }
  );
  if (!res.ok) throw new Error('Weather API failed');
  return res.json();
}

// ── Hook ───────────────────────────────────────────────────────────────

export function useWeather() {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      // Check cache
      const cached = loadCache();
      if (cached) {
        if (!cancelled) {
          setWeather(cached.data);
          setLoading(false);
        }
        return;
      }

      try {
        const geo = await resolveGeo();

        const weatherJson = await fetchWeatherFromOpenMeteo(geo.latitude, geo.longitude);

        const current = weatherJson.current;
        const daily = weatherJson.daily;

        if (!current || !daily) throw new Error('Unexpected weather response');

        const locationParts = [geo.city, geo.country].filter(Boolean);
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

        if (!cancelled) {
          setWeather(data);
          setLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          setLoading(false);
          setError(null); // Silently hide on failure
        }
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, []);

  return { weather, loading, error };
}
