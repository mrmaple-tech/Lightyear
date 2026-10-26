// Floating origin. World positions are float64 meters; each Space renders its
// children in local units (AU, pc, kpc, Mpc) and is re-scaled every frame so the
// camera always sits K units from the focus. GPU-side numbers therefore stay small.
import { useRef, type ReactNode, type RefObject } from 'react';
import { useFrame } from '@react-three/fiber';
import type { Group, Material, Mesh, Object3D, ShaderMaterial } from 'three';
import { useStore } from '../store.ts';
import { fade } from '../lib/coords.ts';
import type { Fade } from '../data/layers.ts';

export const K = 10;
/** Scene units per meter at the current zoom. */
export const sceneScale = () => K / 10 ** useStore.getState().logD;

export function Space({ unit, children }: { unit: number; children: ReactNode }) {
  const ref = useRef<Group>(null!);
  useFrame(() => {
    const s = sceneScale();
    ref.current.scale.setScalar(unit * s);
    ref.current.position.copy(useStore.getState().focus).multiplyScalar(-s);
  });
  return <group ref={ref}>{children}</group>;
}

/** Cross-fade everything under `ref` by the zoom window; hides it entirely when faded out. */
export function useFade(window: Fade, ref: RefObject<Object3D>) {
  useFrame(() => {
    const o = fade(useStore.getState().logD, window);
    const root = ref.current;
    if (!root) return;
    root.userData.fade = o;
    root.visible = o > 0.003;
    if (!root.visible) return;
    root.traverse((c) => {
      const m = (c as Mesh).material as (Material & Partial<ShaderMaterial>) | undefined;
      if (!m || Array.isArray(m)) return;
      // nested faders multiply
      let f = 1;
      for (let p: Object3D | null = c; p; p = p.parent) f *= p.userData.fade ?? 1;
      m.userData.base ??= m.uniforms?.uOpacity ? m.uniforms.uOpacity.value : m.opacity;
      if (m.uniforms?.uOpacity) m.uniforms.uOpacity.value = m.userData.base * f;
      else { m.opacity = m.userData.base * f; m.transparent = true; }
    });
  });
}

/** A group whose content cross-fades with a layer. */
export function Fader({ window, children }: { window: Fade; children: ReactNode }) {
  const ref = useRef<Group>(null!);
  useFade(window, ref);
  return <group ref={ref}>{children}</group>;
}
