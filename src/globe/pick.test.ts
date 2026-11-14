import { describe, it, expect } from 'vitest';
import { latLonToVector3, vector3ToLatLon, pointToLatLon } from './pick';
import { makeFakeGrid } from '@/data/fake';
import { rowToLat } from '@/data/types';
import * as THREE from 'three';

describe('Spherical Coordinate Conversion & Raycast Picking', () => {
  const radius = 1.0;

  describe('latLonToVector3 and vector3ToLatLon round-trip', () => {
    it('round-trips (0, 0) correctly', () => {
      const v = latLonToVector3(0, 0, radius);
      const res = vector3ToLatLon(v);
      expect(res.lat).toBeCloseTo(0, 2);
      expect(res.lon).toBeCloseTo(0, 2);
    });

    it('round-trips (0, 90) correctly', () => {
      const v = latLonToVector3(0, 90, radius);
      const res = vector3ToLatLon(v);
      expect(res.lat).toBeCloseTo(0, 2);
      expect(res.lon).toBeCloseTo(90, 2);
    });

    it('round-trips (45, -120) correctly', () => {
      const v = latLonToVector3(45, -120, radius);
      const res = vector3ToLatLon(v);
      expect(res.lat).toBeCloseTo(45, 2);
      expect(res.lon).toBeCloseTo(-120, 2);
    });

    it('round-trips North and South poles', () => {
      const north = latLonToVector3(90, 0, radius);
      expect(vector3ToLatLon(north).lat).toBeCloseTo(90, 2);

      const south = latLonToVector3(-90, 0, radius);
      expect(vector3ToLatLon(south).lat).toBeCloseTo(-90, 2);
    });
  });

  describe('Alignment with fake grid equator', () => {
    it('places the warm equator band at Y=0 on the 3D sphere', () => {
      const grid = makeFakeGrid(0);
      // In 180x90 grid, row 45 is Equator (lat 0)
      const equatorLat = rowToLat(45, grid.h);
      expect(equatorLat).toBe(0);

      // Verify Cartesian position of Equator has Y = 0
      const equatorVector = latLonToVector3(equatorLat, 0, radius);
      expect(equatorVector.y).toBeCloseTo(0, 4);

      // Verify that values along row 45 are warmest compared to poles
      const equatorVal = grid.values[45 * grid.w + 0]; // lon -180
      const northVal = grid.values[0 * grid.w + 0]; // row 0 (90N)
      const southVal = grid.values[89 * grid.w + 0]; // row 89 (90S)

      expect(equatorVal).not.toBeNull();
      expect(northVal).not.toBeNull();
      expect(southVal).not.toBeNull();

      if (equatorVal !== null && northVal !== null && southVal !== null) {
        expect(equatorVal).toBeGreaterThan(northVal);
        expect(equatorVal).toBeGreaterThan(southVal);
      }
    });
  });

  describe('pointToLatLon with object rotation', () => {
    it('accurately accounts for object rotation around Y axis', () => {
      const group = new THREE.Group();
      group.rotation.y = Math.PI / 2; // 90 degree rotation
      group.updateMatrixWorld(true);

      // A world point at (0, 0, -1) transformed by 90-degree rotated group
      const worldPoint = new THREE.Vector3(0, 0, -1);
      const res = pointToLatLon(worldPoint, group);

      // In local coordinates, (0, 0, -1) rotated by -90 deg Y is (1, 0, 0) -> (0, 0)
      expect(res.lat).toBeCloseTo(0, 2);
      expect(res.lon).toBeCloseTo(0, 2);
    });
  });
});
