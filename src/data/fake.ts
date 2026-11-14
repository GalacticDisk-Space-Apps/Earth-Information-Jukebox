import type { Instrument, TrackMeta, ValueGrid } from './types';

export const FAKE_MODE = import.meta.env.VITE_FAKE_DATA === 'true';

const YEARS = Array.from({ length: 21 }, (_, i) => String(2004 + i));

const TRACK_PRESETS: Record<
  string,
  {
    title: string;
    dataset: string;
    source: string;
    unit: string;
    min: number;
    max: number;
    instrument: Instrument;
    story: string;
  }
> = {
  'ocean-fever': {
    title: 'Ocean Fever',
    dataset: 'GHRSST MUR Sea Surface Temperature',
    source: 'NASA JPL / PO.DAAC',
    unit: '°C',
    min: -2,
    max: 35,
    instrument: 'pad',
    story: 'Global sea surface temperature trends from 2004 to 2024, highlighting warming anomalies across equatorial waters.',
  },
  'breathing-planet': {
    title: 'Breathing Planet',
    dataset: 'MODIS Terra NDVI',
    source: 'NASA LP DAAC',
    unit: 'NDVI',
    min: -0.2,
    max: 1.0,
    instrument: 'pluck',
    story: 'Vegetation canopy dynamics tracking global seasonal greening and forest biomass variations.',
  },
  'melting-crown': {
    title: 'Melting Crown',
    dataset: 'Sea Ice Concentration',
    source: 'NASA NSIDC DAAC',
    unit: '%',
    min: 0,
    max: 100,
    instrument: 'bell',
    story: 'Polar sea ice extent measurements documenting multi-decadal retreat and thinning.',
  },
  'fire-season': {
    title: 'Fire Season',
    dataset: 'MODIS/VIIRS Active Fires',
    source: 'NASA FIRMS / LANCE',
    unit: 'Count',
    min: 0,
    max: 500,
    instrument: 'noise',
    story: 'Thermal anomalies detecting wildfire outbreaks and seasonal biomass burning patterns.',
  },
};

/**
 * Returns a TrackMeta object populated with 21 annual frames (2004 to 2024).
 */
export function makeFakeTrack(id: string): TrackMeta {
  const preset = TRACK_PRESETS[id] ?? {
    title: id.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
    dataset: 'NASA Earth Observation System',
    source: 'NASA EOSDIS',
    unit: 'Units',
    min: 0,
    max: 100,
    instrument: 'pad' as Instrument,
    story: 'Multi-year environmental observations from satellite radiometers.',
  };

  return {
    id,
    title: preset.title,
    dataset: preset.dataset,
    source: preset.source,
    unit: preset.unit,
    min: preset.min,
    max: preset.max,
    frames: [...YEARS],
    instrument: preset.instrument,
    story: preset.story,
  };
}

/**
 * Determines whether a given row (latitude) and col (longitude) is synthetic land.
 */
function isSyntheticLand(row: number, col: number): boolean {
  // Approximate coarse land shapes for a 180x90 grid:
  // Africa & Europe (approx col 80..115, row 20..65)
  if (col >= 85 && col <= 110 && row >= 25 && row <= 65) {
    if (!(col > 105 && row < 35)) return true;
  }
  // North America (approx col 25..65, row 15..45)
  if (col >= 25 && col <= 65 && row >= 15 && row <= 45) {
    return true;
  }
  // South America (approx col 45..70, row 45..75)
  if (col >= 45 && col <= 70 && row >= 45 && row <= 75) {
    return true;
  }
  // Eurasia (approx col 100..165, row 15..40)
  if (col >= 105 && col <= 165 && row >= 15 && row <= 40) {
    return true;
  }
  // Australia (approx col 140..165, row 55..70)
  if (col >= 140 && col <= 165 && row >= 55 && row <= 70) {
    return true;
  }
  return false;
}

/**
 * Generates a 180x90 ValueGrid with a smooth equator-to-pole latitude gradient,
 * null entries over continental landmasses, and a progressive warming trend across frames.
 */
export function makeFakeGrid(frameIndex: number): ValueGrid {
  const w = 180;
  const h = 90;
  const values: (number | null)[] = new Array(w * h);

  // Progressive decadal warming trend (+1.5 deg C over 21 frames)
  const warming = (frameIndex / 20) * 1.5;

  for (let r = 0; r < h; r++) {
    // Equator is row 45 (lat 0). Distance from equator: 0 at row 45, 1 at poles (row 0 and 89).
    const eqDist = Math.abs(r - 45) / 45;
    // Cosine-based temperature gradient: ~30 deg C at equator, ~-1 deg C at poles
    const baseTemp = 30 * Math.cos(eqDist * (Math.PI / 2)) - 1;

    for (let c = 0; c < w; c++) {
      const idx = r * w + c;

      // Null out land areas to simulate ocean satellite mask
      if (isSyntheticLand(r, c)) {
        values[idx] = null;
      } else {
        // Minor longitudinal variation and warming offset
        const longitudinalWave = Math.sin((c / w) * Math.PI * 4) * 1.2;
        const val = Math.round((baseTemp + longitudinalWave + warming) * 10) / 10;
        values[idx] = Math.max(-2, Math.min(36, val));
      }
    }
  }

  return { w, h, values };
}
