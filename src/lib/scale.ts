// Distance/scale formatting shared by the scale bar and info cards.
import { AU, LY, MPC, C_LIGHT } from './coords.ts';

const nf = (n: number, d = 0) => n.toLocaleString('en-US', { maximumFractionDigits: d });

/** Largest 1/2/5×10^n ≤ x. */
export function niceFloor(x: number) {
  const p = 10 ** Math.floor(Math.log10(x));
  return [5, 2, 1].map((m) => m * p).find((v) => v <= x * (1 + 1e-9))!;
}

/** Pick a unit for a length: km → AU → light-years → megaparsecs. */
export function unitFor(m: number): [number, string] {
  if (m < 1e10) return [1e3, 'km'];
  if (m < 0.1 * LY) return [AU, 'AU'];
  if (m < 1e6 * LY) return [LY, 'ly'];
  return [MPC, 'Mpc'];
}

/** Scale bar: a round length that fits in maxPx, and its width in px. */
export function scaleBar(metersPerPx: number, maxPx = 120) {
  const [u, name] = unitFor(metersPerPx * maxPx);
  const v = niceFloor((metersPerPx * maxPx) / u);
  return { label: `${nf(v, 3)} ${name}`, px: (v * u) / metersPerPx };
}

export function formatDistance(m: number) {
  const [u, name] = unitFor(m);
  const v = m / u;
  return `${nf(v, v < 10 ? 2 : 0)} ${name}`;
}

export function lightTime(m: number) {
  const s = m / C_LIGHT;
  if (s < 60) return `${nf(s, 2)} light-seconds`;
  if (s < 3600) return `${nf(s / 60, 1)} light-minutes`;
  if (s < 86400) return `${nf(s / 3600, 1)} light-hours`;
  if (s < 3.15576e7) return `${nf(s / 86400, 1)} light-days`;
  const y = s / 3.15576e7;
  if (y < 1e6) return `${nf(y, y < 10 ? 2 : 0)} light-years`;
  if (y < 1e9) return `${nf(y / 1e6, 1)} million light-years`;
  return `${nf(y / 1e9, 1)} billion light-years`;
}

export function formatSize(radiusM: number) {
  const km = (2 * radiusM) / 1e3;
  return km < 1e7 ? `${nf(km)} km across` : `${formatDistance(2 * radiusM)} across`;
}
