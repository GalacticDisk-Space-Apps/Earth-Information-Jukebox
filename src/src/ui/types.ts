import { JukeboxTrack } from './types';

export const MOCK_TRACKS: JukeboxTrack[] = [
  {
    id: 'ocean-fever',
    title: 'Ocean Fever',
    subtitle: 'Sea Surface Temperature Anomaly',
    unit: '°C',
    rangeLabel: '-2.0 °C to +2.0 °C',
    provenance: 'image-estimate',
    description:
      'Hear ocean warmth sweep from pole to pole. Higher pitches indicate warmer anomalies; stereo pan tracks longitude from west to east.',
    credit: 'NASA Earth Information Center / JPL',
    accentColor: '#f97316',
  },
  {
    id: 'arctic-pulse',
    title: 'Arctic Pulse',
    subtitle: 'Sea Ice Concentration & Extent',
    unit: '%',
    rangeLabel: '0% to 100%',
    provenance: 'image-estimate',
    description:
      'Seasonal freeze and melt translated into six latitude voices. Diminishing voice gain reflects shrinking ice coverage.',
    credit: 'NASA Earth Information Center / NSIDC',
    accentColor: '#38bdf8',
  },
  {
    id: 'biosphere-breath',
    title: 'Biosphere Breath',
    subtitle: 'Global Vegetation Greenness (NDVI)',
    unit: 'NDVI',
    rangeLabel: '0.0 to 0.9',
    provenance: 'measured',
    description:
      'Seasonal land greening across hemispheres driven by satellite vegetation indices.',
    credit: 'NASA Earth Observatory / MODIS',
    accentColor: '#4ade80',
  },
];