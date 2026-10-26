import raw from './stars.json';

/** HYG v4.1 row, trimmed: [name, x, y, z (pc, equatorial J2000), apparent mag, absolute mag, B−V color index, spectral type]. */
export type StarRow = [string, number, number, number, number, number, number, string];
export const STARS = raw as StarRow[];

/** Stars that get a permanent label and a fun fact. Names match HYG `proper` names. */
export const FAMOUS_STARS: Record<string, string> = {
  'Proxima Centauri': 'The closest star to the Sun. It hosts at least one Earth-sized planet in its habitable zone.',
  'Rigil Kentaurus': 'Alpha Centauri A, the brighter half of the nearest Sun-like star system.',
  Sirius: 'The brightest star in the night sky. It has a white-dwarf companion, Sirius B.',
  "Barnard's Star": 'Has the fastest apparent motion across our sky of any star.',
  'Wolf 359': 'A tiny red dwarf; Star Trek fans know it as the site of a famous battle.',
  Procyon: 'Its name means "before the dog": it rises just before Sirius, the Dog Star.',
  Altair: 'Spins so fast it bulges: its equator is about 20% wider than its poles.',
  Vega: 'The original zero-point of the astronomical magnitude scale, and our future pole star (~12,000 years).',
  Fomalhaut: 'Surrounded by a vast dusty debris disk, like a young solar system.',
  Arcturus: 'An orange giant racing through the Milky Way\'s disk at about 122 km/s relative to the Sun.',
  Capella: 'Actually four stars: two yellow giants and a pair of red dwarfs.',
  Aldebaran: 'The "eye" of Taurus. Pioneer 10 is heading roughly its way, arriving in about 2 million years.',
  Polaris: 'The North Star, a Cepheid variable that pulses every four days.',
  Canopus: 'The second-brightest star in the night sky; spacecraft use it for navigation.',
  Spica: 'A tight binary whose two stars are distorted into egg shapes by each other\'s gravity.',
  Antares: 'A red supergiant so large it would swallow the orbit of Mars.',
  Betelgeuse: 'A red supergiant expected to go supernova within ~100,000 years. It dimmed dramatically in 2019–20.',
  Rigel: 'A blue supergiant roughly 100,000 times more luminous than the Sun.',
  Deneb: 'One of the most luminous stars visible to the naked eye, yet over 400 parsecs away.',
};
