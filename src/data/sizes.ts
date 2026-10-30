// Bodies for the size comparison, smallest to largest. Radii in km; star radii are published estimates.
const SUN_KM = 696_000;

export interface Sized { name: string; radiusKm: number; color: string }

export const SIZES: Sized[] = [
  { name: 'Moon', radiusKm: 1737, color: '#bdbdbd' },
  { name: 'Mercury', radiusKm: 2440, color: '#a39d95' },
  { name: 'Mars', radiusKm: 3390, color: '#cf7a4c' },
  { name: 'Venus', radiusKm: 6052, color: '#f0dcae' },
  { name: 'Earth', radiusKm: 6371, color: '#4f86d9' },
  { name: 'Neptune', radiusKm: 24_622, color: '#5b85e6' },
  { name: 'Uranus', radiusKm: 25_362, color: '#a9e2e8' },
  { name: 'Saturn', radiusKm: 58_232, color: '#e3cf98' },
  { name: 'Jupiter', radiusKm: 69_911, color: '#d8b48c' },
  { name: 'Sun', radiusKm: SUN_KM, color: '#ffd26a' },
  { name: 'Sirius A', radiusKm: 1.71 * SUN_KM, color: '#cfe0ff' },
  { name: 'Arcturus', radiusKm: 25.4 * SUN_KM, color: '#ffb26b' },
  { name: 'Rigel', radiusKm: 79 * SUN_KM, color: '#b9d1ff' },
  { name: 'Betelgeuse', radiusKm: 764 * SUN_KM, color: '#ff8a4a' },
  { name: 'VY Canis Majoris', radiusKm: 1420 * SUN_KM, color: '#ff6a3c' },
];
