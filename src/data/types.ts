export type Instrument = 'pad' | 'pluck' | 'bell' | 'noise';

export type TrackMeta = {
  id: string;
  title: string;
  dataset: string;
  source: string;
  unit: string;
  min: number;
  max: number;
  frames: string[];
  instrument: Instrument;
  story: string;
};

// Row-major grid, row 0 = 90N, col 0 = 180W
export type ValueGrid = {
  w: number;
  h: number;
  values: (number | null)[];
};

export type LatLon = {
  lat: number;
  lon: number;
};

export type Mode = 'sweep' | 'timelapse' | 'touch';

export type AppStatus =
  | 'idle'
  | 'audioUnlocked'
  | 'loading'
  | 'ready'
  | 'playing'
  | 'paused'
  | 'error';

export type TrendPoint = {
  date: string;
  year: string;
  mean: number | null;
  min: number | null;
  max: number | null;
  sampleCount?: number;
};

/**
 * Converts a grid column index (0..w-1) to longitude in degrees (-180..180).
 */
export function columnToLon(col: number, w: number): number {
  if (w <= 0) return 0;
  return -180 + (col / w) * 360;
}

/**
 * Converts a grid row index (0..h-1) to latitude in degrees (90..-90).
 */
export function rowToLat(row: number, h: number): number {
  if (h <= 0) return 0;
  return 90 - (row / h) * 180;
}

/**
 * Computes the 1D index into ValueGrid.values for a given latitude and longitude.
 * Clamps coordinates to valid ranges and grid bounds.
 */
export function gridIndex(lat: number, lon: number, grid: Pick<ValueGrid, 'w' | 'h'>): number {
  const { w, h } = grid;
  if (w <= 0 || h <= 0) return 0;

  // Clamp latitude to [-90, 90]
  const clampedLat = Math.max(-90, Math.min(90, lat));

  // Normalize longitude into [-180, 180]
  let normalizedLon = ((((lon + 180) % 360) + 360) % 360) - 180;
  if (lon === 180) normalizedLon = 180;

  // Compute row (0 at 90N, h-1 at 90S)
  const normY = (90 - clampedLat) / 180;
  let row = Math.floor(normY * h);
  if (row >= h) row = h - 1;
  if (row < 0) row = 0;

  // Compute column (0 at 180W, w-1 at 180E)
  const normX = (normalizedLon + 180) / 360;
  let col = Math.floor(normX * w);
  if (col >= w) col = w - 1;
  if (col < 0) col = 0;

  return row * w + col;
}

/**
 * Samples the physical value at a given latitude and longitude.
 * Returns null if out of bounds or if the grid has no data at that coordinate.
 */
export function sampleGrid(grid: ValueGrid, lat: number, lon: number): number | null {
  if (!grid.values || grid.values.length === 0) return null;
  const idx = gridIndex(lat, lon, grid);
  if (idx < 0 || idx >= grid.values.length) return null;
  return grid.values[idx] ?? null;
}

export { placeName, formatCoordinates, formatValue, getPointSeries } from './series';

