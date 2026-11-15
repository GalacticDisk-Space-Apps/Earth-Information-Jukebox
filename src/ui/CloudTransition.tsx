import React, { useEffect, useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useReducedMotion } from '@/store/useJukebox';
import { playTransitionWhoosh } from '@/audio/whoosh';

const CLOUD_COUNT = 250;
const DURATION_SECONDS = 2.4;

interface CloudData {
  x: number;
  y: number;
  startZ: number;
  size: number;
  rotZ: number;
  tint: THREE.Color;
}

let preloadedCloudTexture: THREE.CanvasTexture | null = null;

/**
 * Procedurally generates a soft, cumulus-style cloud puff texture on a 256x256 canvas
 * using layered radial gradients and organic noise.
 * Cached so it is generated only once before the click.
 */
export function preloadCloudTexture(): THREE.CanvasTexture {
  if (preloadedCloudTexture) {
    return preloadedCloudTexture;
  }

  if (typeof document === 'undefined') {
    return new THREE.CanvasTexture(new Image() as unknown as HTMLCanvasElement);
  }

  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    return new THREE.CanvasTexture(canvas);
  }

  ctx.clearRect(0, 0, 256, 256);

  // Layered soft radial cloud lobes
  const lobes = [
    { x: 128, y: 128, r: 84, a: 0.7 },
    { x: 104, y: 112, r: 66, a: 0.6 },
    { x: 154, y: 118, r: 70, a: 0.6 },
    { x: 120, y: 150, r: 64, a: 0.55 },
    { x: 144, y: 144, r: 60, a: 0.5 },
    { x: 92,  y: 136, r: 54, a: 0.45 },
    { x: 164, y: 134, r: 52, a: 0.42 },
  ];

  for (const lobe of lobes) {
    const grad = ctx.createRadialGradient(lobe.x, lobe.y, 0, lobe.x, lobe.y, lobe.r);
    grad.addColorStop(0, `rgba(255, 255, 255, ${lobe.a})`);
    grad.addColorStop(0.45, `rgba(244, 248, 255, ${lobe.a * 0.7})`);
    grad.addColorStop(0.75, `rgba(230, 238, 252, ${lobe.a * 0.25})`);
    grad.addColorStop(1, 'rgba(220, 232, 250, 0)');

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(lobe.x, lobe.y, lobe.r, 0, Math.PI * 2);
    ctx.fill();
  }

  // Add subtle procedural noise
  const imgData = ctx.getImageData(0, 0, 256, 256);
  const data = imgData.data;
  for (let i = 0; i < data.length; i += 4) {
    const alpha = data[i + 3];
    if (alpha > 0) {
      const noise = (Math.random() - 0.5) * 16;
      data[i] = Math.max(0, Math.min(255, data[i] + noise));
      data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + noise));
      data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + noise));
    }
  }
  ctx.putImageData(imgData, 0, 0);

  preloadedCloudTexture = new THREE.CanvasTexture(canvas);
  preloadedCloudTexture.wrapS = THREE.ClampToEdgeWrapping;
  preloadedCloudTexture.wrapT = THREE.ClampToEdgeWrapping;
  preloadedCloudTexture.generateMipmaps = true;
  preloadedCloudTexture.minFilter = THREE.LinearMipmapLinearFilter;
  return preloadedCloudTexture;
}

/**
 * 3D Cloud Tunnel with 250 instanced clouds on a single continuous trajectory.
 * Driven by one unified clock: progress p = clamp(elapsed / 2.4, 0, 1).
 * NO cloud recycling: z = startZ + 125 * p^3.
 * Zero React state updates per frame (refs only).
 */
