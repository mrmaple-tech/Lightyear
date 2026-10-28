// Satellite positions: load orbital elements (TLEs) once, then propagate locally with SGP4 every
// frame, so satellites move in real time and follow the time slider (accurate for days around now).
import { propagate, twoline2satrec, type SatRec } from 'satellite.js';
import { Vector3 } from 'three';
import { eqjToScene } from './coords.ts';
import { SATELLITES } from '../data/satellites.ts';

const recs = new Map<number, SatRec>();

/** Parse TLE text (optional name lines + line pairs) into the records we track. */
function addTles(text: string) {
  const lines = text.split('\n').map((l) => l.trim());
  lines.forEach((l1, i) => {
    const l2 = lines[i + 1];
    if (l1.startsWith('1 ') && l2?.startsWith('2 ')) recs.set(Number(l1.slice(2, 7)), twoline2satrec(l1, l2));
  });
}

async function get(url: string) {
  try {
    const res = await fetch(url);
    return res.ok ? await res.text() : '';
  } catch {
    return '';
  }
}

/**
 * Loads every satellite's elements. First the copy the deploy fetched (same origin, refreshed daily),
 * then live sources for anything missing (useful in local dev). Resolves when done.
 */
export async function loadSatellites() {
  addTles(await get(`${import.meta.env.BASE_URL}tle.txt`));
  await Promise.all(SATELLITES.filter((s) => !recs.has(s.norad)).map(async (s) => {
    if (s.norad === 25544) {
      const t = await get('https://api.wheretheiss.at/v1/satellites/25544/tles');
      if (t.startsWith('{')) { const { line1, line2 } = JSON.parse(t); addTles(`${line1}\n${line2}`); }
    }
    if (!recs.has(s.norad)) addTles(await get(`https://celestrak.org/NORAD/elements/gp.php?CATNR=${s.norad}&FORMAT=TLE`));
  }));
}

export const hasElements = (norad: number) => recs.has(norad);

/** Orbital period in minutes (mean motion is rad/min). */
export const periodMin = (norad: number) => {
  const r = recs.get(norad);
  return r ? (2 * Math.PI) / r.no : 90;
};

const cache = new Map<number, { t: number; v: Vector3 | null }>();
/**
 * Position relative to Earth's center in meters (scene frame); null if not loaded or SGP4 fails
 * (far from the TLE epoch). TEME is treated as J2000, matching how Earth's rotation is drawn, so a
 * satellite sits over the right spot on the globe.
 */
export function satOffset(norad: number, t: Date): Vector3 | null {
  const hit = cache.get(norad);
  if (hit?.t === t.getTime()) return hit.v;
  const rec = recs.get(norad);
  const p = rec && propagate(rec, t)?.position;
  const v = p && typeof p === 'object' && Number.isFinite(p.x) ? eqjToScene(p.x, p.y, p.z).multiplyScalar(1e3) : null;
  cache.set(norad, { t: t.getTime(), v });
  return v;
}
