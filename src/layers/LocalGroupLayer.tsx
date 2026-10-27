import { useMemo } from 'react';
import { Euler } from 'three';
import { LOCAL_GROUP, MILKY_WAY as MW } from '../data/deepSky.ts';
import { LAYERS } from '../data/layers.ts';
import { GAL_BASIS, galDir } from '../lib/coords.ts';
import { Label } from '../scene/Label.tsx';
import { Glow } from '../scene/Glow.tsx';
import { Fader } from '../scene/Space.tsx';
import { PointCloud, cloud } from '../scene/PointCloud.tsx';
import { addIrregular, addSpiral } from '../scene/galaxy.ts';

const LAYER = LAYERS[6];
const D = Math.PI / 180;
// Point size as a fraction of galaxy diameter: ~2–3 px when zoomed in on one, sub-pixel and dimmed from afar.
const POINT = 0.004;
const SATELLITE_LABEL = [21.0, 21.6, 22.2, 22.5] as const; // Magellanic Clouds crowd the Milky Way when zoomed out

export function LocalGroupLayer() {
  const galaxies = useMemo(() => LOCAL_GROUP.map((g, i) => {
    const c = cloud();
    const opts = { radius: g.diameterKpc / 2, seed: 20 + i, bright: 2.4 };
    if (g.shape === 'spiral') addSpiral(c, { ...opts, count: Math.round(g.diameterKpc * 220) });
    else addIrregular(c, { ...opts, count: Math.round(g.diameterKpc * 300) });
    return { g, geometry: c.build(), pos: galDir(g.l, g.b).multiplyScalar(g.distKpc), rot: new Euler(...g.tilt.map((a) => a * D) as [number, number, number]) };
  }), []);
  // A lighter Milky Way at the same point density as its neighbors (the full one fades out before here).
  const home = useMemo(() => {
    const c = cloud();
    addSpiral(c, { count: MW.diameterKpc * 220, radius: MW.diameterKpc / 2, cx: MW.sunDistKpc, seed: 3, bright: 2.4 });
    return c.build();
  }, []);
  return (
    <Fader window={LAYER.fade}>
      {/* takes over as the full Milky Way layer fades out, so the two never stack */}
      <Fader window={[LAYERS[5].fade[2], LAYERS[5].fade[3], Infinity, Infinity]}>
        <group matrix={GAL_BASIS} matrixAutoUpdate={false}>
          <PointCloud geometry={home} worldSize={MW.diameterKpc * POINT} />
          <Glow size={MW.diameterKpc * 0.5} color="#ffd8a8" opacity={0.7} position={[MW.sunDistKpc, 0, 0]} />
        </group>
      </Fader>
      {galaxies.map(({ g, geometry, pos, rot }) => (
        <group key={g.id} position={pos} rotation={rot}>
          <PointCloud geometry={geometry} worldSize={g.diameterKpc * POINT} />
          <Glow size={g.diameterKpc * 0.6} color={g.shape === 'spiral' ? '#ffe2bd' : '#cfdcff'} opacity={0.7} />
          <Label id={g.id} text={g.name} window={g.shape === 'irregular' ? SATELLITE_LABEL : LAYER.fade} />
        </group>
      ))}
    </Fader>
  );
}
