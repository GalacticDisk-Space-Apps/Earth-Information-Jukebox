import React, { useMemo, useRef } from 'react';
import type { ThreeEvent } from '@react-three/fiber';
import * as THREE from 'three';
import { useCursor, useJukebox } from '@/store/useJukebox';
import { latLonToVector3, pointToLatLon } from './pick';

interface PickerProps {
  globeRef?: React.RefObject<THREE.Object3D>;
}

/**
 * Picker component handling raycast picking over the globe on pointer move/drag.
 * Converts intersection points to {lat, lon} and updates the Zustand store.
 * Renders a ring marker at the current cursor position, responding to both
 * pointer hover/drag and keyboard coordinate navigation.
 */
export const Picker: React.FC<PickerProps> = ({ globeRef }) => {
  const cursor = useCursor();
  const setCursor = useJukebox((s) => s.setCursor);
  const isPointerDownRef = useRef(false);

  // Ring marker transform calculated tangent to the spherical surface
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
    isPointerDownRef.current = true;
    const latLon = pointToLatLon(e.point, globeRef?.current);
    setCursor(latLon);
  };

  const handlePointerUp = () => {
    isPointerDownRef.current = false;
  };

  const handlePointerMove = (e: ThreeEvent<PointerEvent>) => {
    const latLon = pointToLatLon(e.point, globeRef?.current);
    setCursor(latLon);
  };

  const handlePointerLeave = () => {
    isPointerDownRef.current = false;
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

      {/* Visual Ring Marker at cursor coordinate */}
      {markerData && (
        <group position={markerData.pos} quaternion={markerData.quaternion}>
          {/* Outer ring */}
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
          {/* Small center dot */}
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
    </group>
  );
};

export default Picker;
