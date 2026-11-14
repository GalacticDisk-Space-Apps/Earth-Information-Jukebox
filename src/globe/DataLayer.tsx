import React, { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useJukebox } from '@/store/useJukebox';
import { FAKE_MODE, makeFakeGrid } from '@/data/fake';
import { limitTextureSize } from './textureSize';

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
 * Null values (such as land in ocean datasets) remain transparent.
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
        // Transparent for masked areas (allows underlying Earth texture to show through)
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
        data[pixelIdx + 3] = 230; // 0.9 base alpha
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
  uniform float uOpacity;
  varying vec2 vUv;

  void main() {
    vec4 colPrev = texture2D(uPrevTexture, vUv);
    vec4 colCurr = texture2D(uCurrTexture, vUv);
    vec4 mixedColor = mix(colPrev, colCurr, uBlend);
    gl_FragColor = vec4(mixedColor.rgb, mixedColor.a * uOpacity);
  }
`;

/**
 * DataLayer component rendering the current satellite dataset frame onto a transparent
 * sphere of radius 1.005, with 400ms cross-fading between frame/track changes.
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

  // Shader material
  const material = useMemo(() => {
    return new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: {
        uPrevTexture: { value: emptyTexture },
        uCurrTexture: { value: emptyTexture },
        uBlend: { value: 1.0 },
        uOpacity: { value: 0.85 },
      },
      transparent: true,
      depthWrite: false,
      side: THREE.FrontSide,
    });
  }, [emptyTexture]);

  const maxTextureSize = useThree((state) => state.gl.capabilities.maxTextureSize);

  useEffect(() => () => {
    const textures = new Set([emptyTexture, prevTextureRef.current, currTextureRef.current]);
    textures.forEach((texture) => texture.dispose());
    prevTextureRef.current = emptyTexture;
    currTextureRef.current = emptyTexture;
    material.dispose();
  }, [emptyTexture, material]);

  useEffect(() => {
    let isMounted = true;

    function transitionTo(texture: THREE.Texture) {
      const previous = prevTextureRef.current;
      if (previous !== emptyTexture && previous !== currTextureRef.current) previous.dispose();
      prevTextureRef.current = currTextureRef.current;
      currTextureRef.current = texture;
      material.uniforms.uPrevTexture.value = prevTextureRef.current;
      material.uniforms.uCurrTexture.value = texture;
      material.uniforms.uBlend.value = 0;
      blendRef.current = 0;
      isTransitioningRef.current = true;
    }

    if (FAKE_MODE || !activeTrack || !activeFrameDate) {
      transitionTo(createFakeGridTexture(frameIndex));
    } else {
      const texturePath = `/data/${activeTrack.id}/frames/${activeFrameDate}.webp`;
      new THREE.TextureLoader().load(
        texturePath,
        (texture) => {
          if (!isMounted) {
            texture.dispose();
            return;
          }
          limitTextureSize(texture, maxTextureSize);
          texture.colorSpace = THREE.SRGBColorSpace;
          texture.wrapS = THREE.RepeatWrapping;
          texture.minFilter = THREE.LinearFilter;
          texture.generateMipmaps = false;
          transitionTo(texture);
        },
        undefined,
        () => {
          if (isMounted) transitionTo(createFakeGridTexture(frameIndex));
        },
      );
    }

    return () => {
      isMounted = false;
    };
  }, [activeTrack, activeFrameDate, emptyTexture, frameIndex, material, maxTextureSize]);

  // Animate 400ms crossfade over delta time
  useFrame((_, delta) => {
    if (isTransitioningRef.current) {
      // 0.4s (400ms) crossfade
      blendRef.current = Math.min(1.0, blendRef.current + delta / 0.4);
      material.uniforms.uBlend.value = blendRef.current;

      if (blendRef.current >= 1.0) {
        isTransitioningRef.current = false;
        const previous = prevTextureRef.current;
        if (previous !== emptyTexture && previous !== currTextureRef.current) previous.dispose();
        prevTextureRef.current = currTextureRef.current;
        material.uniforms.uPrevTexture.value = currTextureRef.current;
      }
    }
  });

  return (
    <mesh>
      <sphereGeometry args={[1.005, 96, 64]} />
      <primitive object={material} attach="material" />
    </mesh>
  );
};

export default DataLayer;
