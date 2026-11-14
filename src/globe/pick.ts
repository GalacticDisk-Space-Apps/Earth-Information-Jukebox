import * as THREE from 'three';
import type { LatLon } from '@/data/types';

/**
 * Converts spherical latitude and longitude (in degrees) to a 3D Cartesian Vector3
 * adhering to Three.js SphereGeometry equirectangular UV mapping:
 * - Latitude 90°N is +Y, 90°S is -Y, Equator is Y=0
 * - Longitude 0° (Prime Meridian) is +X, 90°E is -Z, 90°W is +Z, 180° is -X
 */
export function latLonToVector3(lat: number, lon: number, radius = 1): THREE.Vector3 {
  const latRad = (lat * Math.PI) / 180;
  const lonRad = (lon * Math.PI) / 180;

  const x = radius * Math.cos(latRad) * Math.cos(lonRad);
  const y = radius * Math.sin(latRad);
  const z = -radius * Math.cos(latRad) * Math.sin(lonRad);

  return new THREE.Vector3(x, y, z);
}

/**
 * Converts a 3D Cartesian position on or near the sphere into geographic {lat, lon}.
 */
export function vector3ToLatLon(v: THREE.Vector3 | { x: number; y: number; z: number }): LatLon {
  const len = Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
  if (len === 0) {
    return { lat: 0, lon: 0 };
  }

  const ny = Math.max(-1, Math.min(1, v.y / len));
  const latRad = Math.asin(ny);
  let lat = (latRad * 180) / Math.PI;

  const lonRad = Math.atan2(-v.z, v.x);
  let lon = (lonRad * 180) / Math.PI;

  // Clean precision artifacts around zero
  if (Math.abs(lon) < 1e-6) lon = 0;
  if (Math.abs(lat) < 1e-6) lat = 0;

  return {
    lat: Math.round(lat * 1000) / 1000,
    lon: Math.round(lon * 1000) / 1000,
  };
}

/**
 * Transforms an arbitrary world-space hit point into local globe coordinates and computes {lat, lon}.
 */
export function pointToLatLon(point: THREE.Vector3, globeObject?: THREE.Object3D | null): LatLon {
  const localPoint = globeObject ? globeObject.worldToLocal(point.clone()) : point;
  return vector3ToLatLon(localPoint);
}