const SingleTunnelMesh: React.FC<{
  startTimeRef: React.MutableRefObject<number | null>;
  onMountMainApp?: () => void;
  onComplete?: () => void;
  washRef: React.RefObject<HTMLDivElement>;
  speedLineRef: React.RefObject<HTMLDivElement>;
}> = ({ startTimeRef, onMountMainApp, onComplete, washRef, speedLineRef }) => {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const texture = useMemo(() => preloadCloudTexture(), []);

  // Flags to ensure single dispatch of lifecycle callbacks
  const hasMountedAppRef = useRef(false);
  const hasCompletedRef = useRef(false);

  // Distribute 250 clouds once along a long tunnel (z from -5 to -120).
  // Density increases smoothly toward far z (-120) using u^0.7 distribution.
  const clouds = useMemo<CloudData[]>(() => {
    const list: CloudData[] = [];
    const tints = [
      new THREE.Color('#FFFFFF'),
      new THREE.Color('#F6F9FF'),
      new THREE.Color('#EDF4FF'),
      new THREE.Color('#E2EEFF'),
      new THREE.Color('#D8E8FF'),
    ];

    for (let i = 0; i < CLOUD_COUNT; i++) {
      const theta = Math.random() * Math.PI * 2;
      // Cylinder radius from center line (2.0 to 14.5)
      const r = 2.0 + Math.random() * 12.5;
      const x = Math.cos(theta) * r;
      const y = Math.sin(theta) * r;

      // Density increases smoothly toward far z (-120)
      const u = Math.random();
      const startZ = -5 - 115 * Math.pow(u, 0.7);

      const size = 5.0 + Math.random() * 11.0;
      const rotZ = Math.random() * Math.PI * 2;
      const tint = tints[Math.floor(Math.random() * tints.length)];

      list.push({ x, y, startZ, size, rotZ, tint });
    }

    // Sort far to near for cleaner initial depth sorting
    list.sort((a, b) => a.startZ - b.startZ);
    return list;
  }, []);

  // Set initial colors on the instanced mesh once
  useEffect(() => {
    if (!meshRef.current) return;
    clouds.forEach((cloud, i) => {
      meshRef.current?.setColorAt(i, cloud.tint);
    });
    if (meshRef.current.instanceColor) {
      meshRef.current.instanceColor.needsUpdate = true;
    }
  }, [clouds]);

  useFrame((state) => {
    if (!meshRef.current || startTimeRef.current === null) return;

    // Single unified clock: progress p = clamp(elapsed / 2.4, 0, 1)
    const elapsed = (performance.now() - startTimeRef.current) / 1000;
    const p = Math.min(1, Math.max(0, elapsed / DURATION_SECONDS));

    // Continuous cubic speed curve: distance = 125 * p^3
    const easeInCubic = p * p * p;
    const distance = 125 * easeInCubic;

    // 1. Continuous FOV 50 -> 85 over p 0.10 - 0.85 with cubic easing
    if (state.camera instanceof THREE.PerspectiveCamera) {
      if (p <= 0.1) {
        state.camera.fov = 50;
      } else if (p <= 0.85) {
        const q = (p - 0.1) / 0.75;
        state.camera.fov = 50 + 35 * (q * q * q);
      } else {
        state.camera.fov = 85;
      }
      state.camera.updateProjectionMatrix();

      // Subtle high-speed camera shake peaking near p 0.80
      if (p >= 0.2 && p <= 0.85) {
        const q = (p - 0.2) / 0.65;
        const shake = 0.05 * (q * q);
        state.camera.position.x = (Math.random() - 0.5) * shake;
        state.camera.position.y = (Math.random() - 0.5) * shake;
      } else {
        state.camera.position.x = 0;
        state.camera.position.y = 0;
      }
    }

    // 2. Cloud Material Brightening as speed increases
    const mat = meshRef.current.material as THREE.MeshBasicMaterial;
    if (mat) {
      const brightness = 1.0 + easeInCubic * 0.45;
      mat.color.setRGB(brightness, brightness, brightness);
    }

    // 3. Move all clouds forward without recycling
    for (let i = 0; i < CLOUD_COUNT; i++) {
      const c = clouds[i];
      const z = c.startZ + distance;

      // Clouds that pass camera (z > -1) stay behind it and fade out to scale 0
      let scale = c.size;
      if (z > -1) {
        const fade = Math.max(0, 1 - (z - -1) / 4.0);
        scale = c.size * fade;
      }

      dummy.position.set(c.x, c.y, z);
      dummy.rotation.set(0, 0, c.rotZ);
      dummy.scale.set(scale, scale, 1);
      dummy.updateMatrix();

      meshRef.current.setMatrixAt(i, dummy.matrix);
    }
    meshRef.current.instanceMatrix.needsUpdate = true;

    // 4. Overlap phase: Mount main app underneath wash at p = 0.70
    if (p >= 0.7 && !hasMountedAppRef.current) {
      hasMountedAppRef.current = true;
      onMountMainApp?.();
    }

    // 5. White-blue wash overlay (#EAF2FF):
    // Fades in over p 0.70 - 0.85, fades out over p 0.85 - 1.00
    let washOpacity = 0;
    if (p >= 0.7 && p < 0.85) {
      washOpacity = (p - 0.7) / 0.15;
    } else if (p >= 0.85 && p <= 1.0) {
      washOpacity = 1 - (p - 0.85) / 0.15;
    }
    if (washRef.current) {
      washRef.current.style.opacity = washOpacity.toFixed(3);
    }

    // 6. Peripheral speed lines overlay
    let speedLineOpacity = 0;
    if (p >= 0.2 && p < 0.75) {
      const q = (p - 0.2) / 0.55;
      speedLineOpacity = Math.pow(q, 2.2) * 0.65;
    } else if (p >= 0.75 && p <= 0.85) {
      speedLineOpacity = (1 - (p - 0.75) / 0.1) * 0.65;
    }
    if (speedLineRef.current) {
      speedLineRef.current.style.opacity = speedLineOpacity.toFixed(3);
    }

    // 7. Complete at p = 1.0
    if (p >= 1.0 && !hasCompletedRef.current) {
      hasCompletedRef.current = true;
      onComplete?.();
    }
  });

  return (
    <instancedMesh
      ref={meshRef}
      args={[undefined, undefined, CLOUD_COUNT]}
      frustumCulled={false}
    >
      <planeGeometry args={[1, 1]} />
      <meshBasicMaterial
        map={texture}
        transparent={true}
        opacity={0.75}
        depthWrite={false}
        blending={THREE.NormalBlending}
      />
    </instancedMesh>
  );
};

