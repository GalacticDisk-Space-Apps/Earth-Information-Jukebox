import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Stars } from '@react-three/drei';
import * as THREE from 'three';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { useReducedMotion } from '@/store/useJukebox';
import { DataLayer } from './DataLayer';
import { ScanLine } from './ScanLine';
import { Picker } from './Picker';
import { cameraPresetOrder, createCameraPresets } from './cameraPresets';
import { limitTextureSize } from './textureSize';

const sunPosition: [number, number, number] = [5, 3, 5];
const audioModules = import.meta.glob<{ getLevel?: () => number }>(
  ['../audio/index.ts', '../audio/index.tsx', '../audio/AudioEngine.tsx'],
  { eager: true },
);
const getLevel = Object.values(audioModules).find((module) => typeof module.getLevel === 'function')?.getLevel;


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
        uniform float uIntensity;

        void main() {
          // With BackSide, the interior is occluded by Earth (radius 1.0).
          // Outer rim grazing angles produce dot product near zero.
          float dotProduct = dot(vNormal, vViewDir);
          float intensity = 1.0 + dotProduct;
          intensity = clamp(intensity, 0.0, 1.0);
          intensity = pow(intensity, 2.2);
          gl_FragColor = vec4(uColor, intensity * 0.7 * uIntensity);
        }
      `,
      uniforms: {
        uColor: { value: new THREE.Color('#4F8BFF') },
        uIntensity: { value: 1 },
      },
      blending: THREE.AdditiveBlending,
      side: THREE.BackSide,
      transparent: true,
      depthWrite: false,
    });
  }, []);

  useEffect(() => () => atmosphereMaterial.dispose(), [atmosphereMaterial]);
  useFrame(() => {
    if (!getLevel) return;
    const level = getLevel();
    if (Number.isFinite(level)) atmosphereMaterial.uniforms.uIntensity.value = 0.8 + level * 0.4;
  });

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
  const maxTextureSize = useThree((state) => state.gl.capabilities.maxTextureSize);
  const material = useMemo(() => new THREE.MeshStandardMaterial({ roughness: 0.7, metalness: 0.1 }), []);

  useEffect(() => {
    let mounted = true;
    const loader = new THREE.TextureLoader();
    let dayTexture = createFallbackGridTexture();
    let nightTexture: THREE.Texture | undefined;
    const sunDirection = new THREE.Vector3(...sunPosition).normalize();
    material.map = dayTexture;
    material.needsUpdate = true;

    function loadTexture(url: string, apply: (texture: THREE.Texture) => void) {
      loader.load(url, (texture) => {
        if (!mounted) {
          texture.dispose();
          return;
        }
        limitTextureSize(texture, maxTextureSize);
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.wrapS = THREE.RepeatWrapping;
        apply(texture);
        material.needsUpdate = true;
      }, undefined, () => {
        // Keep the existing basemap when an optional image is unavailable.
      });
    }

    loadTexture('/textures/earth_day.jpg', (texture) => {
      dayTexture.dispose();
      dayTexture = texture;
      material.map = texture;
    });

    loadTexture('/textures/earth_night.jpg', (texture) => {
      nightTexture = texture;
      material.onBeforeCompile = (shader) => {
        shader.uniforms.uNightMap = { value: texture };
        shader.uniforms.uSunDirection = { value: sunDirection };
        shader.vertexShader = /* glsl */ `
          varying vec2 vNightUv;
          varying vec3 vWorldNormal;
        ` + shader.vertexShader.replace('#include <begin_vertex>', /* glsl */ `
          #include <begin_vertex>
          vNightUv = uv;
          vWorldNormal = mat3(modelMatrix) * normal;
        `);
        shader.fragmentShader = /* glsl */ `
          uniform sampler2D uNightMap;
          uniform vec3 uSunDirection;
          varying vec2 vNightUv;
          varying vec3 vWorldNormal;
        ` + shader.fragmentShader.replace('#include <opaque_fragment>', /* glsl */ `
          float sunlight = dot(normalize(vWorldNormal), uSunDirection);
          float nightBlend = 1.0 - smoothstep(-0.15, 0.10, sunlight);
          outgoingLight = mix(outgoingLight, texture2D(uNightMap, vNightUv).rgb, nightBlend);
          #include <opaque_fragment>
        `);
      };
    });

    return () => {
      mounted = false;
      material.map = null;
      material.onBeforeCompile = THREE.Material.prototype.onBeforeCompile;
      dayTexture.dispose();
      nightTexture?.dispose();
      material.dispose();
    };
  }, [material, maxTextureSize]);

  return (
    <mesh>
      <sphereGeometry args={[1, 96, 64]} />
      <primitive object={material} attach="material" />
    </mesh>
  );
};

function CameraMotion({
  cinematic,
  autoRotate,
  controlsRef,
  presets,
}: {
  cinematic: boolean;
  autoRotate: boolean;
  controlsRef: React.RefObject<OrbitControlsImpl>;
  presets: ReturnType<typeof createCameraPresets>;
}) {
  const orbitSpeed = useRef(0);
  useEffect(() => {
    if (!cinematic) {
      presets.cancel();
      orbitSpeed.current = 0;
      return;
    }

    let index = 0;
    const cycle = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.repeat || event.altKey || event.ctrlKey || event.metaKey ||
          event.key.toLowerCase() !== 'c' ||
          (event.target instanceof HTMLElement &&
            (event.target.isContentEditable || event.target.closest('input, textarea, select')))) return;
      presets.flyTo(cameraPresetOrder[index]);
      index = (index + 1) % cameraPresetOrder.length;
    };

    window.addEventListener('keydown', cycle);
    return () => window.removeEventListener('keydown', cycle);
  }, [cinematic, presets]);

  useFrame((_, delta) => {
    const controls = controlsRef.current;
    if (!controls || !cinematic) return;
    if (presets.update(controls, delta)) {
      orbitSpeed.current = 0;
      controls.object.lookAt(controls.target);
      return;
    }

    orbitSpeed.current = THREE.MathUtils.damp(orbitSpeed.current, autoRotate ? 0.009 : 0, 2, delta);
    if (orbitSpeed.current < 0.00001) return;
    const offset = controls.object.position.sub(controls.target);
    offset.applyAxisAngle(THREE.Object3D.DEFAULT_UP, -orbitSpeed.current * delta).add(controls.target);
    controls.object.lookAt(controls.target);
  });

  return null;
}

export interface GlobeProps {
  cinematic?: boolean;
}

export const Globe: React.FC<GlobeProps> = ({
  cinematic = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('cinematic') === '1',
}) => {
  const presets = useMemo(createCameraPresets, []);
  const reducedMotion = useReducedMotion();
  const [autoRotate, setAutoRotate] = useState(!reducedMotion);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const controlsRef = useRef<OrbitControlsImpl>(null);
  const globeGroupRef = useRef<THREE.Group>(null);

  useEffect(() => {
    setAutoRotate(!reducedMotion);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [reducedMotion]);

  const handleStart = () => {
    presets.cancel();
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setAutoRotate(false);
  };

  const handleEnd = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (!reducedMotion) {
      timerRef.current = setTimeout(() => setAutoRotate(true), 4000);
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
        dpr={[1, 1.5]}
        gl={{ antialias: true, alpha: true }}
        camera={{ position: [0, 0, 2.5], fov: 45 }}
        style={{ width: '100%', height: '100%' }}
      >
        <Stars radius={100} depth={50} count={3000} factor={4} saturation={0} fade speed={1} />
        <ambientLight intensity={0.4} />
        <directionalLight position={sunPosition} intensity={1.8} />
        <directionalLight position={[-5, -3, -5]} intensity={0.3} color="#1E3A6D" />

        <group ref={globeGroupRef}>
          <EarthSphere />
          <DataLayer />
          <ScanLine />
          <Picker globeRef={globeGroupRef} />
        </group>

        <Atmosphere />
        <OrbitControls
          ref={controlsRef}
          enablePan={false}
          enableDamping
          dampingFactor={cinematic ? 0.035 : 0.05}
          minDistance={1.3}
          maxDistance={5.0}
          autoRotate={!cinematic && isAutoRotating}
          autoRotateSpeed={0.5}
          onStart={handleStart}
          onEnd={handleEnd}
        />
        <CameraMotion cinematic={cinematic} autoRotate={isAutoRotating} controlsRef={controlsRef} presets={presets} />
      </Canvas>
    </div>
  );
};

export default Globe;
