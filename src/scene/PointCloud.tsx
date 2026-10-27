import { useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { BufferAttribute, BufferGeometry } from 'three';
import type { ThreeEvent } from '@react-three/fiber';
import { pointsMaterial } from './materials.ts';
import { useStore } from '../store.ts';

const J2000 = Date.UTC(2000, 0, 1, 12);

/** Builder for point clouds: push(x, y, z, r, g, b, sizePx). */
export function cloud() {
  const p: number[] = [], c: number[] = [], s: number[] = [], v: number[] = [];
  return {
    push(x: number, y: number, z: number, r: number, g: number, b: number, size: number, speed = 0) {
      p.push(x, y, z); c.push(r, g, b); s.push(size); v.push(speed);
    },
    build() {
      const geo = new BufferGeometry();
      geo.setAttribute('position', new BufferAttribute(new Float32Array(p), 3));
      geo.setAttribute('color', new BufferAttribute(new Float32Array(c), 3));
      geo.setAttribute('size', new BufferAttribute(new Float32Array(s), 1));
      geo.setAttribute('aSpeed', new BufferAttribute(new Float32Array(v), 1));
      return geo;
    },
  };
}

interface Props {
  geometry: BufferGeometry;
  opacity?: number;
  /** Rotate points by their aSpeed with simulation time. */
  spin?: boolean;
  /** World size (parent units) of a size-1 point; enables distance-attenuated points. */
  worldSize?: number;
  onPick?: (index: number) => void;
}

/** One draw call for thousands of points. */
export function PointCloud({ geometry, opacity = 1, spin, worldSize = 0, onPick }: Props) {
  const material = useMemo(() => pointsMaterial(opacity), [opacity]);
  useFrame(({ size }) => {
    material.uniforms.uWorld.value = worldSize;
    material.uniforms.uHalfH.value = size.height / 2;
    if (spin) material.uniforms.uDays.value = (useStore.getState().simTime - J2000) / 864e5;
  });
  const click = onPick && ((e: ThreeEvent<MouseEvent>) => {
    if (e.delta > 6 || e.index === undefined) return;
    e.stopPropagation();
    onPick(e.index);
  });
  return <points geometry={geometry} material={material} onClick={click} />;
}
