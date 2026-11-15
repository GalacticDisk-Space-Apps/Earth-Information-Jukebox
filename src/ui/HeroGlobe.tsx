import React, { useEffect, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Stars } from '@react-three/drei';
import * as THREE from 'three';
import { useReducedMotion } from '@/store/useJukebox';
import { Atmosphere, Clouds, EarthSphere, SUN_POSITION } from '@/globe/EarthMesh';

// Maximum parallax tilt angle: 4 degrees in radians
const MAX_TILT_RAD = (4 * Math.PI) / 180;

/**
 * Inner rotating Earth group with slow rotation and eased mouse parallax tilt (<= 4 degrees).
 */
const RotatingPlanetGroup: React.FC<{
  pointerRef: React.MutableRefObject<{ x: number; y: number }>;
}> = ({ pointerRef }) => {
  const groupRef = useRef<THREE.Group>(null);
  const reducedMotion = useReducedMotion();
  const rotationYRef = useRef(0);

  useFrame((_, delta) => {
    if (!groupRef.current) return;

    if (!reducedMotion) {
      // Slow continuous spin (approx 0.04 rad/s)
      rotationYRef.current += delta * 0.04;

      // Target parallax angles based on pointer position (-1 to +1)
      const targetRotX = -pointerRef.current.y * MAX_TILT_RAD;
      const targetRotY = rotationYRef.current + pointerRef.current.x * MAX_TILT_RAD;

      // Smooth exponential easing towards target
      groupRef.current.rotation.x = THREE.MathUtils.lerp(
        groupRef.current.rotation.x,
        targetRotX,
        delta * 3
      );
      groupRef.current.rotation.y = THREE.MathUtils.lerp(
        groupRef.current.rotation.y,
        targetRotY,
        delta * 5
      );
    }
  });

  return (
    <group ref={groupRef}>
      <EarthSphere radius={1} />
      <Clouds rotateSpeed={reducedMotion ? 0 : 0.006} />
    </group>
  );
};

export interface HeroGlobeProps {
  className?: string;
}

export const HeroGlobe: React.FC<HeroGlobeProps> = ({ className = 'w-full h-full' }) => {
  const pointerRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const handlePointerMove = (e: MouseEvent) => {
      // Normalize mouse coordinates from -1 to 1 across the window
      const x = (e.clientX / window.innerWidth) * 2 - 1;
      const y = (e.clientY / window.innerHeight) * 2 - 1;
      pointerRef.current = {
        x: Math.max(-1, Math.min(1, x)),
        y: Math.max(-1, Math.min(1, y)),
      };
    };

    window.addEventListener('mousemove', handlePointerMove, { passive: true });
    return () => {
      window.removeEventListener('mousemove', handlePointerMove);
    };
  }, []);

  return (
    <div
      data-testid="hero-globe-container"
      className={`relative select-none pointer-events-none ${className}`}
    >
      <Canvas
        dpr={[1, 2]}
        gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
        camera={{ position: [0, 0, 2.55], fov: 45 }}
        style={{ width: '100%', height: '100%' }}
      >
        {/* Subtle background cosmic star field */}
        <Stars radius={80} depth={40} count={2200} factor={3} saturation={0} fade speed={0.8} />

        {/* Side-lit Sun for dramatic terminator across the planet */}
        <directionalLight position={SUN_POSITION} intensity={2.4} color="#FFFFFF" />

        {/* Low ambient light so night side city lights pop against black space */}
        <ambientLight intensity={0.05} color="#0D1526" />

        {/* Earth & rotating clouds */}
        <RotatingPlanetGroup pointerRef={pointerRef} />

        {/* Atmospheric limb glow */}
        <Atmosphere radius={1.025} />
      </Canvas>
    </div>
  );
};

export default HeroGlobe;
