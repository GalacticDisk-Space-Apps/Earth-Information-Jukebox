import React, { useEffect, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Stars } from '@react-three/drei';
import * as THREE from 'three';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { useJukebox, useReducedMotion, useSelection } from '@/store/useJukebox';
import type { LatLon } from '@/data/types';
import { latLonToVector3 } from './pick';
import { DataLayer } from './DataLayer';
import { ScanLine } from './ScanLine';
import { Picker } from './Picker';
import {
  Atmosphere,
  Clouds,
  EarthSphere,
  SUN_POSITION,
} from './EarthMesh';

/**
 * Smooth camera recentering controller when a geographic point is selected.
 * 1.2s cubic ease-out, disabled when reducedMotion is active.
 */
const CameraSelectionController: React.FC<{
  controlsRef: React.RefObject<OrbitControlsImpl>;
  globeRef: React.RefObject<THREE.Group>;
}> = ({ controlsRef, globeRef }) => {
  const selection = useSelection();
  const reducedMotion = useReducedMotion();
  const { camera } = useThree();

  const animationRef = useRef<{
    startPos: THREE.Vector3;
    targetPos: THREE.Vector3;
    distance: number;
    startTime: number;
  } | null>(null);

  const prevSelectionRef = useRef<LatLon | null>(null);

  useEffect(() => {
    if (!selection) {
      prevSelectionRef.current = null;
      animationRef.current = null;
      return;
    }

    // Ignore identical coordinate updates
    if (
      prevSelectionRef.current &&
      prevSelectionRef.current.lat === selection.lat &&
      prevSelectionRef.current.lon === selection.lon
    ) {
      return;
    }

    prevSelectionRef.current = selection;

    const point = latLonToVector3(selection.lat, selection.lon, 1.0);
    if (globeRef.current) {
      globeRef.current.localToWorld(point);
    }

    const targetDir = point.normalize();
    const distance = camera.position.length();
    const targetPos = targetDir.multiplyScalar(distance);

    if (reducedMotion) {
      camera.position.copy(targetPos);
      camera.lookAt(0, 0, 0);
      controlsRef.current?.update();
    } else {
      animationRef.current = {
        startPos: camera.position.clone(),
        targetPos,
        distance,
        startTime: performance.now(),
      };
    }
  }, [selection, reducedMotion, camera, controlsRef, globeRef]);

  useFrame(() => {
    if (!animationRef.current) return;

    const { startPos, targetPos, distance, startTime } = animationRef.current;
    const elapsed = performance.now() - startTime;
    const duration = 1200; // 1.2s ease
    const progress = Math.min(1, elapsed / duration);

    // Cubic ease-out curve
    const ease = 1 - Math.pow(1 - progress, 3);

    const current = new THREE.Vector3()
      .copy(startPos)
      .lerp(targetPos, ease)
      .normalize()
      .multiplyScalar(distance);

    camera.position.copy(current);
    camera.lookAt(0, 0, 0);
    controlsRef.current?.update();

    if (progress >= 1) {
      animationRef.current = null;
    }
  });

  return null;
};

/**
 * 3D Interactive Earth Globe for the Earth Information Jukebox.
 * Features:
 * - Realistic Earth basemap with day/night terminator, city lights, bump relief & ocean glint
 * - Drifting atmospheric cloud layer (radius 1.01)
 * - Faint / on-demand DataLayer (radius 1.005) with 400ms fade and sweep focus band
 * - Glowing meridian ScanLine (radius 1.008) tied to playhead with transient Zustand subscription
 * - Click-to-inspect Picker with glowing pulsing pin and 1.2s camera centering
 * - Subtle atmospheric blue Fresnel glow (radius 1.025)
 * - Directional Sun lighting and low ambient light for realistic 3D planet lighting
 * - Global 'L' keyboard shortcut toggling data layer visibility
 */
export const Globe: React.FC = () => {
  const reducedMotion = useReducedMotion();
  const [autoRotate, setAutoRotate] = useState(!reducedMotion);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const controlsRef = useRef<OrbitControlsImpl>(null);
  const globeGroupRef = useRef<THREE.Group>(null);

  // Keyboard shortcut: 'L' toggles data layer overlay, Escape clears selection
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable)
      ) {
        return;
      }

      if (e.key === 'l' || e.key === 'L') {
        e.preventDefault();
        useJukebox.getState().toggleDataLayer();
        return;
      }

      if (e.key === 'Escape') {
        useJukebox.getState().clearSelection();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // Sync reducedMotion setting with auto-rotate state
  useEffect(() => {
    if (reducedMotion) {
      if (timerRef.current) clearTimeout(timerRef.current);
      setAutoRotate(false);
    } else {
      setAutoRotate(true);
    }
  }, [reducedMotion]);

  // Clean up interaction timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const handleStart = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setAutoRotate(false);
  };

  const handleEnd = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    if (!reducedMotion) {
      timerRef.current = setTimeout(() => {
        setAutoRotate(true);
      }, 4000);
    }
  };

  const isAutoRotating = !reducedMotion && autoRotate;

  return (
    <div
      data-testid="globe-container"
      className="w-full h-full relative overflow-hidden select-none bg-black"
    >
      <Canvas
        dpr={[1, 2]}
        gl={{ antialias: true, alpha: true }}
        camera={{ position: [0, 0, 2.5], fov: 45 }}
        style={{ width: '100%', height: '100%' }}
        onPointerMissed={(e) => {
          // Clicking empty space outside the globe clears selection
          if (e.type === 'click') {
            useJukebox.getState().clearSelection();
          }
        }}
      >
        {/* Background cosmic field */}
        <Stars radius={100} depth={50} count={3000} factor={4} saturation={0} fade speed={1} />

        {/* Directional Sun light from upper-left providing realistic day/night 3D lighting */}
        <directionalLight position={SUN_POSITION} intensity={2.2} color="#FFFFFF" />

        {/* Low ambient light so the night side has visible shadow and the planet looks 3D */}
        <ambientLight intensity={0.06} color="#0D1526" />

        {/* Primary Globe Group: Earth, Data Layer, ScanLine, Clouds, and Picker */}
        <group ref={globeGroupRef}>
          <EarthSphere />
          <DataLayer />
          <ScanLine />
          <Clouds />
          <Picker globeRef={globeGroupRef} />
        </group>

        {/* Atmospheric outer glow */}
        <Atmosphere />

        {/* Smooth camera recentering controller */}
        <CameraSelectionController controlsRef={controlsRef} globeRef={globeGroupRef} />

        {/* Camera interaction controls */}
        <OrbitControls
          ref={controlsRef}
          enablePan={false}
          enableDamping={true}
          dampingFactor={0.05}
          minDistance={1.3}
          maxDistance={5.0}
          autoRotate={isAutoRotating}
          autoRotateSpeed={0.5}
          onStart={handleStart}
          onEnd={handleEnd}
        />
      </Canvas>
    </div>
  );
};

export default Globe;
