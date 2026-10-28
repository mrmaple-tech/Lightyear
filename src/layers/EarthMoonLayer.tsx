import { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { useTexture } from '@react-three/drei';
import { Matrix4, SRGBColorSpace, Vector3, type Group, type Mesh } from 'three';
import { GeoMoon } from 'astronomy-engine';
import { useStore, simDate } from '../store.ts';
import { get } from '../catalog.ts';
import { AU, earthBasis, eqjToScene } from '../lib/coords.ts';
import { BODIES, ISS } from '../data/solarSystem.ts';
import { issOffset, issPeriodMin, loadIss } from '../lib/iss.ts';
import { Label } from '../scene/Label.tsx';
import { Glow } from '../scene/Glow.tsx';
import { LAYERS } from '../data/layers.ts';
import { atmosphereMaterial, earthMaterial } from '../scene/materials.ts';
import { Body } from '../scene/Body.tsx';
import { Orbit } from '../scene/Orbit.tsx';
import { useFade } from '../scene/Space.tsx';

const LAYER = LAYERS[0];
const [EARTH, MOON] = BODIES;
const UP = new Vector3(0, 1, 0);
const WEEK = 6.048e8;

function MoonOrbit() {
  const ref = useRef<Group>(null!);
  useFade(LAYER.fade, ref);
  const week = useStore((s) => Math.floor(s.simTime / WEEK));
  const sample = useMemo(() => (f: number) => {
    const g = GeoMoon(new Date(week * WEEK + f * MOON.periodDays * 864e5));
    return eqjToScene(g.x, g.y, g.z);
  }, [week]);
  useFrame(() => ref.current.position.copy(get('earth').pos(simDate())).divideScalar(AU));
  return <group ref={ref}><Orbit sample={sample} color="#9aa7bf" opacity={0.3} /></group>;
}

const HOUR = 3.6e6;

/** The ISS: a glowing marker at its live position plus one orbit of its path, both geocentric. */
function Iss() {
  const [ready, setReady] = useState(false);
  useEffect(() => void loadIss().then(setReady), []);
  const orbit = useRef<Group>(null!);
  const dot = useRef<Group>(null!);
  useFade(ISS.fade, orbit);
  // the orbit plane drifts a few degrees a day; resample hourly in sim time
  const hour = useStore((s) => Math.floor(s.simTime / HOUR));
  const sample = useMemo(() => (f: number) =>
    issOffset(new Date(hour * HOUR + f * issPeriodMin() * 6e4))?.clone().divideScalar(AU) ?? new Vector3(), [hour, ready]);
  useFrame(() => {
    if (!ready) return; // nothing mounted until the orbital elements arrive
    const t = simDate();
    const off = issOffset(t);
    orbit.current.position.copy(get('earth').pos(t)).divideScalar(AU);
    dot.current.visible = !!off;
    if (off) dot.current.position.copy(off).divideScalar(AU);
    // never smaller than a few pixels
    dot.current.scale.setScalar(Math.max(110, 0.004 * 10 ** useStore.getState().logD) / AU);
  });
  if (!ready) return null;
  return (
    <group ref={orbit}>
      <Orbit sample={sample} color="#9fe3ff" opacity={0.35} />
      <group ref={dot}>
        <mesh onClick={(e) => { if (e.delta > 6) return; e.stopPropagation(); useStore.getState().select(ISS.id); }}>
          <octahedronGeometry args={[1, 0]} />
          <meshBasicMaterial color="#dff6ff" toneMapped={false} />
        </mesh>
        <Glow size={6} color="#9fe3ff" opacity={0.8} />
      </group>
      <IssLabel />
    </group>
  );
}

/** Label follows the station (kept outside the scaled marker group so it stays put). */
function IssLabel() {
  const ref = useRef<Group>(null!);
  useFrame(() => {
    const off = issOffset(simDate());
    if (off) ref.current.position.copy(off).divideScalar(AU);
  });
  return <group ref={ref}><Label id={ISS.id} text={ISS.label} window={ISS.fade} /></group>;
}

export function EarthMoonLayer() {
  const textures = useTexture(['earth_atmos_2048.jpg', 'earth_lights_2048.jpg', 'moon_1024.jpg'].map((f) => `${import.meta.env.BASE_URL}textures/${f}`));
  textures.forEach((t) => (t.colorSpace = SRGBColorSpace));
  const [day, night, moonMap] = textures;
  const earthMat = useMemo(() => earthMaterial(day, night), [day, night]);
  const halo = useMemo(() => atmosphereMaterial('#5c9dff', 1.06), []);

  const spinEarth = (m: Mesh) => {
    const t = simDate();
    m.setRotationFromMatrix(earthBasis(t));
    earthMat.uniforms.sunDir.value = get('earth').pos(t).clone().negate().normalize();
  };
  // Tidally locked: the near side (texture longitude 0, local +X) always faces Earth.
  const faceEarth = (m: Mesh) => {
    const t = simDate();
    const x = get('earth').pos(t).clone().sub(get('moon').pos(t)).normalize();
    const y = UP.clone().addScaledVector(x, -x.dot(UP)).normalize();
    m.setRotationFromMatrix(new Matrix4().makeBasis(x, y, new Vector3().crossVectors(x, y)));
  };

  return (
    <>
      <Body id="earth" window={EARTH.fade} label={false} onFrame={spinEarth}>
        <primitive object={earthMat} attach="material" />
        {/* thin atmosphere glow just past the limb */}
        <mesh scale={1.06} material={halo}><sphereGeometry args={[1, 64, 32]} /></mesh>
      </Body>
      <Body id="moon" window={MOON.fade} onFrame={faceEarth}>
        <meshStandardMaterial map={moonMap} roughness={1} />
      </Body>
      <MoonOrbit />
      <Iss />
    </>
  );
}
