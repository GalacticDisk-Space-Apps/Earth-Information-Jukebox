import React, { useMemo, useRef } from 'react';
import { useFrame, type ThreeEvent } from '@react-three/fiber';
import * as THREE from 'three';
import { useCursor, useJukebox, useSelection } from '@/store/useJukebox';
import { latLonToVector3, pointToLatLon } from './pick';

interface PickerProps {
  globeRef?: React.RefObject<THREE.Object3D>;
}

/**
 * Animated Selection Pin with a glowing core and repeating pulse wave ring.
 */
const SelectionPin: React.FC<{ lat: number; lon: number }> = ({ lat, lon }) => {
  const pulseMeshRef = useRef<THREE.Mesh>(null);
  const pulseMatRef = useRef<THREE.MeshBasicMaterial>(null);

  const { pos, quaternion } = useMemo(() => {
    const p = latLonToVector3(lat, lon, 1.013);
    const normal = p.clone().normalize();
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), normal);
    return { pos: p, quaternion: q };
  }, [lat, lon]);

  // Expanding ring pulse animation repeating while selected
  useFrame((state) => {
    if (!pulseMeshRef.current || !pulseMatRef.current) return;
    const period = 1.4; // 1.4 second cycle
    const phase = (state.clock.elapsedTime % period) / period;
    const scale = 1.0 + phase * 3.2;
    const opacity = Math.max(0, (1 - phase) * 0.85);

    pulseMeshRef.current.scale.set(scale, scale, 1);
    pulseMatRef.current.opacity = opacity;
  });

  return (
    <group position={pos} quaternion={quaternion}>
      {/* Expanding pulse wave */}
      <mesh ref={pulseMeshRef}>
        <ringGeometry args={[0.009, 0.013, 32]} />
        <meshBasicMaterial
          ref={pulseMatRef}
          color="#38BDF8"
          side={THREE.DoubleSide}
          transparent
          depthTest={true}
          depthWrite={false}
        />
      </mesh>

      {/* Outer pin boundary ring */}
      <mesh>
        <ringGeometry args={[0.008, 0.012, 32]} />
        <meshBasicMaterial
          color="#38BDF8"
          side={THREE.DoubleSide}
          transparent
          opacity={0.9}
          depthTest={true}
          depthWrite={false}
        />
      </mesh>

      {/* Glowing core dot */}
      <mesh>
        <circleGeometry args={[0.006, 24]} />
        <meshBasicMaterial
          color="#FFFFFF"
          side={THREE.DoubleSide}
          transparent
          opacity={1.0}
          depthTest={true}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
};

/**
 * Picker component handling raycast picking over the globe on pointer move/drag/click.
 * - Distinguishes click from drag: only clicks (< 5px pointer movement) select points.
 * - Shows cursor ring on hover and glowing pulsing pin at selected coordinate.
 */
export const Picker: React.FC<PickerProps> = ({ globeRef }) => {
  const cursor = useCursor();
  const selection = useSelection();
  const setCursor = useJukebox((s) => s.setCursor);
  const selectPoint = useJukebox((s) => s.selectPoint);

  const pointerDownCoordRef = useRef<{ x: number; y: number } | null>(null);

  // Hover ring marker transform calculated tangent to the spherical surface
  const markerData = useMemo(() => {
    if (!cursor) return null;
    const pos = latLonToVector3(cursor.lat, cursor.lon, 1.012);
    const normal = pos.clone().normalize();
    const quaternion = new THREE.Quaternion().setFromUnitVectors(
      new THREE.Vector3(0, 0, 1),
      normal
    );
    return { pos, quaternion };
  }, [cursor]);

  const handlePointerDown = (e: ThreeEvent<PointerEvent>) => {
    pointerDownCoordRef.current = { x: e.clientX, y: e.clientY };
    const latLon = pointToLatLon(e.point, globeRef?.current);
    setCursor(latLon);
  };

  const handlePointerUp = (e: ThreeEvent<PointerEvent>) => {
    if (pointerDownCoordRef.current) {
      const dx = e.clientX - pointerDownCoordRef.current.x;
      const dy = e.clientY - pointerDownCoordRef.current.y;
      const dist = Math.hypot(dx, dy);

      // Only treat as click if moved less than 5px (dragging rotates the globe)
      if (dist < 5) {
        const latLon = pointToLatLon(e.point, globeRef?.current);
        selectPoint(latLon.lat, latLon.lon);
      }
    }
    pointerDownCoordRef.current = null;
  };

  const handlePointerMove = (e: ThreeEvent<PointerEvent>) => {
    const latLon = pointToLatLon(e.point, globeRef?.current);
    setCursor(latLon);
  };

  const handlePointerLeave = () => {
    pointerDownCoordRef.current = null;
    setCursor(null);
  };

  return (
    <group>
      {/* 
        Transparent sphere mesh acting as raycast interaction hit area.
        Radius 1.006 sits slightly above DataLayer (1.005) to capture hits cleanly.
      */}
      <mesh
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerMove={handlePointerMove}
        onPointerLeave={handlePointerLeave}
        visible={true}
      >
        <sphereGeometry args={[1.006, 64, 64]} />
        <meshBasicMaterial
          transparent
          opacity={0}
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Visual Cursor Ring Marker for hover / keyboard navigation */}
      {markerData && !selection && (
        <group position={markerData.pos} quaternion={markerData.quaternion}>
          <mesh>
            <ringGeometry args={[0.016, 0.024, 32]} />
            <meshBasicMaterial
              color="#FBBF24"
              side={THREE.DoubleSide}
              transparent
              opacity={0.9}
              depthTest={true}
              depthWrite={false}
            />
          </mesh>
          <mesh>
            <circleGeometry args={[0.005, 16]} />
            <meshBasicMaterial
              color="#FFFFFF"
              side={THREE.DoubleSide}
              transparent
              opacity={0.95}
              depthTest={true}
              depthWrite={false}
            />
          </mesh>
        </group>
      )}

      {/* Selected Coordinate Pin with expanding pulse wave */}
      {selection && <SelectionPin lat={selection.lat} lon={selection.lon} />}
    </group>
  );
};

export default Picker;
