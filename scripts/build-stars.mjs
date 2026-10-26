// Trims the HYG v4.1 CSV down to the ~1000 nearest stars plus bright named ones.
// Usage: node scripts/build-stars.mjs path/to/hygdata_v41.csv > src/data/stars.json
import { readFileSync } from 'node:fs';

const lines = readFileSync(process.argv[2], 'utf8').trim().split('\n');
const split = (l) => l.match(/("([^"]*)"|[^,]*)(,|$)/g).map((f) => f.replace(/,$/, '').replace(/^"|"$/g, ''));
const head = split(lines[0]);
const col = (name) => head.indexOf(name);
const C = Object.fromEntries(['proper', 'gl', 'hip', 'dist', 'mag', 'absmag', 'ci', 'spect', 'x', 'y', 'z', 'con', 'bayer'].map((n) => [n, col(n)]));

const rows = lines.slice(1).map(split).filter((r) => +r[C.dist] > 0 && +r[C.dist] < 100000);
rows.sort((a, b) => a[C.dist] - b[C.dist]);
const keep = new Set(rows.slice(0, 1000));
for (const r of rows) if (r[C.proper] && +r[C.mag] < 2.6) keep.add(r);

const r2 = (v) => Math.round(+v * 1000) / 1000;
const out = [...keep].map((r) => [
  r[C.proper] || (r[C.bayer] && r[C.con] ? `${r[C.bayer]} ${r[C.con]}` : r[C.gl] || (r[C.hip] ? `HIP ${r[C.hip]}` : '')),
  r2(r[C.x]), r2(r[C.y]), r2(r[C.z]),
  r2(r[C.mag]), r2(r[C.absmag]), r2(r[C.ci] || 0.6), r[C.spect],
]);
process.stdout.write(JSON.stringify(out));
