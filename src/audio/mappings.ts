import type { ValueGrid } from '@/data/types';

/**
 * 3-octave C-major pentatonic scale.
 * C3 (130.8 Hz) to C6 (1046.5 Hz) covering 3 full octaves.
 * Pentatonic intervals ensure harmonious acoustic blending without harsh dissonance.
 */
export const PENTATONIC_SCALE = [
  'C3',
  'D3',
  'E3',
  'G3',
  'A3',
  'C4',
  'D4',
  'E4',
  'G4',
  'A4',
  'C5',
  'D5',
  'E5',
  'G5',
  'A5',
  'C6',
] as const;

export type PentatonicNote = (typeof PENTATONIC_SCALE)[number];

/**
 * Maps a physical value into a note on the 3-octave C-major pentatonic scale.
 * If value is null, undefined, or NaN, returns null (null values = rest / silence).
 *
 * @param v - Physical Earth observation value (or null if masked / no data)
 * @param min - Minimum value of the dataset legend
 * @param max - Maximum value of the dataset legend
 */
export function valueToNote(
  v: number | null | undefined,
  min: number,
  max: number
): string | null {
  if (v === null || v === undefined || Number.isNaN(v)) {
    return null;
  }
  const range = max - min;
  if (range <= 0) {
    return PENTATONIC_SCALE[0];
  }
  const t = Math.min(1, Math.max(0, (v - min) / range));
  const index = Math.round(t * (PENTATONIC_SCALE.length - 1));
  return PENTATONIC_SCALE[index];
}

/**
 * Maps a physical value to a continuous frequency (Hz) across 3 octaves (130.8 Hz to 1046.5 Hz).
 * Used for smooth portamento touch-mode gliding.
 * If value is null, returns null.
 */
export function valueToFrequency(
  v: number | null | undefined,
  min: number,
  max: number,
  baseFreq = 130.8128 // C3
): number | null {
  if (v === null || v === undefined || Number.isNaN(v)) {
    return null;
  }
  const range = max - min;
  if (range <= 0) return baseFreq;
  const t = Math.min(1, Math.max(0, (v - min) / range));
  // Continuous logarithmic 3-octave formula: f = base * 2^(3 * t)
  return baseFreq * Math.pow(2, 3 * t);
}

/**
 * Maps longitude in degrees (-180..+180) to stereo pan position (-1..+1).
 * -180 (west) = -1 (left ear)
 * 0 (prime meridian) = 0 (center)
 * +180 (east) = +1 (right ear)
 */
export function lonToPan(lon: number): number {
  if (Number.isNaN(lon)) return 0;
  const clamped = Math.max(-180, Math.min(180, lon));
  return clamped / 180;
}

/**
 * Samples 5 latitude bands for a given grid column (0..w-1).
 * Bands divide rows from North (row 0) to South (row h-1):
 * - Band 0: Northern Polar (~90°N to 54°N)
 * - Band 1: Northern Mid-latitudes (~54°N to 18°N)
 * - Band 2: Equatorial / Tropical (~18°N to -18°S)
 * - Band 3: Southern Mid-latitudes (~-18°S to -54°S)
 * - Band 4: Southern Polar (~-54°S to -90°S)
 *
 * For each band, averages all valid (non-null) cells in the column.
 * Returns null for any band where all cells are masked / no data.
 */
export function sampleColumnLatitudeBands(
  grid: ValueGrid,
  col: number,
  numBands = 5
): (number | null)[] {
  const { w, h, values } = grid;
  if (!values || values.length === 0 || w <= 0 || h <= 0) {
    return new Array(numBands).fill(null);
  }

  const clampedCol = Math.max(0, Math.min(w - 1, Math.floor(col)));
  const bandHeight = Math.floor(h / numBands);
  const bands: (number | null)[] = [];

  for (let b = 0; b < numBands; b++) {
    const startRow = b * bandHeight;
    const endRow = b === numBands - 1 ? h : (b + 1) * bandHeight;
    let sum = 0;
    let count = 0;

    for (let r = startRow; r < endRow; r++) {
      const idx = r * w + clampedCol;
      const val = values[idx];
      if (val !== null && val !== undefined && !Number.isNaN(val)) {
        sum += val;
        count++;
      }
    }

    if (count > 0) {
      bands.push(sum / count);
    } else {
      bands.push(null);
    }
  }

  return bands;
}

/**
 * Computes an array of notes (chord) for a given column across latitude bands.
 * Excludes nulls (rests). Deduplicates identical simultaneous notes while preserving order.
 */
export function columnToChord(
  grid: ValueGrid,
  col: number,
  min: number,
  max: number,
  numBands = 5
): string[] {
  const bandValues = sampleColumnLatitudeBands(grid, col, numBands);
  const chord: string[] = [];

  for (const val of bandValues) {
    const note = valueToNote(val, min, max);
    if (note && !chord.includes(note)) {
      chord.push(note);
    }
  }

  return chord;
}

/**
 * Computes the global mean of all valid (non-null) cells across the entire grid.
 * Returns null if the grid is empty or has no valid measurements.
 */
export function computeGlobalMean(grid: ValueGrid): number | null {
  if (!grid.values || grid.values.length === 0) return null;
  let sum = 0;
  let count = 0;
  for (let i = 0; i < grid.values.length; i++) {
    const val = grid.values[i];
    if (val !== null && val !== undefined && !Number.isNaN(val)) {
      sum += val;
      count++;
    }
  }
  return count > 0 ? sum / count : null;
}
