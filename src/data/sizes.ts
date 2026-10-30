// The size comparison lineup, smallest to largest: from the Moon to the solar system.
// Radii in km; star sizes are published estimates.
const SUN_KM = 696_000;
const AU_KM = 1.496e8;

export type SizedKind = 'moon' | 'earth' | 'planet' | 'star' | 'system';

export interface Sized {
  name: string;
  radiusKm: number;
  kind: SizedKind;
  /** Star granulation colors [dark, light] (linear RGB). */
  colors?: [[number, number, number], [number, number, number]];
  note?: string;
}

const star = (name: string, radiusSun: number, dark: [number, number, number], light: [number, number, number], note?: string): Sized =>
  ({ name, radiusKm: radiusSun * SUN_KM, kind: 'star', colors: [dark, light], note });

export const SIZES: Sized[] = [
  { name: 'Moon', radiusKm: 1737, kind: 'moon' },
  { name: 'Mercury', radiusKm: 2440, kind: 'planet' },
  { name: 'Mars', radiusKm: 3390, kind: 'planet' },
  { name: 'Venus', radiusKm: 6052, kind: 'planet' },
  { name: 'Earth', radiusKm: 6371, kind: 'earth' },
  { name: 'Neptune', radiusKm: 24_622, kind: 'planet' },
  { name: 'Uranus', radiusKm: 25_362, kind: 'planet' },
  { name: 'Saturn', radiusKm: 58_232, kind: 'planet' },
  { name: 'Jupiter', radiusKm: 69_911, kind: 'planet' },
  star('Sun', 1, [1, 0.42, 0.08], [1, 0.92, 0.65]),
  star('Sirius A', 1.71, [0.55, 0.7, 1], [0.9, 0.95, 1]),
  star('Arcturus', 25.4, [1, 0.35, 0.08], [1, 0.75, 0.45]),
  star('Rigel', 79, [0.45, 0.6, 1], [0.85, 0.92, 1]),
  star('Betelgeuse', 764, [0.9, 0.2, 0.04], [1, 0.55, 0.25]),
  star('VY Canis Majoris', 1420, [0.85, 0.16, 0.03], [1, 0.48, 0.2]),
  star('Stephenson 2-18', 2150, [0.8, 0.13, 0.03], [1, 0.42, 0.18], 'One of the largest known stars; size estimates vary widely.'),
  { name: 'Solar system (to Neptune)', radiusKm: 30.07 * AU_KM, kind: 'system', note: 'Light takes about 4 hours to cross from the Sun to Neptune.' },
];

export const SUN_RADIUS_KM = SUN_KM;
