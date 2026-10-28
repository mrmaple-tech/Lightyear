import { Body } from 'astronomy-engine';
import type { Fade } from './layers.ts';

export interface Look {
  /** Base, light and accent colors. */
  colors: [string, string, string];
  /** Latitude band frequency (0 = rocky, noise-only surface). */
  bands: number;
  /** How much the bands swirl. */
  turb: number;
  /** Atmosphere rim strength. */
  rim: number;
}

export interface SolarBody {
  id: string;
  name: string;
  body: Body;
  type: string;
  radiusKm: number;
  /** Procedural surface (Earth and Moon use photo textures instead). */
  look?: Look;
  /** Orbital period in days (for drawing the orbit line). */
  periodDays: number;
  layer: 1 | 2 | 3;
  fade: Fade;
  fact: string;
}

const I = Infinity;
const INNER: Fade = [8.2, 9.0, 13.2, 14.0];
const OUTER: Fade = [11.2, 12.0, 15.2, 16.0];

export const SUN = {
  id: 'sun', name: 'Sun', type: 'G-type main-sequence star', radiusKm: 696_000,
  fade: [-I, -I, 16.6, 17.4] as Fade,
  fact: 'The Sun holds 99.86% of all the mass in the solar system.',
};

export const BODIES: SolarBody[] = [
  { id: 'earth', name: 'Earth', body: Body.Earth, type: 'Terrestrial planet', radiusKm: 6371, periodDays: 365.256, layer: 1, fade: [-I, -I, 13.4, 14.2],
    fact: 'Earth is the densest planet in the solar system, and the only one not named after a god.' },
  { id: 'moon', name: 'Moon', body: Body.Moon, type: 'Natural satellite', radiusKm: 1737.4, periodDays: 27.3217, layer: 1, fade: [-I, -I, 9.8, 10.4],
    fact: 'The Moon drifts about 3.8 cm farther from Earth every year.' },
  { id: 'mercury', name: 'Mercury', body: Body.Mercury, type: 'Terrestrial planet', radiusKm: 2439.7, look: { colors: ['#5f5a55', '#a39d95', '#3e3a37'], bands: 0, turb: 0, rim: 0 }, periodDays: 87.969, layer: 2, fade: INNER,
    fact: 'A day on Mercury (sunrise to sunrise) lasts two of its years.' },
  { id: 'venus', name: 'Venus', body: Body.Venus, type: 'Terrestrial planet', radiusKm: 6051.8, look: { colors: ['#c99a55', '#f3e2b8', '#b88a4a'], bands: 7, turb: 5, rim: 0.7 }, periodDays: 224.701, layer: 2, fade: INNER,
    fact: 'Venus spins backwards, so the Sun rises in the west there.' },
  { id: 'mars', name: 'Mars', body: Body.Mars, type: 'Terrestrial planet', radiusKm: 3389.5, look: { colors: ['#8a3a1f', '#cf7a4c', '#5a2614'], bands: 0, turb: 0, rim: 0.25 }, periodDays: 686.98, layer: 2, fade: INNER,
    fact: 'Olympus Mons on Mars is about 2.5 times taller than Mount Everest.' },
  { id: 'jupiter', name: 'Jupiter', body: Body.Jupiter, type: 'Gas giant', radiusKm: 69_911, look: { colors: ['#a87a52', '#efe3cf', '#c0573a'], bands: 28, turb: 3, rim: 0.35 }, periodDays: 4332.59, layer: 3, fade: OUTER,
    fact: 'The Great Red Spot is a storm wider than Earth that has raged for centuries.' },
  { id: 'saturn', name: 'Saturn', body: Body.Saturn, type: 'Gas giant', radiusKm: 58_232, look: { colors: ['#b8975f', '#f1e2bb', '#9c7c48'], bands: 34, turb: 1.5, rim: 0.3 }, periodDays: 10_759.22, layer: 3, fade: OUTER,
    fact: 'Saturn is less dense than water. Its rings are mostly only about 10 m thick.' },
  { id: 'uranus', name: 'Uranus', body: Body.Uranus, type: 'Ice giant', radiusKm: 25_362, look: { colors: ['#86cbd6', '#c3f0f2', '#78b9c6'], bands: 9, turb: 0.8, rim: 0.8 }, periodDays: 30_688.5, layer: 3, fade: OUTER,
    fact: 'Uranus rolls around the Sun on its side, tilted 98°.' },
  { id: 'neptune', name: 'Neptune', body: Body.Neptune, type: 'Ice giant', radiusKm: 24_622, look: { colors: ['#2a4fc0', '#6a95ee', '#16307a'], bands: 13, turb: 2.5, rim: 0.8 }, periodDays: 60_182, layer: 3, fade: OUTER,
    fact: 'Neptune has the fastest winds measured in the solar system, over 2,000 km/h.' },
  { id: 'pluto', name: 'Pluto', body: Body.Pluto, type: 'Dwarf planet', radiusKm: 1188.3, look: { colors: ['#7d6650', '#e6d5bc', '#4f3d2e'], bands: 0, turb: 0, rim: 0.1 }, periodDays: 90_560, layer: 3, fade: OUTER,
    fact: 'Pluto has a heart-shaped glacier of nitrogen ice called Tombaugh Regio.' },
];

/** Saturn's north pole (RA h, Dec °) for orienting its rings. */
export const SATURN_POLE = { ra: 40.589 / 15, dec: 83.537 };

/** Main asteroid belt extent in AU. */
export const ASTEROID_BELT = { inner: 2.1, outer: 3.3, count: 4500 };

export interface Probe {
  id: string;
  name: string;
  /** Direction (RA h, Dec °), distance in AU at epoch, and outward speed in AU/yr. */
  ra: number; dec: number; distAU: number; epoch: string; auPerYear: number;
  fact: string;
}

export const PROBES: Probe[] = [
  { id: 'voyager-1', name: 'Voyager 1', ra: 17.22, dec: 12.1, distAU: 162.5, epoch: '2024-01-01', auPerYear: 3.57,
    fact: 'Launched in 1977, Voyager 1 crossed the heliopause in 2012, the first human-made object in interstellar space.' },
  { id: 'voyager-2', name: 'Voyager 2', ra: 19.95, dec: -59.4, distAU: 136.0, epoch: '2024-01-01', auPerYear: 3.2,
    fact: 'Voyager 2 is the only spacecraft to have visited Uranus and Neptune.' },
];

export const HELIOSPHERE = {
  /** Direction the heliosphere's nose points (upwind of the interstellar flow), ecliptic lon/lat. */
  noseLon: 255.4, noseLat: 5.2,
  terminationShockAU: 90, heliopauseAU: 120,
  oortInnerAU: 2000, oortOuterAU: 100_000,
};

export const HELIO_OBJECTS = [
  { id: 'heliopause', name: 'Heliopause', type: 'Boundary of the heliosphere', radiusAU: HELIOSPHERE.heliopauseAU,
    fact: "Where the Sun's solar wind is stopped by the interstellar medium; both Voyagers have crossed it." },
  { id: 'oort-cloud', name: 'Oort cloud', type: 'Hypothesized comet reservoir', radiusAU: HELIOSPHERE.oortOuterAU,
    fact: 'Nobody has directly seen an Oort cloud object; we infer it from long-period comets.' },
];
