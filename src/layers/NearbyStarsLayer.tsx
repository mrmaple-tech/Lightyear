import { useMemo } from 'react';
import { STARS, FAMOUS_STARS } from '../data/stars.ts';
import { LAYERS } from '../data/layers.ts';
import { eqjToScene } from '../lib/coords.ts';
import { starColor, starTemp } from '../lib/stars.ts';
import { useStore } from '../store.ts';
import { Label } from '../scene/Label.tsx';
import { Fader } from '../scene/Space.tsx';
import { PointCloud, cloud } from '../scene/PointCloud.tsx';

const LAYER = LAYERS[4];
const FAR_LABEL = [16.3, 17.2, 19.6, 20.4] as const; // distant giants stay labeled a little longer

export function NearbyStarsLayer() {
  const { geometry, labels } = useMemo(() => {
    const c = cloud();
    const labels: { id: string; name: string; p: [number, number, number]; far: boolean }[] = [];
    STARS.forEach(([name, x, y, z, , absmag, bv], i) => {
      const p = eqjToScene(x, y, z);
      const [r, g, b] = starColor(starTemp(bv));
      // brighter stars: bigger and pushed past 1.0 so bloom picks them up
      const boost = Math.min(2.2, Math.max(0.35, 1.25 - absmag * 0.09));
      c.push(p.x, p.y, p.z, r * boost, g * boost, b * boost, Math.min(13, Math.max(2.2, 8 - absmag * 0.55)));
      // Proxima sits beside Rigil Kentaurus on screen; it stays searchable but unlabeled
      if (name in FAMOUS_STARS && name !== 'Proxima Centauri') labels.push({ id: `star-${i}`, name, p: p.toArray(), far: p.length() > 50 });
    });
    return { geometry: c.build(), labels };
  }, []);

  return (
    <Fader window={LAYER.fade}>
      <PointCloud geometry={geometry} onPick={(i) => useStore.getState().select(`star-${i}`)} />
      {labels.map((l) => <Label key={l.id} id={l.id} text={l.name} position={l.p} window={l.far ? FAR_LABEL : LAYER.fade} />)}
    </Fader>
  );
}
