// Rough stellar physics from catalog values, good enough for colors and info cards.

/** Effective temperature from B−V color index (Ballesteros 2012). */
export const starTemp = (bv: number) => 4600 * (1 / (0.92 * bv + 1.7) + 1 / (0.92 * bv + 0.62));

/** Approximate blackbody color (linear 0..1 RGB) for a temperature in kelvin. */
export function starColor(t: number): [number, number, number] {
  const k = t / 100;
  const r = k <= 66 ? 255 : 329.7 * (k - 60) ** -0.1332;
  const g = k <= 66 ? 99.47 * Math.log(k) - 161.12 : 288.12 * (k - 60) ** -0.0755;
  const b = k >= 66 ? 255 : k <= 19 ? 0 : 138.52 * Math.log(k - 10) - 305.04;
  const c = (v: number) => Math.min(1, Math.max(0, v / 255));
  return [c(r), c(g), c(b)];
}

/** Radius in solar radii from absolute visual magnitude and temperature (Stefan–Boltzmann). */
export const starRadiusSun = (absmag: number, t: number) => Math.sqrt(10 ** ((4.83 - absmag) / 2.5)) * (5772 / t) ** 2;
