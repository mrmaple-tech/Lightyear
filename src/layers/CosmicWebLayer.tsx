import { useMemo } from 'react';
import { Vector3 } from 'three';
import { COSMIC_WEB as W, OBSERVABLE_UNIVERSE as OU, STRUCTURES } from '../data/deepSky.ts';
import { LAYERS } from '../data/layers.ts';
import { galDir, gauss, rng } from '../lib/coords.ts';
import { shellMaterial } from '../scene/materials.ts';
import { Label } from '../scene/Label.tsx';
import { Fader } from '../scene/Space.tsx';
import { PointCloud, cloud } from '../scene/PointCloud.tsx';

const LAYER = LAYERS[7];
const EDGE_FADE = [25.3, 26.1, Infinity, Infinity] as const;

/** Random nodes linked to their 3 nearest neighbors; galaxies scatter along the links and pile up at nodes. */
function web(c: ReturnType<typeof cloud>, seed: number, nodes: number, rMin: number, rMax: number, scatter: number, perLink: number, perNode: number) {
  const r = rng(seed);
  const pts: Vector3[] = [];
  while (pts.length < nodes) {
    const v = new Vector3(r() * 2 - 1, r() * 2 - 1, r() * 2 - 1);
    if (v.length() > 1) continue;
    v.multiplyScalar(rMax);
    if (v.length() >= rMin) pts.push(v);
  }
  // ponytail: O(n²) neighbor search, fine for a few hundred nodes generated once
  for (const a of pts) {
    const near = pts.filter((b) => b !== a).sort((p, q) => p.distanceToSquared(a) - q.distanceToSquared(a)).slice(0, 3);
    for (const b of near) for (let i = 0; i < perLink; i++) {
      const t = r(), s = scatter * (0.5 + 0.5 * Math.abs(2 * t - 1));
      const k = 0.35 + r() * 0.35;
      c.push(a.x + (b.x - a.x) * t + gauss(r) * s, a.y + (b.y - a.y) * t + gauss(r) * s, a.z + (b.z - a.z) * t + gauss(r) * s, 0.5 * k, 0.6 * k, k, 1.2 + r());
    }
    for (let i = 0; i < perNode; i++) {
      const k = 0.5 + r() * 0.5;
      c.push(a.x + gauss(r) * scatter * 1.3, a.y + gauss(r) * scatter * 1.3, a.z + gauss(r) * scatter * 1.3, k, 0.8 * k, 0.62 * k, 1.4 + r() * 1.2);
    }
  }
}

export function CosmicWebLayer() {
  const geometry = useMemo(() => {
    const c = cloud();
    web(c, 5, W.nearNodes, 0, W.nearRadiusMpc, 5, 34, 40);
    // ponytail: the far field reuses the same generator at a coarser scale; real filaments don't grow with distance
    web(c, 6, W.farNodes, W.nearRadiusMpc, OU.radiusMpc, 110, 22, 18);
    return c.build();
  }, []);
  const edge = useMemo(() => shellMaterial('#c08bff', 0.35), []);
  return (
    <Fader window={LAYER.fade}>
      <PointCloud geometry={geometry} opacity={0.9} />
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
