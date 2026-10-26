// Procedural galaxy point clouds, authored in the galaxy's own plane (z = thickness).
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
    if (kind < 0.16) { // bulge
      const s = radius * 0.09;
      x = gauss(r) * s; y = gauss(r) * s; z = gauss(r) * s * 0.6;
      col = [0.6, 0.48, 0.34];
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
