// A solar-system body: a sphere at its live position, sized true-to-scale or
// "readable" (never smaller than a few pixels), plus its label.
import { useRef, type ReactNode } from 'react';
import { useFrame } from '@react-three/fiber';
import type { Group, Mesh } from 'three';
import { useStore, simDate } from '../store.ts';
import { get } from '../catalog.ts';
import { AU } from '../lib/coords.ts';
import type { Fade } from '../data/layers.ts';
import { Label } from './Label.tsx';
import { useFade } from './Space.tsx';

interface Props {
  id: string;
  window: Fade;
  /** Readable mode: minimum radius as a fraction of camera distance. */
  minFrac?: number;
  /** Sphere material (and any extras sized with the body, e.g. rings). */
  children: ReactNode;
  /** Extras that should not be scaled with the body (orbit lines). */
  attached?: ReactNode;
  label?: boolean;
  onFrame?: (mesh: Mesh) => void;
}

export function Body({ id, window, minFrac = 0.004, children, attached, label = true, onFrame }: Props) {
  const obj = get(id);
  const group = useRef<Group>(null!);
  const mesh = useRef<Mesh>(null!);
  // Up close a body is always drawn (you may have flown to it); its label keeps the full window.
  useFade([-Infinity, -Infinity, window[2], window[3]], group);
  useFrame(() => {
    const { logD, readable } = useStore.getState();
    group.current.position.copy(obj.pos(simDate())).divideScalar(AU);
    const R = obj.radiusM ?? 0;
    const r = readable ? Math.max(R, minFrac * 10 ** logD) : R;
    mesh.current.scale.setScalar(r / AU);
    onFrame?.(mesh.current);
  });
  return (
    <group ref={group}>
      <mesh
        ref={mesh}
        onClick={(e) => {
          if (e.delta > 6) return;
          e.stopPropagation();
          useStore.getState().select(id);
        }}
      >
        <sphereGeometry args={[1, 64, 32]} />
        {children}
      </mesh>
      {attached}
      {label && <Label id={id} text={obj.name} window={window} />}
    </group>
  );
}
