import { describe, it, expect } from 'vitest';
import { makeFakeGrid, makeFakeTrack } from '@/data/fake';
import {
  PENTATONIC_SCALE,
  valueToNote,
  valueToFrequency,
  lonToPan,
  sampleColumnLatitudeBands,
  columnToChord,
  computeGlobalMean,
} from './mappings';

describe('Sonification Mappings & Scales', () => {
  describe('PENTATONIC_SCALE', () => {
    it('covers 3 full octaves with 16 notes from C3 to C6', () => {
      expect(PENTATONIC_SCALE.length).toBe(16);
      expect(PENTATONIC_SCALE[0]).toBe('C3');
      expect(PENTATONIC_SCALE[PENTATONIC_SCALE.length - 1]).toBe('C6');
    });
  });

  describe('valueToNote', () => {
    const min = -2;
    const max = 35;

    it('maps minimum value to lowest scale note (C3)', () => {
      expect(valueToNote(min, min, max)).toBe('C3');
    });

    it('maps maximum value to highest scale note (C6)', () => {
      expect(valueToNote(max, min, max)).toBe('C6');
    });

    it('maps midpoint value to middle scale note (G4)', () => {
      const mid = (min + max) / 2;
      expect(valueToNote(mid, min, max)).toBe('G4');
    });

    it('returns null for null, undefined, or NaN values (rest/silence)', () => {
      expect(valueToNote(null, min, max)).toBeNull();
      expect(valueToNote(undefined, min, max)).toBeNull();
      expect(valueToNote(NaN, min, max)).toBeNull();
    });

    it('clamps values below min to C3 and above max to C6', () => {
      expect(valueToNote(-10, min, max)).toBe('C3');
      expect(valueToNote(50, min, max)).toBe('C6');
    });
  });

  describe('valueToFrequency', () => {
    const min = 0;
    const max = 100;

    it('maps minimum value to C3 base frequency (~130.8 Hz)', () => {
      const freq = valueToFrequency(0, min, max);
      expect(freq).toBeCloseTo(130.81, 1);
    });

    it('maps maximum value to 3 octaves higher (8x base, ~1046.5 Hz)', () => {
      const freq = valueToFrequency(100, min, max);
      expect(freq).toBeCloseTo(130.8128 * 8, 1);
    });

    it('returns null for null value', () => {
      expect(valueToFrequency(null, min, max)).toBeNull();
    });
  });

  describe('lonToPan', () => {
    it('maps 180W (-180 deg) to -1.0 (hard left ear)', () => {
      expect(lonToPan(-180)).toBe(-1);
    });

    it('maps Prime Meridian (0 deg) to 0.0 (center)', () => {
      expect(lonToPan(0)).toBe(0);
    });

    it('maps 180E (+180 deg) to +1.0 (hard right ear)', () => {
      expect(lonToPan(180)).toBe(1);
    });

    it('clamps longitudes outside [-180, 180]', () => {
      expect(lonToPan(-200)).toBe(-1);
      expect(lonToPan(220)).toBe(1);
    });
  });

  describe('sampleColumnLatitudeBands', () => {
    const grid = makeFakeGrid(0);

    it('samples 5 distinct latitude bands for a column', () => {
      const bands = sampleColumnLatitudeBands(grid, 0, 5);
      expect(bands.length).toBe(5);
      // Pacific Ocean at 180W: all bands should have valid non-null values
      expect(bands.every((b) => b !== null)).toBe(true);
      // Equatorial band (index 2) should be warmer than polar bands (indices 0 and 4)
      expect(bands[2]!).toBeGreaterThan(bands[0]!);
      expect(bands[2]!).toBeGreaterThan(bands[4]!);
    });

    it('returns null for bands over continental landmasses (rest/silence)', () => {
      // Column 95 passes through Africa/Europe
      const bands = sampleColumnLatitudeBands(grid, 95, 5);
      expect(bands.length).toBe(5);
      // Equatorial band across Africa is masked out
      expect(bands[2]).toBeNull();
    });
  });

  describe('columnToChord', () => {
    const track = makeFakeTrack('ocean-fever');
    const grid = makeFakeGrid(0);

    it('produces a non-empty chord of pentatonic notes for open ocean column', () => {
      const chord = columnToChord(grid, 0, track.min, track.max, 5);
      expect(chord.length).toBeGreaterThan(0);
      expect(chord.length).toBeLessThanOrEqual(5);
      // Every note in the chord belongs to the pentatonic scale
      for (const note of chord) {
        expect(PENTATONIC_SCALE).toContain(note as (typeof PENTATONIC_SCALE)[number]);
      }
    });

    it('omits notes for null latitude bands', () => {
      // Column with land has fewer chord voices than 5
      const chordWithLand = columnToChord(grid, 95, track.min, track.max, 5);
      expect(chordWithLand.length).toBeLessThan(5);
    });
  });

  describe('computeGlobalMean', () => {
    it('calculates the average over all non-null grid cells', () => {
      const grid0 = makeFakeGrid(0);
      const grid20 = makeFakeGrid(20);

      const mean0 = computeGlobalMean(grid0);
      const mean20 = computeGlobalMean(grid20);

      expect(mean0).not.toBeNull();
      expect(mean20).not.toBeNull();
      // Year 2024 should be warmer than year 2004 by ~1.5 deg C
      expect(mean20!).toBeGreaterThan(mean0!);
      expect(mean20! - mean0!).toBeCloseTo(1.5, 1);
    });
  });
});