export interface CloudTransitionProps {
  startTimeRef: React.MutableRefObject<number | null>;
  onMountMainApp?: () => void;
  onComplete?: () => void;
}

/**
 * Full-screen Three.js CloudTransition overlay:
 * Rendered ONCE at the App root with a stable key.
 * Driven by one unified clock (progress p = clamp(elapsed / 2.4, 0, 1)).
 * No recycling, no pause, no React state updates per frame.
 */
export const CloudTransition: React.FC<CloudTransitionProps> = ({
  startTimeRef,
  onMountMainApp,
  onComplete,
}) => {
  const reducedMotion = useReducedMotion();
  const washRef = useRef<HTMLDivElement>(null);
  const speedLineRef = useRef<HTMLDivElement>(null);
  const whooshStartedRef = useRef(false);

  // Play Tone.js wind whoosh exactly once, idempotent under StrictMode
  useEffect(() => {
    if (reducedMotion || whooshStartedRef.current) return;
    whooshStartedRef.current = true;
    const cleanup = playTransitionWhoosh(DURATION_SECONDS);
    return () => {
      cleanup();
    };
  }, [reducedMotion]);

  // Handle prefers-reduced-motion: clean 300ms cross-fade, no clouds
  useEffect(() => {
    if (!reducedMotion) return;

    let animId: number;
    const start = performance.now();

    const tick = () => {
      const elapsed = (performance.now() - start) / 1000;
      if (elapsed < 0.15) {
        if (washRef.current) {
          washRef.current.style.opacity = (elapsed / 0.15).toFixed(3);
        }
      } else if (elapsed < 0.3) {
        onMountMainApp?.();
        if (washRef.current) {
          washRef.current.style.opacity = (1 - (elapsed - 0.15) / 0.15).toFixed(3);
        }
      } else {
        if (washRef.current) {
          washRef.current.style.opacity = '0';
        }
        onComplete?.();
        return;
      }
      animId = requestAnimationFrame(tick);
    };

    animId = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(animId);
    };
  }, [reducedMotion, onMountMainApp, onComplete]);

  if (reducedMotion) {
    return (
      <div
        ref={washRef}
        aria-hidden="true"
        className="fixed inset-0 z-50 pointer-events-none bg-black opacity-0"
      />
    );
  }

  return (
    <div
      aria-hidden="true"
      data-testid="cloud-transition-overlay"
      className="fixed inset-0 z-50 pointer-events-none overflow-hidden select-none"
    >
      {/* Capped DPR at 1.5 for silky 60fps performance */}
      <Canvas
        dpr={[1, 1.5]}
        gl={{ antialias: false, alpha: true, powerPreference: 'high-performance' }}
        camera={{ position: [0, 0, 0], fov: 50, near: 0.5, far: 200 }}
        style={{ width: '100%', height: '100%' }}
      >
        <SingleTunnelMesh
          startTimeRef={startTimeRef}
          onMountMainApp={onMountMainApp}
          onComplete={onComplete}
          washRef={washRef}
          speedLineRef={speedLineRef}
        />
      </Canvas>

      {/* Radial speed lines in the periphery: opacity driven via ref (zero React state per frame) */}
      <div
        ref={speedLineRef}
        className="absolute inset-0 pointer-events-none opacity-0"
        style={{
          background:
            'radial-gradient(circle at 50% 50%, rgba(255,255,255,0) 25%, rgba(220,235,255,0.4) 60%, rgba(200,225,255,0.85) 100%)',
          mixBlendMode: 'screen',
        }}
      />

      {/* Atmospheric Wash Overlay (#EAF2FF): opacity driven via ref */}
      <div
        ref={washRef}
        className="absolute inset-0 pointer-events-none opacity-0"
        style={{
          backgroundColor: '#EAF2FF',
        }}
      />
    </div>
  );
};

export default CloudTransition;
