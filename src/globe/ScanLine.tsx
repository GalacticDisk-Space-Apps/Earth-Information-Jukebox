import React, { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useJukebox, useMode } from '@/store/useJukebox';

/**
 * ScanLine component rendering a thin glowing meridian ring (half-torus from pole to pole)
 * positioned at longitude = playhead * 360 - 180.
 *
 * Uses a transient Zustand subscription so playhead updates (~25-60Hz) never trigger
 * React component re-renders.
 */
export const ScanLine: React.FC = () => {
  const mode = useMode();
  const groupRef = useRef<THREE.Group>(null);
  const playheadRef = useRef<number>(useJukebox.getState().playhead);

  // Transient subscription to Zustand store: updates playheadRef without React re-render
  useEffect(() => {
    const unsub = useJukebox.subscribe((state) => {
      playheadRef.current = state.playhead;
    });
    return unsub;
  }, []);

  // Half-torus geometry spanning pole-to-pole (radius 1.008, tube 0.0035, arc PI)
  const geometry = useMemo(() => {
    // Radius 1.008 places it just above DataLayer (1.005) and below Atmosphere (1.035)
    return new THREE.TorusGeometry(1.008, 0.0035, 16, 64, Math.PI);
  }, []);

  // High-visibility glowing cyan material
  const material = useMemo(() => {
    return new THREE.MeshBasicMaterial({
      color: new THREE.Color('#38BDF8'),
      transparent: true,
      opacity: 0.95,
      depthWrite: false,
    });
  }, []);

  // Update meridian rotation on every frame without React re-rendering
  useFrame(() => {
    if (!groupRef.current) return;

    // playhead 0..1 maps to longitude -180°..+180°
    const lonDeg = playheadRef.current * 360 - 180;
    const lonRad = (lonDeg * Math.PI) / 180;

    groupRef.current.rotation.y = lonRad;
  });

  // Only visible when in sweep or timelapse mode
  const isVisible = mode === 'sweep' || mode === 'timelapse';
  if (!isVisible) {
    return null;
  }

  return (
    <group ref={groupRef}>
      {/* 
        TorusGeometry is created in the XY plane with arc 0..PI from (+R, 0, 0) to (-R, 0, 0).
        Rotating around Z by -PI/2 aligns the arc from South Pole (0, -R, 0) through Equator
        (+R, 0, 0) to North Pole (0, +R, 0).
      */}
      <mesh
        geometry={geometry}
        material={material}
        rotation={[0, 0, -Math.PI / 2]}
      />
    </group>
  );
};

export default ScanLine;
