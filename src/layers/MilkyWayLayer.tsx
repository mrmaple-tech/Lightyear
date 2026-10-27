import { useMemo } from 'react';
import { MILKY_WAY as MW } from '../data/deepSky.ts';
import { LAYERS } from '../data/layers.ts';
import { GAL_BASIS } from '../lib/coords.ts';
import { Label } from '../scene/Label.tsx';
import { Glow } from '../scene/Glow.tsx';
import { Fader } from '../scene/Space.tsx';
import { PointCloud, cloud } from '../scene/PointCloud.tsx';
import { addSpiral } from '../scene/galaxy.ts';

const LAYER = LAYERS[5];

/** Galactic frame: the Sun at the origin, galactic center along +X, north galactic pole +Z. */
export function MilkyWayLayer() {
  const geometry = useMemo(() => {
    const c = cloud();
    addSpiral(c, { count: MW.count, radius: MW.diameterKpc / 2, cx: MW.sunDistKpc, seed: 3, bright: 0.45 });
    return c.build();
  }, []);
  return (
    <Fader window={LAYER.fade}>
      <group matrix={GAL_BASIS} matrixAutoUpdate={false}>
        {/* ~1–2 px at the layer's home zoom; fades instead of saturating when seen from the Local Group */}
        <PointCloud geometry={geometry} worldSize={0.1} />
        <Glow size={11} color="#ffcf94" opacity={0.35} position={[MW.sunDistKpc, 0, 0]} />
        <Label id="milky-way" text="Milky Way" position={[MW.sunDistKpc, 0, 0]} window={[19.6, 20.4, 21.8, 22.4]} />
      </group>
    </Fader>
  );
}
