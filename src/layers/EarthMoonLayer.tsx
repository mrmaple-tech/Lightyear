import { useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useTexture } from '@react-three/drei';
import { Matrix4, SRGBColorSpace, Vector3, type Group, type Mesh } from 'three';
import { GeoMoon } from 'astronomy-engine';
import { useStore, simDate, useSimStep } from '../store.ts';
import { get } from '../catalog.ts';
import { AU, earthBasis, eqjToScene, unit } from '../lib/coords.ts';
import { Label } from '../scene/Label.tsx';
import { BODIES } from '../data/solarSystem.ts';
import { Satellites } from './Satellites.tsx';
import { LAYERS } from '../data/layers.ts';
import { atmosphereMaterial, earthMaterial } from '../scene/materials.ts';
import { Body } from '../scene/Body.tsx';
import { Orbit } from '../scene/Orbit.tsx';
import { K, useFade } from '../scene/Space.tsx';

const LAYER = LAYERS[0];
const TEXTURES = ['earth_day', 'earth_night', 'earth_clouds', 'earth_spec', 'earth_normal', 'moon'];
const [EARTH, MOON] = BODIES;
const UP = new Vector3(0, 1, 0);
const WEEK = 6.048e8;

function MoonOrbit() {
  const ref = useRef<Group>(null!);
  useFade(LAYER.fade, ref);
  const week = useSimStep(WEEK);
  const sample = useMemo(() => (f: number) => {
    const g = GeoMoon(new Date(week * WEEK + f * MOON.periodDays * 864e5));
    return eqjToScene(g.x, g.y, g.z);
  }, [week]);
  useFrame(() => ref.current.position.copy(get('earth').pos(simDate())).divideScalar(AU));
  return <group ref={ref}><Orbit sample={sample} color="#9aa7bf" opacity={0.3} /></group>;
}

export function EarthMoonLayer() {
  const maxAniso = useThree((s) => s.gl.capabilities.getMaxAnisotropy());
  const textures = useTexture(TEXTURES.map((f) => `${import.meta.env.BASE_URL}textures/${f}.webp`));
  const [day, night, clouds, spec, normal, moonMap] = textures;
  // color maps are sRGB; clouds/spec/normal are data and stay linear
  [day, night, moonMap].forEach((t) => (t.colorSpace = SRGBColorSpace));
  [day, clouds].forEach((t) => (t.anisotropy = Math.min(8, maxAniso))); // sharp near the limb
  const earthMat = useMemo(() => earthMaterial({ day, night, clouds, spec, normal }), [day, night, clouds, spec, normal]);
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
      <Satellites />
      <HomeMarker />
    </>
  );
}

const SURFACE = new Vector3(), CAM = new Vector3();

/** A gold dot at the viewer's shared location, turning with the Earth; its label hides on the far side. */
function HomeMarker() {
  const home = useStore((s) => s.home);
  const ref = useRef<Group>(null!);
  const dot = useRef<Group>(null!);
  const camera = useThree((s) => s.camera);
  const facing = useRef(true);
  useFrame(() => {
    if (!home) return;
    const t = simDate();
    const { logD, focus } = useStore.getState();
    const R = get('earth').radiusM!;
    const [x, y, z] = unit(home.lon, home.lat);
    // earth-fixed (x→lon 0, y→lon 90°E, z→north) into the globe's local frame (x, z, -y), then world
    SURFACE.set(x, z, -y).applyMatrix4(earthBasis(t)).multiplyScalar(R);
    ref.current.position.copy(get('earth').pos(t)).add(SURFACE).divideScalar(AU);
    dot.current.scale.setScalar(Math.max(15e3, 0.004 * 10 ** logD) / AU);
    // camera position in world meters, to test which side of the globe the marker is on
    CAM.copy(camera.position).multiplyScalar(10 ** logD / K).add(focus).sub(get('earth').pos(t)).sub(SURFACE);
    facing.current = CAM.dot(SURFACE) > 0;
  });
  if (!home) return null;
  return (
    <group ref={ref}>
      <group ref={dot}>
        <mesh><sphereGeometry args={[1, 12, 8]} /><meshBasicMaterial color="#2997ff" toneMapped={false} /></mesh>
      </group>
      <Label id="earth" text="Your location" window={[-Infinity, -Infinity, 8.6, 9.2]} variant="faint" shown={() => facing.current} />
    </group>
  );
}
