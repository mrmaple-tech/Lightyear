import { useMemo } from 'react';
import { DoubleSide, Quaternion, Vector3 } from 'three';
import { ASTEROID_BELT, BODIES, SATURN_POLE } from '../data/solarSystem.ts';
import { LAYERS } from '../data/layers.ts';
import { gauss, radecDir, rng } from '../lib/coords.ts';
import { Body } from '../scene/Body.tsx';
import { Fader } from '../scene/Space.tsx';
import { PointCloud, cloud } from '../scene/PointCloud.tsx';
import { Orbits } from './InnerSolarLayer.tsx';

const LAYER = LAYERS[2];
const BELT_FADE = [10.6, 11.4, 12.9, 13.6] as const;
const RING_TILT = new Quaternion().setFromUnitVectors(new Vector3(0, 0, 1), radecDir(SATURN_POLE.ra, SATURN_POLE.dec));

function AsteroidBelt() {
  const geometry = useMemo(() => {
    const r = rng(7), c = cloud();
    const { inner, outer, count } = ASTEROID_BELT;
    for (let i = 0; i < count; i++) {
      const a = inner + (outer - inner) * (r() + r()) / 2;
      const th = r() * Math.PI * 2;
      const b = 0.55 + r() * 0.45;
      c.push(a * Math.cos(th), gauss(r) * 0.06 * a, -a * Math.sin(th), 0.75 * b, 0.68 * b, 0.6 * b, 1.4 + r(), (2 * Math.PI) / (365.25 * a ** 1.5));
    }
    return c.build();
  }, []);
  return <PointCloud geometry={geometry} opacity={0.4} spin />;
}

export function OuterSolarLayer() {
  return (
    <>
      {BODIES.filter((b) => b.layer === 3).map((b) => (
        <Body key={b.id} id={b.id} window={b.fade}>
          <meshStandardMaterial color={b.color} roughness={1} />
          {b.id === 'saturn' && (
            <mesh quaternion={RING_TILT}>
              <ringGeometry args={[1.24, 2.27, 96]} />
              <meshBasicMaterial color="#cdb68a" side={DoubleSide} transparent opacity={0.6} depthWrite={false} />
            </mesh>
          )}
        </Body>
      ))}
      <Orbits layer={3} fade={LAYER.fade} />
      <Fader window={BELT_FADE}><AsteroidBelt /></Fader>
    </>
  );
}
