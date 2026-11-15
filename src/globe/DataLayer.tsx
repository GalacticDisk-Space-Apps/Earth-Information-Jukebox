import React, { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useJukebox } from '@/store/useJukebox';
import { FAKE_MODE, makeFakeGrid } from '@/data/fake';

/**
 * Creates an empty transparent 1x1 fallback texture.
 */
function createEmptyTexture(): THREE.Texture {
  if (typeof document === 'undefined') {
    return new THREE.Texture();
  }
  const canvas = document.createElement('canvas');
  canvas.width = 1;
  canvas.height = 1;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.clearRect(0, 0, 1, 1);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/**
 * Generates an equirectangular CanvasTexture from a ValueGrid with a blue-to-red color ramp.
 * Row 0 is 90°N (top), Col 0 is 180°W (left edge).
 * Null values (such as continental land in ocean datasets) remain 100% transparent (alpha 0)
 * so the photorealistic Blue Marble Earth underneath shows through untouched.
 */
export function createFakeGridTexture(frameIndex: number): THREE.Texture {
  if (typeof document === 'undefined') {
    return new THREE.Texture();
  }

  const grid = makeFakeGrid(frameIndex);
  const canvas = document.createElement('canvas');
  canvas.width = grid.w;
  canvas.height = grid.h;
  const ctx = canvas.getContext('2d');
  if (!ctx) return new THREE.Texture();

  const imgData = ctx.createImageData(grid.w, grid.h);
  const data = imgData.data;

  // Track min/max bounds for synthetic temperature gradient (-2°C to 35°C)
  const minVal = -2;
  const maxVal = 35;
  const range = maxVal - minVal;

  for (let y = 0; y < grid.h; y++) {
    for (let x = 0; x < grid.w; x++) {
      const gridIdx = y * grid.w + x;
      const pixelIdx = (y * grid.w + x) * 4;
      const val = grid.values[gridIdx];

      if (val === null) {
        // Zero alpha for masked/no-data areas (allows real Earth terrain to show through)
        data[pixelIdx] = 0;
        data[pixelIdx + 1] = 0;
        data[pixelIdx + 2] = 0;
        data[pixelIdx + 3] = 0;
      } else {
        // Normalized 0..1 scalar
        const t = Math.max(0, Math.min(1, (val - minVal) / range));

        // Smooth Blue -> Cyan -> Yellow -> Red color ramp
        let r = 0;
        let g = 0;
        let b = 0;

        if (t < 0.25) {
          const s = t / 0.25;
          r = Math.round(20 * (1 - s));
          g = Math.round(50 + 150 * s);
          b = Math.round(200 + 55 * s);
        } else if (t < 0.5) {
          const s = (t - 0.25) / 0.25;
          r = Math.round(40 * s);
          g = Math.round(200 + 40 * s);
          b = Math.round(255 * (1 - s));
        } else if (t < 0.75) {
          const s = (t - 0.5) / 0.25;
          r = Math.round(40 + 215 * s);
          g = Math.round(240 - 40 * s);
          b = 0;
        } else {
          const s = (t - 0.75) / 0.25;
          r = Math.round(255 - 25 * s);
          g = Math.round(200 * (1 - s));
          b = Math.round(20 * (1 - s));
        }

        data[pixelIdx] = r;
        data[pixelIdx + 1] = g;
        data[pixelIdx + 2] = b;
        data[pixelIdx + 3] = 255; // Full alpha on data points
      }
    }
  }

  ctx.putImageData(imgData, 0, 0);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = false;
  texture.needsUpdate = true;
  return texture;
}

const vertexShader = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const fragmentShader = `
  uniform sampler2D uPrevTexture;
  uniform sampler2D uCurrTexture;
  uniform float uBlend;
  uniform float uCurrentBaseOpacity;
  uniform float uActiveOpacity;
  uniform float uScanLon;
  uniform float uIsSweepActive;
  uniform float uBandWidth;
  varying vec2 vUv;

  void main() {
    vec4 colPrev = texture2D(uPrevTexture, vUv);
    vec4 colCurr = texture2D(uCurrTexture, vUv);
    vec4 dataCol = mix(colPrev, colCurr, uBlend);

    // If pixel has no data (alpha <= 0.01), discard so the realistic Earth underneath is 100% visible
    if (dataCol.a <= 0.01) {
      discard;
    }

    // Equirectangular fragment longitude in degrees (-180° to +180°)
    float fragLon = vUv.x * 360.0 - 180.0;
    float lonDiff = abs(fragLon - uScanLon);
    if (lonDiff > 180.0) {
      lonDiff = 360.0 - lonDiff;
    }

    // Soft band around the scan-line (+-12 degrees, smoothly trailing off up to ~18 degrees)
    float bandFactor = 1.0 - smoothstep(uBandWidth * 0.7, uBandWidth * 1.5, lonDiff);

    // Determine local opacity:
    // - While sweep is active, the soft band under the scan-line shows data at full strength
    //   while the rest of the planet stays at uCurrentBaseOpacity (0.0 when toggled off).
    // - When sweep is idle, the entire overlay is at uCurrentBaseOpacity.
    float localOpacity = uCurrentBaseOpacity;
    if (uIsSweepActive > 0.5) {
      float sweepStrength = max(uCurrentBaseOpacity, uActiveOpacity);
      localOpacity = mix(uCurrentBaseOpacity, sweepStrength, bandFactor);
    }

    if (localOpacity <= 0.001) {
      discard;
    }

    gl_FragColor = vec4(dataCol.rgb, dataCol.a * localOpacity);
  }
`;

/**
 * DataLayer component rendering the NASA satellite dataset frame over the Earth.
 * Key properties:
 * - Does NOT dominate the planet: hidden / faint by default so real Earth is what people see first.
 * - Smoothly fades in and out over 400ms when toggled via showDataLayer (shortcut 'L').
 * - While the sweep is playing, only a soft band around the scan-line (+-12 deg lon) shows full
 *   data strength, leaving the rest of the planet realistic.
 * - No-data pixels have alpha 0, keeping Blue Marble land intact for ocean datasets.
 */
export const DataLayer: React.FC = () => {
  const trackId = useJukebox((s) => s.trackId);
  const frameIndex = useJukebox((s) => s.frameIndex);
  const tracks = useJukebox((s) => s.tracks);

  const activeTrack = useMemo(() => tracks.find((t) => t.id === trackId), [tracks, trackId]);
  const activeFrameDate = activeTrack?.frames?.[frameIndex] ?? null;

  const emptyTexture = useMemo(() => createEmptyTexture(), []);

  // Material state refs
  const prevTextureRef = useRef<THREE.Texture>(emptyTexture);
  const currTextureRef = useRef<THREE.Texture>(emptyTexture);
  const blendRef = useRef<number>(1.0);
  const isTransitioningRef = useRef<boolean>(false);

  // Transient store subscription refs to avoid React re-renders at 60Hz
  const playheadRef = useRef<number>(useJukebox.getState().playhead);
  const playingRef = useRef<boolean>(useJukebox.getState().playing);
  const modeRef = useRef<string>(useJukebox.getState().mode);
  const showDataLayerRef = useRef<boolean>(useJukebox.getState().showDataLayer);
  const dataLayerOpacityRef = useRef<number>(useJukebox.getState().dataLayerOpacity);

  // Current base opacity animated over 400ms (0.0 to dataLayerOpacity)
  const currentBaseOpacityRef = useRef<number>(
    useJukebox.getState().showDataLayer ? useJukebox.getState().dataLayerOpacity : 0.0
  );

  useEffect(() => {
    const unsub = useJukebox.subscribe((state) => {
      playheadRef.current = state.playhead;
      playingRef.current = state.playing;
      modeRef.current = state.mode;
      showDataLayerRef.current = state.showDataLayer;
      dataLayerOpacityRef.current = state.dataLayerOpacity;
    });
    return unsub;
  }, []);

  // Shader material
  const material = useMemo(() => {
    return new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: {
        uPrevTexture: { value: emptyTexture },
        uCurrTexture: { value: emptyTexture },
        uBlend: { value: 1.0 },
        uCurrentBaseOpacity: { value: 0.0 },
        uActiveOpacity: { value: 0.55 },
        uScanLon: { value: 0.0 },
        uIsSweepActive: { value: 0.0 },
        uBandWidth: { value: 12.0 },
      },
      transparent: true,
      depthWrite: false,
      side: THREE.FrontSide,
    });
  }, [emptyTexture]);

  // Load new texture whenever track or frame date changes
  useEffect(() => {
    let isMounted = true;

    if (FAKE_MODE || !activeTrack || !activeFrameDate) {
      // Procedurally generate fake dataset texture
      const newTex = createFakeGridTexture(frameIndex);

      // Start 400ms crossfade
      prevTextureRef.current = currTextureRef.current;
      currTextureRef.current = newTex;
      material.uniforms.uPrevTexture.value = prevTextureRef.current;
      material.uniforms.uCurrTexture.value = currTextureRef.current;
      blendRef.current = 0.0;
      isTransitioningRef.current = true;
    } else {
      // Real webp frame texture path: /data/<trackId>/frames/<date>.webp
      const texturePath = `/data/${activeTrack.id}/frames/${activeFrameDate}.webp`;
      const loader = new THREE.TextureLoader();

      loader.load(
        texturePath,
        (loadedTex) => {
          if (!isMounted) return;
          loadedTex.colorSpace = THREE.SRGBColorSpace;
          loadedTex.wrapS = THREE.RepeatWrapping;
          loadedTex.wrapT = THREE.ClampToEdgeWrapping;
          loadedTex.minFilter = THREE.LinearFilter;
          loadedTex.magFilter = THREE.LinearFilter;

          // Cross-fade to newly loaded texture
          prevTextureRef.current = currTextureRef.current;
          currTextureRef.current = loadedTex;
          material.uniforms.uPrevTexture.value = prevTextureRef.current;
          material.uniforms.uCurrTexture.value = currTextureRef.current;
          blendRef.current = 0.0;
          isTransitioningRef.current = true;
        },
        undefined,
        () => {
          // If frame file is not found, fallback to synthetic grid overlay
          if (!isMounted) return;
          const fallbackTex = createFakeGridTexture(frameIndex);
          prevTextureRef.current = currTextureRef.current;
          currTextureRef.current = fallbackTex;
          material.uniforms.uPrevTexture.value = prevTextureRef.current;
          material.uniforms.uCurrTexture.value = currTextureRef.current;
          blendRef.current = 0.0;
          isTransitioningRef.current = true;
        }
      );
    }

    return () => {
      isMounted = false;
    };
  }, [activeTrack, activeFrameDate, frameIndex, material]);

  // Animate cross-fades and smooth 400ms opacity transitions on every frame
  useFrame((_, delta) => {
    // 1. Frame crossfade animation (400ms)
    if (isTransitioningRef.current) {
      blendRef.current = Math.min(1.0, blendRef.current + delta / 0.4);
      material.uniforms.uBlend.value = blendRef.current;

      if (blendRef.current >= 1.0) {
        isTransitioningRef.current = false;
        prevTextureRef.current = currTextureRef.current;
        material.uniforms.uPrevTexture.value = currTextureRef.current;
      }
    }

    // 2. Smooth 400ms fade in / fade out for showDataLayer toggle
    const targetBaseOpacity = showDataLayerRef.current ? dataLayerOpacityRef.current : 0.0;
    const opacityDelta = (delta / 0.4) * (dataLayerOpacityRef.current || 0.55);

    if (currentBaseOpacityRef.current < targetBaseOpacity) {
      currentBaseOpacityRef.current = Math.min(
        targetBaseOpacity,
        currentBaseOpacityRef.current + opacityDelta
      );
    } else if (currentBaseOpacityRef.current > targetBaseOpacity) {
      currentBaseOpacityRef.current = Math.max(
        targetBaseOpacity,
        currentBaseOpacityRef.current - opacityDelta
      );
    }

    material.uniforms.uCurrentBaseOpacity.value = currentBaseOpacityRef.current;
    material.uniforms.uActiveOpacity.value = dataLayerOpacityRef.current;

    // 3. Scan-line position and sweep activity for soft focus band
    const lonDeg = playheadRef.current * 360 - 180;
    material.uniforms.uScanLon.value = lonDeg;

    const isSweepMode = modeRef.current === 'sweep' || modeRef.current === 'timelapse';
    material.uniforms.uIsSweepActive.value = playingRef.current && isSweepMode ? 1.0 : 0.0;
  });

  return (
    <mesh>
      <sphereGeometry args={[1.005, 128, 128]} />
      <primitive object={material} attach="material" />
    </mesh>
  );
};

export default DataLayer;
