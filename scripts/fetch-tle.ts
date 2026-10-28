// Downloads current TLEs for every satellite in src/data/satellites.ts (run in CI before the build):
//   node --experimental-strip-types scripts/fetch-tle.ts > public/tle.txt
import { SATELLITES } from '../src/data/satellites.ts';

for (const s of SATELLITES) {
  try {
    const res = await fetch(`https://celestrak.org/NORAD/elements/gp.php?CATNR=${s.norad}&FORMAT=TLE`);
    const text = (await res.text()).trim();
    if (res.ok && text.includes('\n1 ')) console.log(text);
    else console.error(`no TLE for ${s.name} (${res.status})`);
  } catch (e) {
    console.error(`no TLE for ${s.name}: ${e}`); // one failure shouldn't drop the rest
  }
}
