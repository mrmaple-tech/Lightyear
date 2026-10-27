import { useMemo, type ReactNode } from 'react';
import { get } from '../catalog.ts';
import { BODIES, SUN, type SolarBody } from '../data/solarSystem.ts';
import { LAYERS } from '../data/layers.ts';
import { Body } from '../scene/Body.tsx';
import { Orbit, planetSampler } from '../scene/Orbit.tsx';
import { Fader } from '../scene/Space.tsx';
import { Glow } from '../scene/Glow.tsx';
import { planetMaterial, sunMaterial } from '../scene/materials.ts';

const LAYER = LAYERS[1];

export function Planet({ b, children }: { b: SolarBody; children?: ReactNode }) {
  const material = useMemo(() => planetMaterial(b.look!, b.radiusKm % 17), [b]);
  return (
    <Body id={b.id} window={b.fade}>
      <primitive object={material} attach="material" />
      {children}
    </Body>
  );
}

export function Orbits({ layer, fade }: { layer: number; fade: typeof LAYER.fade }) {
  const samplers = useMemo(() => {
    const now = Date.now();
    return BODIES.filter((b) => b.layer === layer || (layer === 2 && b.id === 'earth')).map((b) => planetSampler(get(b.id).pos, b.periodDays, now));
  }, [layer]);
  return <Fader window={fade}>{samplers.map((s, i) => <Orbit key={i} sample={s} />)}</Fader>;
}

export function InnerSolarLayer() {
  const sun = useMemo(sunMaterial, []);
  return (
    <>
      <pointLight position={[0, 0, 0]} intensity={2.6} decay={0} />
      <Body id="sun" window={SUN.fade} minFrac={0.005}>
        <primitive object={sun} attach="material" />
        <Glow size={5} color="#ffd38a" opacity={0.9} />
        <Glow size={10} color="#ff9a3c" opacity={0.22} />
      </Body>
      {BODIES.filter((b) => b.layer === 2).map((b) => <Planet key={b.id} b={b} />)}
      <Orbits layer={2} fade={LAYER.fade} />
    </>
  );
}
