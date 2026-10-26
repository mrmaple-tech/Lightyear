import { useMemo } from 'react';
import { Quaternion, Vector3 } from 'three';
import { HELIOSPHERE as H, PROBES } from '../data/solarSystem.ts';
import { LAYERS } from '../data/layers.ts';
import { eclDir, gauss, rng } from '../lib/coords.ts';
import { shellMaterial } from '../scene/materials.ts';
import { Body } from '../scene/Body.tsx';
import { Label } from '../scene/Label.tsx';
import { Fader } from '../scene/Space.tsx';
import { PointCloud, cloud } from '../scene/PointCloud.tsx';

const LAYER = LAYERS[3];
const NOSE = eclDir(H.noseLon, H.noseLat);
// Local +X points at the heliosphere's nose (upwind of the interstellar flow).
const TO_NOSE = new Quaternion().setFromUnitVectors(new Vector3(1, 0, 0), NOSE);
const OORT_LABEL = eclDir(40, 35).multiplyScalar(H.oortOuterAU * 0.6).toArray();

function OortCloud() {
  const geometry = useMemo(() => {
    const r = rng(11), c = cloud();
    for (let i = 0; i < 9000; i++) {
      // log-uniform radius: the cloud thins out toward its edge
      const d = H.oortInnerAU * (H.oortOuterAU / H.oortInnerAU) ** r() ** 0.7;
      const v = new Vector3(gauss(r), gauss(r), gauss(r)).normalize().multiplyScalar(d);
      const b = 0.35 + r() * 0.4;
      c.push(v.x, v.y, v.z, 0.7 * b, 0.8 * b, b, 1.3 + r() * 0.8);
    }
    return c.build();
  }, []);
  return <PointCloud geometry={geometry} opacity={0.75} />;
}

export function HeliosphereLayer() {
  const [shock, pause] = useMemo(() => [shellMaterial('#6fa8ff', 0.18), shellMaterial('#8a7dff', 0.32)], []);
  return (
    <Fader window={LAYER.fade}>
      <group quaternion={TO_NOSE}>
        <mesh scale={H.terminationShockAU} material={shock}><sphereGeometry args={[1, 48, 24]} /></mesh>
        {/* Heliopause: nose at 120 AU, stretched into a tail downwind. */}
        <mesh position={[-H.heliopauseAU * 0.5, 0, 0]} scale={[H.heliopauseAU * 1.5, H.heliopauseAU * 1.1, H.heliopauseAU * 1.1]} material={pause}>
          <sphereGeometry args={[1, 48, 24]} />
        </mesh>
        <Label id="heliopause" text="Heliopause" window={LAYER.fade} position={[H.heliopauseAU, 0, 0]} variant="faint" />
      </group>
      {PROBES.map((p) => (
        <Body key={p.id} id={p.id} window={LAYER.fade} minFrac={0.003}>
          <meshBasicMaterial color="#9fe3ff" />
        </Body>
      ))}
      <OortCloud />
      <Label id="oort-cloud" text="Oort cloud" window={[14.8, 15.4, 16.6, 17.3]} position={OORT_LABEL as [number, number, number]} variant="faint" />
    </Fader>
  );
}
