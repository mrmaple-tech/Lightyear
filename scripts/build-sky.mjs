// Trims d3-celestial data (BSD-3, Olaf Frohn) into src/data/sky.json for the sky view.
// Usage: node scripts/build-sky.mjs path/to/d3-celestial/data > src/data/sky.json
import { readFileSync } from 'node:fs';

const dir = process.argv[2];
const read = (f) => JSON.parse(readFileSync(`${dir}/${f}`, 'utf8')).features;
const r = (v, d = 2) => Math.round(v * 10 ** d) / 10 ** d;
const ra = (lon) => r(((lon % 360) + 360) % 360); // d3-celestial stores RA as -180..180 degrees

const stars = read('stars.6.json')
  .filter((f) => f.properties.mag <= 5.5)
  .map((f) => [ra(f.geometry.coordinates[0]), r(f.geometry.coordinates[1]), r(f.properties.mag, 1), r(+f.properties.bv || 0.6, 1)]);
const lines = read('constellations.lines.json').map((f) => f.geometry.coordinates.map((l) => l.map(([a, d]) => [ra(a), r(d)])));
const names = read('constellations.json').map((f) => [f.properties.en || f.properties.name, ra(f.geometry.coordinates[0]), r(f.geometry.coordinates[1])]);
process.stdout.write(JSON.stringify({ stars, lines, names }));
