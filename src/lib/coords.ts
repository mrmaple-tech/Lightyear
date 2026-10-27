// Shared coordinate frames. World space is heliocentric, in meters, with the
// ecliptic plane laid flat on three.js' XZ plane (Y = ecliptic north).
import { Matrix4, Vector3 } from 'three';
import { SiderealTime } from 'astronomy-engine';

export const AU = 1.495978707e11;
export const LY = 9.4607304725808e15;
export const PC = 3.0856775814913673e16;
export const KPC = PC * 1e3;
export const MPC = PC * 1e6;
export const C_LIGHT = 299792458;
const DEG = Math.PI / 180;
const OBLIQUITY = 23.4392911 * DEG;

/** Ecliptic J2000 (x, y, z=north) → scene (Y up). */
export const eclToScene = (x: number, y: number, z: number) => new Vector3(x, z, -y);

/** Equatorial J2000 (astronomy-engine EQJ, HYG xyz) → scene. */
export function eqjToScene(x: number, y: number, z: number) {
  const c = Math.cos(OBLIQUITY), s = Math.sin(OBLIQUITY);
  return eclToScene(x, y * c + z * s, -y * s + z * c);
}

const unit = (lon: number, lat: number): [number, number, number] =>
  [Math.cos(lat * DEG) * Math.cos(lon * DEG), Math.cos(lat * DEG) * Math.sin(lon * DEG), Math.sin(lat * DEG)];

// Galactic → equatorial J2000 (transpose of the standard IAU eq→gal matrix).
const G = [
  [-0.0548755604, 0.4941094279, -0.8676661490],
  [-0.8734370902, -0.4448296300, -0.1980763734],
  [-0.4838350155, 0.7469822445, 0.4559837762],
];
export function galToScene(x: number, y: number, z: number) {
  return eqjToScene(G[0][0] * x + G[0][1] * y + G[0][2] * z, G[1][0] * x + G[1][1] * y + G[1][2] * z, G[2][0] * x + G[2][1] * y + G[2][2] * z);
}

/** Galactic longitude/latitude (deg) → scene unit vector. */
export const galDir = (l: number, b: number) => galToScene(...unit(l, b));
/** Right ascension (hours) / declination (deg) → scene unit vector. */
export const radecDir = (ra: number, dec: number) => eqjToScene(...unit(ra * 15, dec));
/** Ecliptic longitude/latitude (deg) → scene unit vector. */
export const eclDir = (lon: number, lat: number) => eclToScene(...unit(lon, lat));

/** Put geometry authored in galactic coordinates inside a group with this matrix. */
export const GAL_BASIS = new Matrix4().makeBasis(galToScene(1, 0, 0), galToScene(0, 1, 0), galToScene(0, 0, 1));

/** Earth's body-fixed orientation: three.js sphere UVs put longitude 0 on +X and the north pole on +Y. */
export function earthBasis(date: Date) {
  const th = SiderealTime(date) * 15 * DEG; // ponytail: ignores precession (~0.4° by 2026), fine for visuals
  const lon0 = eqjToScene(Math.cos(th), Math.sin(th), 0);
  const lon90 = eqjToScene(-Math.sin(th), Math.cos(th), 0);
  return new Matrix4().makeBasis(lon0, eqjToScene(0, 0, 1), lon90.negate());
}

/** Trapezoid visibility window over log10(camera distance). */
export function fade(logD: number, [a, b, c, d]: readonly [number, number, number, number]) {
  const ss = (e0: number, e1: number, x: number) => {
    const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0)));
    return t * t * (3 - 2 * t);
  };
  return (b > a ? ss(a, b, logD) : logD >= b ? 1 : 0) * (d > c ? 1 - ss(c, d, logD) : logD <= c ? 1 : 0);
}

/** Small seeded PRNG so procedural layers look the same every visit. */
export function rng(seed: number) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export const gauss = (r: () => number) => Math.sqrt(-2 * Math.log(r() + 1e-12)) * Math.cos(2 * Math.PI * r());
