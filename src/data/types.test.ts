import { describe, it, expect } from 'vitest';
import {
  columnToLon,
  rowToLat,
  gridIndex,
  sampleGrid,
  type ValueGrid,
} from './types';

describe('Coordinate Conversion & Grid Helpers', () => {
  const w = 180;
  const h = 90;

  describe('columnToLon', () => {
    it('maps col 0 to -180 longitude', () => {
      expect(columnToLon(0, w)).toBe(-180);
    });

    it('maps middle column to 0 longitude (Prime Meridian)', () => {
      expect(columnToLon(90, w)).toBe(0);
    });

    it('maps col w to +180 longitude', () => {
      expect(columnToLon(w, w)).toBe(180);
    });
  });

  describe('rowToLat', () => {
    it('maps row 0 to +90 latitude (North Pole)', () => {
      expect(rowToLat(0, h)).toBe(90);
    });

    it('maps middle row to 0 latitude (Equator)', () => {
      expect(rowToLat(45, h)).toBe(0);
    });

    it('maps row h to -90 latitude (South Pole)', () => {
      expect(rowToLat(h, h)).toBe(-90);
    });
  });

  describe('gridIndex', () => {
    it('computes index 0 for North Pole and westernmost point', () => {
      const idx = gridIndex(90, -180, { w, h });
      expect(idx).toBe(0);
    });

    it('computes index at equator and prime meridian', () => {
      const idx = gridIndex(0, 0, { w, h });
      const expectedRow = 45;
      const expectedCol = 90;
      expect(idx).toBe(expectedRow * w + expectedCol);
    });

    it('computes last index for South Pole and eastern boundary', () => {
      const idx = gridIndex(-90, 180, { w, h });
      expect(idx).toBe(w * h - 1);
    });

    it('clamps latitudes above 90 and below -90', () => {
      expect(gridIndex(95, -180, { w, h })).toBe(0);
      expect(gridIndex(-95, -180, { w, h })).toBe((h - 1) * w);
    });
  });

  describe('sampleGrid', () => {
    it('samples valid value from grid', () => {
      const values = new Array(w * h).fill(null);
      const targetIdx = gridIndex(0, 0, { w, h });
      values[targetIdx] = 27.5;

      const grid: ValueGrid = { w, h, values };
      expect(sampleGrid(grid, 0, 0)).toBe(27.5);
    });

    it('returns null for unmeasured / masked cell', () => {
      const values = new Array(w * h).fill(null);
      const grid: ValueGrid = { w, h, values };
      expect(sampleGrid(grid, 10, 20)).toBeNull();
    });

    it('returns null if grid values array is empty', () => {
      const grid: ValueGrid = { w, h, values: [] };
      expect(sampleGrid(grid, 0, 0)).toBeNull();
    });
  });
});
