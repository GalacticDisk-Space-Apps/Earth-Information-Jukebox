import { MathUtils, Spherical, Vector3 } from 'three';
import type { OrbitControls } from 'three-stdlib';
import { latLonToVector3 } from './pick';

const destinations = {
  global: latLonToVector3(0, -90, 2.5),
  arctic: latLonToVector3(76, 0, 2.1),
  pacific: latLonToVector3(5, -155, 2.4),
  amazon: latLonToVector3(-5, -62, 1.8),
};

export type CameraPreset = keyof typeof destinations;
export const cameraPresetOrder: readonly CameraPreset[] = ['global', 'arctic', 'pacific', 'amazon'];

export function createCameraPresets() {
  const start = new Spherical();
  const end = new Spherical();
  const position = new Spherical();
  const offset = new Vector3();
  let destination: CameraPreset | undefined;
  let elapsed = 0;

  function flyTo(preset: CameraPreset) {
    destination = preset;
    elapsed = 0;
  }

  function update(controls: OrbitControls, delta: number): boolean {
    if (!destination) return false;
    if (elapsed === 0) {
      start.setFromVector3(offset.subVectors(controls.object.position, controls.target));
      end.setFromVector3(destinations[destination]);
      end.theta = start.theta + MathUtils.euclideanModulo(end.theta - start.theta + Math.PI, 2 * Math.PI) - Math.PI;
    }

    elapsed = Math.min(elapsed + delta, 2.5);
    const t = MathUtils.smoothstep(elapsed, 0, 2.5);
    position.set(
      MathUtils.lerp(start.radius, end.radius, t),
      MathUtils.lerp(start.phi, end.phi, t),
      MathUtils.lerp(start.theta, end.theta, t),
    );
    controls.object.position.setFromSpherical(position).add(controls.target);
    if (elapsed === 2.5) destination = undefined;
    return true;
  }

  function cancel() {
    destination = undefined;
  }

  return { flyTo, update, cancel };
}
