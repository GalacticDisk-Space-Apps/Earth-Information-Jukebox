import type { TrackMeta, ValueGrid, TrendPoint } from './types';
import { makeFakeTrack, makeFakeGrid } from './fake';

// In-memory caches to prevent repeated network requests
const metaCache = new Map<string, TrackMeta>();
const gridCache = new Map<string, ValueGrid>();
const trendCache = new Map<string, TrendPoint[]>();
const pendingGridLoads = new Map<string, Promise<ValueGrid>>();

export const DEFAULT_TRACK_IDS = [
  'ocean-fever',
  'breathing-planet',
  'melting-crown',
  'fire-season',
];

/**
 * Returns the public URL for a track's frame texture (PNG).
 */
export function getFrameTextureUrl(trackId: string, frameDate: string): string {
  return `/data/${trackId}/${frameDate}.png`;
}

/**
 * Loads metadata for a track from /data/<trackId>/meta.json.
 * Falls back to synthetic metadata generator if the file is unavailable.
 */
export async function loadTrackMeta(trackId: string): Promise<TrackMeta> {
  if (metaCache.has(trackId)) {
    return metaCache.get(trackId)!;
  }

  try {
    const res = await fetch(`/data/${trackId}/meta.json`);
    if (!res.ok) {
      throw new Error(`HTTP ${res.status} fetching /data/${trackId}/meta.json`);
    }
    const meta: TrackMeta = await res.json();
    metaCache.set(trackId, meta);
    return meta;
  } catch (err) {
    console.warn(`[loadTrack] Falling back to synthetic meta for track '${trackId}':`, err);
    const fallback = makeFakeTrack(trackId);
    metaCache.set(trackId, fallback);
    return fallback;
  }
}

/**
 * Loads all available tracks metadata.
 */
export async function loadAvailableTracks(
  trackIds: string[] = DEFAULT_TRACK_IDS
): Promise<TrackMeta[]> {
  const promises = trackIds.map((id) => loadTrackMeta(id));
  return Promise.all(promises);
}

/**
 * Loads the 180x90 scientific ValueGrid for a specific track frame.
 * Cached in memory to ensure snappy 60fps audio scrubbing and globe picking.
 */
export async function loadValueGrid(
  trackId: string,
  frameDate: string,
  frameIndexFallback: number = 0
): Promise<ValueGrid> {
  const cacheKey = `${trackId}:${frameDate}`;

  if (gridCache.has(cacheKey)) {
    return gridCache.get(cacheKey)!;
  }

  if (pendingGridLoads.has(cacheKey)) {
    return pendingGridLoads.get(cacheKey)!;
  }

  const loadPromise = (async () => {
    try {
      const res = await fetch(`/data/${trackId}/values/${frameDate}.json`);
      if (!res.ok) {
        throw new Error(`HTTP ${res.status} fetching /data/${trackId}/values/${frameDate}.json`);
      }
      const grid: ValueGrid = await res.json();
      gridCache.set(cacheKey, grid);
      return grid;
    } catch (err) {
      console.warn(
        `[loadTrack] Falling back to synthetic ValueGrid for ${trackId}@${frameDate}:`,
        err
      );
      const fallback = makeFakeGrid(frameIndexFallback);
      gridCache.set(cacheKey, fallback);
      return fallback;
    } finally {
      pendingGridLoads.delete(cacheKey);
    }
  })();

  pendingGridLoads.set(cacheKey, loadPromise);
  return loadPromise;
}

/**
 * Loads the multi-year trend statistics from /data/<trackId>/trend.json.
 */
export async function loadTrendData(trackId: string): Promise<TrendPoint[]> {
  if (trendCache.has(trackId)) {
    return trendCache.get(trackId)!;
  }

  try {
    const res = await fetch(`/data/${trackId}/trend.json`);
    if (!res.ok) {
      throw new Error(`HTTP ${res.status} fetching /data/${trackId}/trend.json`);
    }
    const trend: TrendPoint[] = await res.json();
    trendCache.set(trackId, trend);
    return trend;
  } catch (err) {
    console.warn(`[loadTrack] Could not load trend.json for ${trackId}:`, err);
    return [];
  }
}

/**
 * Preloads metadata, trend data, and the first few value grids for a track.
 */
export async function preloadTrack(trackId: string, preloadFramesCount: number = 3): Promise<void> {
  const meta = await loadTrackMeta(trackId);
  await loadTrendData(trackId);

  const framesToPreload = meta.frames.slice(0, preloadFramesCount);
  await Promise.all(
    framesToPreload.map((frameDate, idx) => loadValueGrid(trackId, frameDate, idx))
  );
}

/**
 * Clears the in-memory cache (useful for hot-reloading or data updates).
 */
export function clearDataCache(): void {
  metaCache.clear();
  gridCache.clear();
  trendCache.clear();
  pendingGridLoads.clear();
}
