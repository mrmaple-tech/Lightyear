import { useMemo } from 'react';
import { COSMIC_WEB as W, OBSERVABLE_UNIVERSE as OU, STRUCTURES } from '../data/deepSky.ts';
import { LAYERS } from '../data/layers.ts';
import { galDir } from '../lib/coords.ts';
import { shellMaterial } from '../scene/materials.ts';
import { Label } from '../scene/Label.tsx';
import { Fader } from '../scene/Space.tsx';
import { PointCloud, cloud } from '../scene/PointCloud.tsx';
import { web } from '../scene/galaxy.ts';

const LAYER = LAYERS[7];
const EDGE_FADE = [25.3, 26.1, Infinity, Infinity] as const;

export function CosmicWebLayer() {
  const [near, far] = useMemo(() => {
    const n = cloud(), f = cloud();
    web(n, 5, W.nearNodes, 0, W.nearRadiusMpc, 5, 22, 25);
    // ponytail: the far field reuses the same generator at a coarser scale; real filaments don't grow with distance
    web(f, 6, W.farNodes, W.nearRadiusMpc, OU.radiusMpc, 110, 14, 12);
    return [n.build(), f.build()];
  }, []);
  const edge = useMemo(() => shellMaterial('#c08bff', 0.35), []);
  return (
    <Fader window={LAYER.fade}>
      {/* World-sized points: distant ones drop to faint single pixels instead of overdrawing the screen. */}
      <PointCloud geometry={near} worldSize={1} />
      <PointCloud geometry={far} worldSize={9} />
      {STRUCTURES.map((s) => (
        <Label key={s.id} id={s.id} text={s.name} window={s.distMpc > 150 ? [24.3, 24.8, 26, 26.6] : s.distMpc < 50 ? [23.4, 23.8, 24.8, 25.15] : [23.6, 24.0, 25.4, 26]} position={galDir(s.l, s.b).multiplyScalar(s.distMpc).toArray()} />
      ))}
      <Fader window={EDGE_FADE}>
        <mesh scale={OU.radiusMpc} material={edge}><sphereGeometry args={[1, 64, 32]} /></mesh>
        <Label id={OU.id} text="Edge of the observable universe" variant="faint" window={EDGE_FADE} position={galDir(30, 50).multiplyScalar(OU.radiusMpc).toArray()} />
      </Fader>
    </Fader>
  );
}
