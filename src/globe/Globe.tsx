import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Stars } from '@react-three/drei';
import * as THREE from 'three';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { useReducedMotion } from '@/store/useJukebox';
import { DataLayer } from './DataLayer';
import { ScanLine } from './ScanLine';
import { Picker } from './Picker';

/**
 * Procedurally generates a dark blue canvas texture with an equirectangular
 * latitude and longitude coordinate grid used when the satellite image is missing.
 */
function createFallbackGridTexture(): THREE.Texture {
  if (typeof document === 'undefined') {
    return new THREE.Texture();
  }

  const canvas = document.createElement('canvas');
  canvas.width = 2048;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    return new THREE.Texture();
  }

  // Deep ocean blue base (#0B1D3A, NASA palette)
  ctx.fillStyle = '#0B1D3A';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Lat / Lon coordinate grid lines (#18335E)
  ctx.strokeStyle = '#18335E';
  ctx.lineWidth = 1.5;

  // Latitude lines every 15 degrees (-75° to +75°)
  for (let lat = -75; lat <= 75; lat += 15) {
    const y = ((90 - lat) / 180) * canvas.height;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(canvas.width, y);
    ctx.stroke();
  }

  // Longitude lines every 15 degrees (-180° to +180°)
  for (let lon = -180; lon <= 180; lon += 15) {
    const x = ((lon + 180) / 360) * canvas.width;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, canvas.height);
    ctx.stroke();
  }

  // Prominent reference markers (#255496)
  ctx.strokeStyle = '#255496';
  ctx.lineWidth = 3;

  // Equator (0° Latitude)
  ctx.beginPath();
  ctx.moveTo(0, canvas.height / 2);
  ctx.lineTo(canvas.width, canvas.height / 2);
  ctx.stroke();

  // Prime Meridian (0° Longitude)
  ctx.beginPath();
  ctx.moveTo(canvas.width / 2, 0);
  ctx.lineTo(canvas.width / 2, canvas.height);
  ctx.stroke();

  // International Date Line boundaries (180°W and 180°E)
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(0, canvas.height);
  ctx.moveTo(canvas.width, 0);
  ctx.lineTo(canvas.width, canvas.height);
  ctx.stroke();

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  return texture;
}

/**
 * Atmosphere component rendering a back-side sphere with subtle Fresnel glow (#4F8BFF).
 */
const Atmosphere: React.FC = () => {
  const atmosphereMaterial = useMemo(() => {
    return new THREE.ShaderMaterial({
      vertexShader: `
        varying vec3 vNormal;
        varying vec3 vViewDir;

        void main() {
          vNormal = normalize(normalMatrix * normal);
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          vViewDir = normalize(-mvPosition.xyz);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        varying vec3 vNormal;
        varying vec3 vViewDir;
        uniform vec3 uColor;

        void main() {
          // With BackSide, the interior is occluded by Earth (radius 1.0).
          // Outer rim grazing angles produce dot product near zero.
          float dotProduct = dot(vNormal, vViewDir);
          float intensity = 1.0 + dotProduct;
          intensity = clamp(intensity, 0.0, 1.0);
          intensity = pow(intensity, 2.2);
          gl_FragColor = vec4(uColor, intensity * 0.7);
        }
      `,
      uniforms: {
        uColor: { value: new THREE.Color('#4F8BFF') },
      },
      blending: THREE.AdditiveBlending,
      side: THREE.BackSide,
      transparent: true,
      depthWrite: false,
    });
  }, []);

  return (
    <mesh>
      <sphereGeometry args={[1.035, 64, 64]} />
      <primitive object={atmosphereMaterial} attach="material" />
    </mesh>
  );
};

/**
 * Earth sphere rendering radius 1, 128 segments with NASA Blue Marble
 * equirectangular texture or dark blue lat/lon grid fallback.
 */
const EarthSphere: React.FC = () => {
  const fallbackTexture = useMemo(() => createFallbackGridTexture(), []);
  const [activeTexture, setActiveTexture] = useState<THREE.Texture>(fallbackTexture);

  useEffect(() => {
    let isMounted = true;
    const loader = new THREE.TextureLoader();

    loader.load(
      '/textures/earth_day.jpg',
      (loadedTexture) => {
        if (!isMounted) return;
        loadedTexture.colorSpace = THREE.SRGBColorSpace;
        loadedTexture.wrapS = THREE.RepeatWrapping;
        loadedTexture.wrapT = THREE.ClampToEdgeWrapping;
        setActiveTexture(loadedTexture);
      },
      undefined,
      () => {
        // Fall back gracefully to the coordinate grid material
        if (isMounted) {
          setActiveTexture(fallbackTexture);
        }
      }
    );

    return () => {
      isMounted = false;
    };
  }, [fallbackTexture]);

  return (
    <mesh>
      <sphereGeometry args={[1, 128, 128]} />
      <meshStandardMaterial
        map={activeTexture}
        roughness={0.7}
        metalness={0.1}
      />
    </mesh>
  );
};

/**
 * 3D Interactive Earth Globe for the Earth Information Jukebox.
 * Features:
 * - NASA Blue Marble basemap sphere with procedural grid fallback
 * - Equirectangular DataLayer (radius 1.005) with 400ms cross-fading and synthetic grid mode
 * - Glowing meridian ScanLine (radius 1.008) tied to playhead with transient Zustand subscription
 * - Raycast Picker (radius 1.006) with ring cursor marker (radius 1.012)
 * - Subtle atmospheric Fresnel glow (radius 1.035)
 * - Background starfield and OrbitControls
 */
export const Globe: React.FC = () => {
  const reducedMotion = useReducedMotion();
  const [autoRotate, setAutoRotate] = useState(!reducedMotion);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const controlsRef = useRef<OrbitControlsImpl>(null);
  const globeGroupRef = useRef<THREE.Group>(null);

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
      className="w-full h-full relative overflow-hidden select-none"
      style={{ backgroundColor: '#070B14' }}
    >
      <Canvas
        dpr={[1, 2]}
        gl={{ antialias: true, alpha: true }}
        camera={{ position: [0, 0, 2.5], fov: 45 }}
        style={{ width: '100%', height: '100%' }}
      >
        {/* Background cosmic field */}
        <Stars radius={100} depth={50} count={3000} factor={4} saturation={0} fade speed={1} />

        {/* Scene illumination */}
        <ambientLight intensity={0.4} />
        <directionalLight position={[5, 3, 5]} intensity={1.8} />
        <directionalLight position={[-5, -3, -5]} intensity={0.3} color="#1E3A6D" />

        {/* Primary Globe Group: Earth, Data Layer, ScanLine, and Picker */}
        <group ref={globeGroupRef}>
          <EarthSphere />
          <DataLayer />
          <ScanLine />
          <Picker globeRef={globeGroupRef} />
        </group>

        {/* Atmospheric outer glow */}
        <Atmosphere />

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
