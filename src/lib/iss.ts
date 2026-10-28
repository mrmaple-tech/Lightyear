// Live ISS position: fetch the latest orbital elements (TLE) once, then propagate locally
// with SGP4 every frame, so the station also follows the time slider (accurate for a few days around now).
import { propagate, twoline2satrec, type SatRec } from 'satellite.js';
import { Vector3 } from 'three';
import { eqjToScene } from './coords.ts';

const SOURCES = [
  'https://api.wheretheiss.at/v1/satellites/25544/tles', // JSON { line1, line2 }
  'https://celestrak.org/NORAD/elements/gp.php?CATNR=25544&FORMAT=TLE', // name + two lines of text
];

let satrec: SatRec | null = null;

/** Resolves true once orbital elements are loaded from the first source that answers. */
export async function loadIss() {
  for (const url of SOURCES) {
    try {
      const res = await fetch(url);
      if (!res.ok) continue;
      const text = (await res.text()).trim();
      const [l1, l2] = text.startsWith('{') ? [JSON.parse(text).line1, JSON.parse(text).line2] : text.split('\n').slice(-2).map((l) => l.trim());
      satrec = twoline2satrec(l1, l2);
      return true;
    } catch {
      // try the next source
    }
  }
  return false;
}

/** Orbital period in minutes (from mean motion in rad/min). */
export const issPeriodMin = () => (satrec ? (2 * Math.PI) / satrec.no : 92.9);

const cache = { t: NaN, v: null as Vector3 | null };
/**
 * ISS position relative to Earth's center, in meters, scene frame; null if not loaded or SGP4 fails
 * (far from the TLE epoch). TEME is treated as J2000 like the Earth's rotation is, so the station
 * sits over the right spot on the rendered globe.
 */
export function issOffset(t: Date): Vector3 | null {
  if (cache.t === t.getTime()) return cache.v;
  const pv = satrec && propagate(satrec, t);
  const p = pv?.position;
  cache.t = t.getTime();
  cache.v = p && Number.isFinite(p.x) ? eqjToScene(p.x, p.y, p.z).multiplyScalar(1e3) : null;
  return cache.v;
}
