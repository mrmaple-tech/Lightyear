// Every clickable/searchable object, with a live position in world meters.
import { HelioVector } from 'astronomy-engine';
import { Vector3 } from 'three';
import { AU, KPC, MPC, PC, eqjToScene, galDir, galToScene, radecDir } from './lib/coords.ts';
import { formatSize } from './lib/scale.ts';
import { starRadiusSun, starTemp } from './lib/stars.ts';
import { LAYERS } from './data/layers.ts';
import { BODIES, HELIO_OBJECTS, PROBES, SUN } from './data/solarSystem.ts';
import { FAMOUS_STARS, STARS } from './data/stars.ts';
import { LOCAL_GROUP, LOCAL_GROUP_CENTER as LGC, MILKY_WAY, OBSERVABLE_UNIVERSE, STRUCTURES } from './data/deepSky.ts';

export interface CatalogObject {
  id: string;
  name: string;
  type: string;
  size?: string;
  fact: string;
  /** True radius in meters, when it's a solid body we can zoom onto. */
  radiusM?: number;
  /** Zoom (log10 m) used by "Fly to", and the closest the camera may get. */
  viewLogD: number;
  minLogD: number;
  /** Solar-system objects move; their distance is live. */
  live?: boolean;
  /** World position in meters (heliocentric, scene frame). Returned vectors are shared: don't mutate. */
  pos: (t: Date) => Vector3;
}

const ORIGIN = new Vector3();
const shown = (layer: number) => LAYERS[layer - 1].fade[1];

const cache = new Map<string, { t: number; v: Vector3 }>();
function helio(o: (typeof BODIES)[number], t: Date) {
  const hit = cache.get(o.id);
  if (hit && hit.t === t.getTime()) return hit.v;
  const h = HelioVector(o.body, t);
  const v = eqjToScene(h.x, h.y, h.z).multiplyScalar(AU);
  cache.set(o.id, { t: t.getTime(), v });
  return v;
}

const solid = (radiusKm: number, view: number) => ({
  radiusM: radiusKm * 1e3,
  size: formatSize(radiusKm * 1e3),
  minLogD: Math.log10(radiusKm * 1e3 * 1.3),
  viewLogD: Math.log10(radiusKm * 1e3 * view),
  live: true,
});

const SPECTRAL: Record<string, string> = {
  O: 'A rare, blazing-hot blue star that will live only a few million years.',
  B: 'A hot blue-white star, thousands of times brighter than the Sun.',
  A: 'A white star, hotter and more massive than the Sun.',
  F: 'A yellow-white star, a little hotter than the Sun.',
  G: 'A yellow star much like our Sun.',
  K: 'An orange star, cooler and longer-lived than the Sun.',
  M: 'A red dwarf. Three in four stars in the Milky Way are like this, and they can shine for trillions of years.',
  D: 'A white dwarf: the Earth-sized, cooling core left behind by a dead Sun-like star.',
};

export const CATALOG: CatalogObject[] = [
  { ...SUN, ...solid(SUN.radiusKm, 6), pos: () => ORIGIN },
  ...BODIES.map((b) => ({ ...b, ...solid(b.radiusKm, b.id === 'earth' ? 5.6 : 4.5), pos: (t: Date) => helio(b, t) })),
  ...PROBES.map((p) => {
    const dir = radecDir(p.ra, p.dec);
    const epoch = Date.parse(p.epoch);
    return {
      id: p.id, name: p.name, type: 'Interstellar spacecraft', fact: p.fact, size: 'about 3.7 m dish', live: true,
      viewLogD: 14.0, minLogD: shown(4),
      pos: (t: Date) => dir.clone().multiplyScalar((p.distAU + (p.auPerYear * (t.getTime() - epoch)) / 3.15576e10) * AU),
    };
  }),
  ...HELIO_OBJECTS.map((h) => ({
    id: h.id, name: h.name, type: h.type, fact: h.fact, size: `${formatSize(h.radiusAU * AU)}`,
    viewLogD: Math.log10(h.radiusAU * AU * 3.2), minLogD: shown(4), pos: () => ORIGIN,
  })),
  ...STARS.map(([name, x, y, z, , absmag, bv, spect], i) => {
    const t = starTemp(bv);
    const p = eqjToScene(x, y, z).multiplyScalar(PC);
    return {
      id: `star-${i}`, name, type: `Star · ${spect.replace(/\.+$/, '') || 'unknown class'}`,
      size: `≈ ${starRadiusSun(absmag, t).toPrecision(2)} × the Sun's radius`,
      fact: FAMOUS_STARS[name] ?? SPECTRAL[spect[0]] ?? 'One of the Sun\'s stellar neighbors.',
      viewLogD: 16.9, minLogD: shown(5), pos: () => p,
    };
  }),
  (() => {
    const p = galToScene(MILKY_WAY.sunDistKpc, 0, 0).multiplyScalar(KPC);
    return { ...MILKY_WAY, size: formatSize(MILKY_WAY.diameterKpc * KPC / 2), viewLogD: 21.05, minLogD: shown(6), pos: () => p };
  })(),
  ...LOCAL_GROUP.map((g) => {
    const p = galDir(g.l, g.b).multiplyScalar(g.distKpc * KPC);
    return { ...g, size: formatSize((g.diameterKpc * KPC) / 2), viewLogD: Math.max(shown(7), Math.log10(g.diameterKpc * KPC * 2.2)), minLogD: shown(7), pos: () => p };
  }),
  (() => {
    const mw = galToScene(MILKY_WAY.sunDistKpc, 0, 0);
    const m31 = galDir(LOCAL_GROUP[0].l, LOCAL_GROUP[0].b).multiplyScalar(LOCAL_GROUP[0].distKpc);
    const p = mw.lerp(m31, LGC.towardAndromeda).multiplyScalar(KPC);
    return { ...LGC, size: formatSize((LGC.diameterMpc * MPC) / 2), viewLogD: 22.75, minLogD: shown(7), pos: () => p };
  })(),
  ...STRUCTURES.map((s) => {
    const p = galDir(s.l, s.b).multiplyScalar(s.distMpc * MPC);
    return { ...s, size: formatSize((s.sizeMpc * MPC) / 2), viewLogD: Math.max(shown(8), Math.log10(s.sizeMpc * MPC * 4)), minLogD: shown(8), pos: () => p };
  }),
  { ...OBSERVABLE_UNIVERSE, size: formatSize(OBSERVABLE_UNIVERSE.radiusMpc * MPC), viewLogD: 26.85, minLogD: shown(8), pos: () => ORIGIN },
];

export const byId = new Map(CATALOG.map((o) => [o.id, o]));
export const get = (id: string) => byId.get(id)!;
