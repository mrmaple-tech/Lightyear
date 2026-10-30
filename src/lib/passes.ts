// When a satellite passes over the viewer: horizon crossings over the next two days, and whether
// each pass is visible to the eye (satellite still in sunlight while the observer's sky is dark).
import { degreesToRadians, ecfToLookAngles, eciToEcf, gstime, propagate } from 'satellite.js';
import { Body, Equator, GeoVector, Horizon, Observer } from 'astronomy-engine';
import { getRec } from './satellites.ts';

export interface Pass { rise: Date; set: Date; maxEl: number; riseDir: string; setDir: string; visible: boolean }
export type PassReport = { passes: Pass[] } | { always: number; dir: string } | { never: true };

const STEP = 30e3;
const HOURS = 48;
const R_EARTH = 6371;
const DIRS = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
const compass = (az: number) => DIRS[Math.round(((az * 180) / Math.PI) / 45) % 8];

function look(norad: number, t: Date, lat: number, lon: number) {
  const p = propagate(getRec(norad)!, t)?.position;
  if (!p || typeof p !== 'object') return null;
  const la = ecfToLookAngles({ latitude: degreesToRadians(lat), longitude: degreesToRadians(lon), height: 0 }, eciToEcf(p, gstime(t)));
  return { el: la.elevation, az: la.azimuth, p };
}

/** Naked-eye visible: the observer is in at least civil twilight and the satellite is outside Earth's shadow. */
function visibleAt(t: Date, lat: number, lon: number, p: { x: number; y: number; z: number }) {
  const obs = new Observer(lat, lon, 0);
  const sun = Equator(Body.Sun, t, obs, true, true);
  if (Horizon(t, obs, sun.ra, sun.dec).altitude > -6) return false;
  const s = GeoVector(Body.Sun, t, true);
  const n = Math.hypot(s.x, s.y, s.z);
  const d = (p.x * s.x + p.y * s.y + p.z * s.z) / n;
  return d > 0 || Math.hypot(p.x - (d * s.x) / n, p.y - (d * s.y) / n, p.z - (d * s.z) / n) > R_EARTH;
}

export function passes(norad: number, lat: number, lon: number, from = new Date()): PassReport {
  if (!getRec(norad)) return { never: true };
  const out: Pass[] = [];
  let cur: { rise: Date; riseAz: number; maxEl: number; maxT: Date; maxP: { x: number; y: number; z: number } } | null = null;
  let up = 0, samples = 0, lastAz = 0;
  for (let t = from.getTime(); t < from.getTime() + HOURS * 3.6e6 && out.length < 5; t += STEP) {
    const date = new Date(t);
    const l = look(norad, date, lat, lon);
    if (!l) break;
    samples++;
    if (l.el > 0) {
      up++;
      if (!cur) cur = { rise: date, riseAz: l.az, maxEl: l.el, maxT: date, maxP: l.p };
      if (l.el > cur.maxEl) Object.assign(cur, { maxEl: l.el, maxT: date, maxP: l.p });
      lastAz = l.az;
    } else if (cur) {
      const maxEl = (cur.maxEl * 180) / Math.PI;
      if (maxEl >= 10) out.push({ rise: cur.rise, set: date, maxEl, riseDir: compass(cur.riseAz), setDir: compass(lastAz), visible: visibleAt(cur.maxT, lat, lon, cur.maxP) });
      cur = null;
    }
  }
  // geostationary and similar: never crosses the horizon
  if (!out.length && samples && up === samples) {
    const l = look(norad, from, lat, lon)!;
    return { always: (l.el * 180) / Math.PI, dir: compass(l.az) };
  }
  return out.length ? { passes: out } : { never: true };
}
