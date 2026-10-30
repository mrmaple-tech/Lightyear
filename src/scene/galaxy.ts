// Procedural point clouds: galaxies (authored in their own plane, z = thickness) and the cosmic web.
import { Vector3 } from 'three';
import { gauss, rng } from '../lib/coords.ts';
import type { cloud } from './PointCloud.tsx';

type Cloud = ReturnType<typeof cloud>;

export function addSpiral(c: Cloud, { count, radius, arms = 4, pitchDeg = 13, cx = 0, seed = 1, bright = 1 }: {
  count: number; radius: number; arms?: number; pitchDeg?: number; cx?: number; seed?: number; bright?: number;
}) {
  const r = rng(seed);
  const k = 1 / Math.tan((pitchDeg * Math.PI) / 180);
  for (let i = 0; i < count; i++) {
    const kind = r();
    let x: number, y: number, z: number, col: [number, number, number], size = 1 + r() * 1.2;
    if (kind < 0.1) { // bulge
      const s = radius * 0.09;
      x = gauss(r) * s; y = gauss(r) * s; z = gauss(r) * s * 0.6;
      col = [0.4, 0.31, 0.22];
    } else {
      const d = Math.min(radius, radius * 0.08 + (-Math.log(1 - r() * 0.98) * radius) / 4);
      const onArm = kind < 0.72;
      // trailing log spirals; arms 0 and 2 are the major ones
      const arm = Math.floor(r() * arms);
      const th = onArm ? (arm * 2 * Math.PI) / arms + Math.log(d / (radius * 0.08)) * k + gauss(r) * (0.18 + 0.1 * (arm % 2)) : r() * Math.PI * 2;
      x = d * Math.cos(th); y = d * Math.sin(th); z = gauss(r) * radius * 0.012;
      const pink = onArm && r() < 0.04;
      col = pink ? [1, 0.45, 0.6] : onArm ? [0.62, 0.74, 1] : [0.85, 0.82, 0.78];
      if (pink) size += 0.8;
    }
    const b = (0.22 + r() * 0.38) * bright;
    c.push(x + cx, y, z, col[0] * b, col[1] * b, col[2] * b, size);
  }
}

export function addIrregular(c: Cloud, { count, radius, seed = 1, bright = 1 }: { count: number; radius: number; seed?: number; bright?: number }) {
  const r = rng(seed);
  const clumps = Array.from({ length: 6 }, () => [gauss(r) * radius * 0.35, gauss(r) * radius * 0.2, radius * (0.08 + r() * 0.15)]);
  for (let i = 0; i < count; i++) {
    const [cx, cy, s] = r() < 0.55 ? clumps[Math.floor(r() * clumps.length)] : [0, 0, radius * 0.38];
    const b = (0.25 + r() * 0.4) * bright;
    const blue = r() < 0.5;
    c.push(cx + gauss(r) * s * 1.4, cy + gauss(r) * s, gauss(r) * s * 0.4, (blue ? 0.7 : 0.95) * b, (blue ? 0.8 : 0.85) * b, b * (blue ? 1 : 0.75), 1 + r() * 1.3);
  }
}

/** The three points closest to `a`, nearest first. */
function nearest3(pts: Vector3[], a: Vector3) {
  const best: [number, Vector3][] = [];
  for (const b of pts) {
    if (b === a) continue;
    const d = b.distanceToSquared(a);
    if (best.length === 3 && d >= best[2][0]) continue;
    best.push([d, b]);
    best.sort((x, y) => x[0] - y[0]);
    if (best.length > 3) best.pop();
  }
  return best.map(([, b]) => b);
}

/** Random nodes linked to their 3 nearest neighbors; galaxies scatter along the links and pile up at nodes. */
export function web(c: Cloud, seed: number, nodes: number, rMin: number, rMax: number, scatter: number, perLink: number, perNode: number) {
  const r = rng(seed);
  const pts: Vector3[] = [];
  while (pts.length < nodes) {
    const v = new Vector3(r() * 2 - 1, r() * 2 - 1, r() * 2 - 1);
    if (v.length() > 1) continue;
    v.multiplyScalar(rMax);
    if (v.length() >= rMin) pts.push(v);
  }
  // ponytail: O(n²) neighbor scan (no sorting), fine for a few hundred nodes generated once
  for (const a of pts) {
    const near = nearest3(pts, a);
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
