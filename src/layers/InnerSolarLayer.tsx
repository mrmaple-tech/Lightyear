import { useMemo } from 'react';
import { get } from '../catalog.ts';
import { BODIES, SUN } from '../data/solarSystem.ts';
import { LAYERS } from '../data/layers.ts';
import { Body } from '../scene/Body.tsx';
import { Orbit, planetSampler } from '../scene/Orbit.tsx';
import { Fader } from '../scene/Space.tsx';

const LAYER = LAYERS[1];

export function Orbits({ layer, fade }: { layer: number; fade: typeof LAYER.fade }) {
  const samplers = useMemo(() => {
    const now = Date.now();
    return BODIES.filter((b) => b.layer === layer || (layer === 2 && b.id === 'earth')).map((b) => planetSampler(get(b.id).pos, b.periodDays, now));
  }, [layer]);
  return <Fader window={fade}>{samplers.map((s, i) => <Orbit key={i} sample={s} />)}</Fader>;
}

export function InnerSolarLayer() {
  return (
    <>
      <pointLight position={[0, 0, 0]} intensity={2.6} decay={0} />
      <Body id="sun" window={SUN.fade} minFrac={0.005}>
        <meshBasicMaterial color={[3, 2.3, 1.4]} toneMapped={false} />
      </Body>
      {BODIES.filter((b) => b.layer === 2).map((b) => (
        <Body key={b.id} id={b.id} window={b.fade}>
          <meshStandardMaterial color={b.color} roughness={1} />
        </Body>
      ))}
      <Orbits layer={2} fade={LAYER.fade} />
    </>
  );
}
