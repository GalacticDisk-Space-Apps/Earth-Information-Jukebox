import { sampleGrid, type ValueGrid } from './types';
import { FAKE_MODE, makeFakeGrid, makeFakeTrack } from './fake';
import { useJukebox } from '@/store/useJukebox';

// In-memory cache for loaded/generated ValueGrid frames
const gridCache = new Map<string, ValueGrid>();

/**
 * Returns an informative geographical place name for a given latitude and longitude.
 * Recognizes oceans, regional seas, and continents; falls back to formatted coordinates.
 */
export function placeName(lat: number, lon: number): string {
  // Normalize lon to [-180, 180]
  let nLon = ((((lon + 180) % 360) + 360) % 360) - 180;
  if (lon === 180) nLon = 180;

  // Polar Extremes
  if (lat >= 72) return 'Arctic Ocean';
  if (lat <= -65) return 'Antarctic Coast';
  if (lat <= -55) return 'Southern Ocean';

  // Marginal Seas & Regional Water Bodies
  if (lat >= 10 && lat <= 26 && nLon >= 50 && nLon <= 76) return 'Arabian Sea';
  if (lat >= 5 && lat <= 23 && nLon >= 80 && nLon <= 98) return 'Bay of Bengal';
  if (lat >= 18 && lat <= 31 && nLon >= -98 && nLon <= -80) return 'Gulf of Mexico';
  if (lat >= 10 && lat <= 25 && nLon >= -88 && nLon <= -60) return 'Caribbean Sea';
  if (lat >= 30 && lat <= 46 && nLon >= -6 && nLon <= 36) return 'Mediterranean Sea';
  if (lat >= -25 && lat <= -10 && nLon >= 142 && nLon <= 175) return 'Coral Sea';
  if (lat >= 0 && lat <= 25 && nLon >= 105 && nLon <= 122) return 'South China Sea';
  if (lat >= 50 && lat <= 66 && nLon >= 160 && nLon <= -160) return 'Bering Sea';
  if (lat >= 50 && lat <= 65 && nLon >= -10 && nLon <= 15) return 'North Sea';

  // Major Oceans
  if (lat >= -50 && lat <= 28 && nLon >= 40 && nLon <= 105) return 'Indian Ocean';
  if (lat >= 0 && lat <= 66 && nLon >= -80 && nLon <= 0) return 'North Atlantic Ocean';
  if (lat >= -55 && lat < 0 && nLon >= -60 && nLon <= 20) return 'South Atlantic Ocean';
  if (lat >= -12 && lat <= 12 && (nLon >= 140 || nLon <= -85)) return 'Equatorial Pacific';
  if (lat > 0 && lat <= 66 && (nLon >= 120 || nLon <= -100)) return 'North Pacific Ocean';
  if (lat >= -55 && lat < 0 && (nLon >= 140 || nLon <= -70)) return 'South Pacific Ocean';

  // Continents (fallback if over land)
  if (lat >= 15 && lat <= 70 && nLon >= -165 && nLon <= -55) return 'North America';
  if (lat >= -55 && lat < 15 && nLon >= -85 && nLon <= -35) return 'South America';
  if (lat >= -35 && lat <= 37 && nLon >= -18 && nLon <= 52) return 'Africa';
  if (lat >= 36 && lat <= 72 && nLon >= -10 && nLon <= 45) return 'Europe';
  if (lat >= 5 && lat <= 75 && nLon >= 45 && nLon <= 180) return 'Asia';
  if (lat >= -45 && lat <= -10 && nLon >= 112 && nLon <= 155) return 'Australia';

  // Fallback coordinate descriptor
  return `${Math.abs(lat).toFixed(1)}°${lat >= 0 ? 'N' : 'S'}, ${Math.abs(nLon).toFixed(1)}°${nLon >= 0 ? 'E' : 'W'}`;
}

/**
 * Formats coordinates into standard geographical representation e.g. "12.4 N, 72.8 E".
 */
export function formatCoordinates(lat: number, lon: number): string {
  let nLon = ((((lon + 180) % 360) + 360) % 360) - 180;
  if (lon === 180) nLon = 180;
  return `${Math.abs(lat).toFixed(1)} ${lat >= 0 ? 'N' : 'S'}, ${Math.abs(nLon).toFixed(1)} ${nLon >= 0 ? 'E' : 'W'}`;
}

/**
 * Formats physical measurement with dataset unit.
 */
export function formatValue(value: number | null, unit: string): string {
  if (value === null || Number.isNaN(value)) {
    return 'No data';
  }
  return `${value.toFixed(1)} ${unit}`;
}

/**
 * Retrieves the historical time-series at a specific geographic coordinate across all frames.
 * Uses cached ValueGrid objects and samples physical values.
 */
export async function getPointSeries(
  trackId: string,
  lat: number,
  lon: number
): Promise<{ date: string; value: number | null }[]> {
  const store = useJukebox.getState();
  const activeTrack =
    store.tracks.find((t) => t.id === trackId) ?? makeFakeTrack(trackId);

  const frames = activeTrack.frames && activeTrack.frames.length > 0
    ? activeTrack.frames
    : Array.from({ length: 21 }, (_, i) => String(2004 + i));

  const series: { date: string; value: number | null }[] = [];

  for (let i = 0; i < frames.length; i++) {
    const date = frames[i];
    const cacheKey = `${trackId}:${date}`;

    let grid = gridCache.get(cacheKey);

    if (!grid) {
      if (FAKE_MODE) {
        grid = makeFakeGrid(i);
        gridCache.set(cacheKey, grid);
      } else {
        // Attempt to fetch pre-computed binary or JSON grid if present
        try {
          const res = await fetch(`/data/${trackId}/grids/${date}.json`);
          if (res.ok) {
            grid = (await res.json()) as ValueGrid;
            gridCache.set(cacheKey, grid);
          } else {
            // Fallback to fake synthetic grid
            grid = makeFakeGrid(i);
            gridCache.set(cacheKey, grid);
          }
        } catch {
          grid = makeFakeGrid(i);
          gridCache.set(cacheKey, grid);
        }
      }
    }

    const value = sampleGrid(grid, lat, lon);
    series.push({ date, value });
  }

  return series;
}
