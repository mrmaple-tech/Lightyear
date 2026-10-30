// Earth-orbiting satellites (part of the Earth & Moon layer): glowing markers at their live
// positions, one orbit ring each, and labels. Everything is geocentric, following Earth.
import { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Vector3, type Group } from 'three';
import { useStore, simDate, selectOnClick, useSimStep } from '../store.ts';
import { get } from '../catalog.ts';
import { AU } from '../lib/coords.ts';
import { SATELLITES, type Satellite } from '../data/satellites.ts';
import { hasElements, loadSatellites, periodMin, satOffset } from '../lib/satellites.ts';
import { Label } from '../scene/Label.tsx';
import { Glow } from '../scene/Glow.tsx';
import { Orbit } from '../scene/Orbit.tsx';
import { useFade } from '../scene/Space.tsx';

const HOUR = 3.6e6;

function Sat({ s }: { s: Satellite }) {
  const ring = useRef<Group>(null!);
  const dot = useRef<Group>(null!);
  const tag = useRef<Group>(null!);
  useFade(s.fade, ring);
  // orbit planes drift a few degrees a day; resample hourly in sim time
  const hour = useSimStep(HOUR);
  const sample = useMemo(() => (f: number) =>
    satOffset(s.norad, new Date(hour * HOUR + f * periodMin(s.norad) * 6e4))?.clone().divideScalar(AU) ?? new Vector3(), [hour, s]);
  useFrame(() => {
    const off = satOffset(s.norad, simDate());
    dot.current.visible = tag.current.visible = !!off;
    if (!off) return;
    dot.current.position.copy(off).divideScalar(AU);
    tag.current.position.copy(dot.current.position);
    dot.current.scale.setScalar(Math.max(110, 0.004 * 10 ** useStore.getState().logD) / AU); // never smaller than a few pixels
  });
  return (
    <group ref={ring}>
      <Orbit sample={sample} color="#9fe3ff" opacity={s.ring} />
      <group ref={dot}>
        <mesh onClick={selectOnClick(s.id)}>
          <octahedronGeometry args={[1, 0]} />
          <meshBasicMaterial color="#dff6ff" toneMapped={false} />
        </mesh>
        <Glow size={6} color="#9fe3ff" opacity={0.8} />
      </group>
      {/* label outside the scaled marker group so it stays put */}
      <group ref={tag}><Label id={s.id} text={s.label} window={s.fade} /></group>
    </group>
  );
}

export function Satellites() {
  const [ready, setReady] = useState(false);
  useEffect(() => void loadSatellites().then(() => setReady(true)), []);
  const group = useRef<Group>(null!);
  useFrame(() => group.current?.position.copy(get('earth').pos(simDate())).divideScalar(AU));
  if (!ready) return null;
  return <group ref={group}>{SATELLITES.filter((s) => hasElements(s.norad)).map((s) => <Sat key={s.id} s={s} />)}</group>;
}
