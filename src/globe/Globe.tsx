import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Stars } from '@react-three/drei';
import * as THREE from 'three';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { useJukebox, useReducedMotion } from '@/store/useJukebox';
import { DataLayer } from './DataLayer';
import { ScanLine } from './ScanLine';
import { Picker } from './Picker';

// Constant Sun position and direction (Upper-left, slightly towards camera)
const SUN_POSITION: [number, number, number] = [-5, 3, 2];
const SUN_DIRECTION = new THREE.Vector3(...SUN_POSITION).normalize();

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
 * Atmosphere component rendering a delicate back-side sphere with subtle Fresnel glow (#5EA8FF).
 * Creates a razor-thin atmospheric blue limb around the planet.
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
          float dotProduct = dot(vNormal, vViewDir);
          float intensity = 1.0 + dotProduct;
          intensity = clamp(intensity, 0.0, 1.0);
          intensity = pow(intensity, 3.2);
          gl_FragColor = vec4(uColor, intensity * 0.55);
        }
      `,
      uniforms: {
        uColor: { value: new THREE.Color('#5EA8FF') },
      },
      blending: THREE.AdditiveBlending,
      side: THREE.BackSide,
      transparent: true,
      depthWrite: false,
    });
  }, []);

  return (
    <mesh>
      <sphereGeometry args={[1.025, 64, 64]} />
      <primitive object={atmosphereMaterial} attach="material" />
    </mesh>
  );
};

/**
 * Clouds component rendering an atmospheric cloud layer at radius 1.01.
 * Rotates very slowly relative to the Earth basemap. Skips gracefully if texture is missing.
 */
const Clouds: React.FC = () => {
  const { gl } = useThree();
  const maxAnisotropy = useMemo(() => gl.capabilities.getMaxAnisotropy(), [gl]);
  const [cloudTexture, setCloudTexture] = useState<THREE.Texture | null>(null);
  const cloudMeshRef = useRef<THREE.Mesh>(null);

  useEffect(() => {
    let isMounted = true;
    const loader = new THREE.TextureLoader();

    loader.load(
      '/textures/earth_clouds.png',
      (tex) => {
        if (!isMounted) return;
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.anisotropy = maxAnisotropy;
        tex.wrapS = THREE.RepeatWrapping;
        tex.wrapT = THREE.ClampToEdgeWrapping;
        setCloudTexture(tex);
      },
      undefined,
      () => {
        // Skip gracefully if file is not present
        if (isMounted) setCloudTexture(null);
      }
    );

    return () => {
      isMounted = false;
    };
  }, [maxAnisotropy]);

  // Very slow cloud rotation relative to the surface
  useFrame((_, delta) => {
    if (cloudMeshRef.current) {
      cloudMeshRef.current.rotation.y += delta * 0.003;
    }
  });

  if (!cloudTexture) return null;

  return (
    <mesh ref={cloudMeshRef}>
      <sphereGeometry args={[1.01, 64, 64]} />
      <meshStandardMaterial
        map={cloudTexture}
        transparent={true}
        opacity={0.35}
        depthWrite={false}
        blending={THREE.NormalBlending}
      />
    </mesh>
  );
};

/**
 * EarthSphere component rendering a photorealistic 3D planet:
 * - NASA Blue Marble daytime diffuse map
 * - Terrain elevation bump map with bumpScale 0.03
 * - Specular water map giving oceans a soft sunlight reflection glint while land stays matte
 * - Blended night city lights on the dark hemisphere with soft terminator
 * - Renderer maximum texture anisotropy and SRGB color space
 */
const EarthSphere: React.FC = () => {
  const { gl } = useThree();
  const maxAnisotropy = useMemo(() => gl.capabilities.getMaxAnisotropy(), [gl]);
  const fallbackTexture = useMemo(() => createFallbackGridTexture(), []);

  const [textures, setTextures] = useState<{
    day: THREE.Texture | null;
    night: THREE.Texture | null;
    bump: THREE.Texture | null;
    specular: THREE.Texture | null;
  }>({
    day: null,
    night: null,
    bump: null,
    specular: null,
  });

  useEffect(() => {
    let isMounted = true;
    const loader = new THREE.TextureLoader();

    const configureTexture = (tex: THREE.Texture, isSrgb: boolean) => {
      tex.colorSpace = isSrgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
      tex.anisotropy = maxAnisotropy;
      tex.wrapS = THREE.RepeatWrapping;
      tex.wrapT = THREE.ClampToEdgeWrapping;
    };

    // 1. Day texture
    loader.load(
      '/textures/earth_day.jpg',
      (tex) => {
        if (!isMounted) return;
        configureTexture(tex, true);
        setTextures((prev) => ({ ...prev, day: tex }));
      },
      undefined,
      () => {
        if (isMounted) setTextures((prev) => ({ ...prev, day: fallbackTexture }));
      }
    );

    // 2. Night city lights
    loader.load(
      '/textures/earth_night.jpg',
      (tex) => {
        if (!isMounted) return;
        configureTexture(tex, true);
        setTextures((prev) => ({ ...prev, night: tex }));
      },
      undefined,
      () => {
        if (isMounted) setTextures((prev) => ({ ...prev, night: null }));
      }
    );

    // 3. Bump elevation map
    loader.load(
      '/textures/earth_bump.jpg',
      (tex) => {
        if (!isMounted) return;
        configureTexture(tex, false);
        setTextures((prev) => ({ ...prev, bump: tex }));
      },
      undefined,
      () => {
        if (isMounted) setTextures((prev) => ({ ...prev, bump: null }));
      }
    );

    // 4. Specular water mask (white = water glint, black = matte land)
    loader.load(
      '/textures/earth_water.png',
      (tex) => {
        if (!isMounted) return;
        configureTexture(tex, false);
        setTextures((prev) => ({ ...prev, specular: tex }));
      },
      undefined,
      () => {
        if (isMounted) setTextures((prev) => ({ ...prev, specular: null }));
      }
    );

    return () => {
      isMounted = false;
    };
  }, [fallbackTexture, maxAnisotropy]);

  const material = useMemo(() => {
    const mat = new THREE.MeshPhongMaterial({
      map: textures.day ?? fallbackTexture,
      bumpMap: textures.bump ?? undefined,
      bumpScale: 0.03,
      specularMap: textures.specular ?? undefined,
      specular: new THREE.Color('#384858'),
      shininess: 24,
    });

    mat.onBeforeCompile = (shader) => {
      shader.uniforms.tNight = { value: textures.night };
      shader.uniforms.uSunDirection = { value: SUN_DIRECTION };
      shader.uniforms.uHasNight = { value: textures.night ? 1.0 : 0.0 };

      shader.vertexShader = `
        varying vec3 vWorldNormalCustom;
        ${shader.vertexShader}
      `.replace(
        '#include <worldpos_vertex>',
        `#include <worldpos_vertex>
         vWorldNormalCustom = normalize(mat3(modelMatrix) * normal);`
      );

      shader.fragmentShader = `
        uniform sampler2D tNight;
        uniform vec3 uSunDirection;
        uniform float uHasNight;
        varying vec3 vWorldNormalCustom;
        ${shader.fragmentShader}
      `.replace(
        '#include <dithering_fragment>',
        `#include <dithering_fragment>
         if (uHasNight > 0.5) {
           float sunDot = dot(normalize(vWorldNormalCustom), normalize(uSunDirection));
           // Soft terminator: city lights smoothly glow on the shadowed hemisphere
           float nightFactor = smoothstep(0.12, -0.15, sunDot);
           vec4 nightCol = texture2D(tNight, vUv);
           gl_FragColor.rgb += nightCol.rgb * nightFactor * 1.5;
         }`
      );

      mat.userData.shader = shader;
    };

    return mat;
  }, [textures, fallbackTexture]);

  // Keep uniforms up-to-date if night texture arrives after shader compilation
  useEffect(() => {
    if (material.userData.shader) {
      material.userData.shader.uniforms.tNight.value = textures.night;
      material.userData.shader.uniforms.uHasNight.value = textures.night ? 1.0 : 0.0;
    }
  }, [textures.night, material]);

  return (
    <mesh>
      <sphereGeometry args={[1, 128, 128]} />
      <primitive object={material} attach="material" />
    </mesh>
  );
};

/**
 * 3D Interactive Earth Globe for the Earth Information Jukebox.
 * Features:
 * - Realistic Earth basemap with day/night terminator, city lights, bump relief & ocean glint
 * - Drifting atmospheric cloud layer (radius 1.01)
 * - Faint / on-demand DataLayer (radius 1.005) with 400ms fade and sweep focus band
 * - Glowing meridian ScanLine (radius 1.008) tied to playhead with transient Zustand subscription
 * - Raycast Picker (radius 1.006) with ring cursor marker (radius 1.012)
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

  // Keyboard shortcut: 'L' toggles data layer overlay
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
