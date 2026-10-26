import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useTexture } from '@react-three/drei';
import { Matrix4, SRGBColorSpace, Vector3, type Group, type Mesh } from 'three';
import { GeoMoon } from 'astronomy-engine';
import { useStore, simDate } from '../store.ts';
import { get } from '../catalog.ts';
import { AU, earthBasis, eqjToScene } from '../lib/coords.ts';
import { BODIES } from '../data/solarSystem.ts';
import { LAYERS } from '../data/layers.ts';
import { earthMaterial } from '../scene/materials.ts';
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

export function EarthMoonLayer() {
  const textures = useTexture(['earth_atmos_2048.jpg', 'earth_lights_2048.png', 'moon_1024.jpg'].map((f) => `${import.meta.env.BASE_URL}textures/${f}`));
  textures.forEach((t) => (t.colorSpace = SRGBColorSpace));
  const [day, night, moonMap] = textures;
  const earthMat = useMemo(() => earthMaterial(day, night), [day, night]);

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
      </Body>
      <Body id="moon" window={MOON.fade} onFrame={faceEarth}>
        <meshStandardMaterial map={moonMap} roughness={1} />
      </Body>
      <MoonOrbit />
    </>
  );
}
