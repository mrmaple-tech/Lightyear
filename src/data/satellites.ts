// Satellites drawn around Earth. Positions come from live orbital elements (TLEs) by NORAD
// catalog number; see src/lib/satellites.ts and scripts/fetch-tle.ts.
import type { Fade } from './layers.ts';

export interface Satellite {
  id: string;
  norad: number;
  name: string;
  /** Short on-screen label. */
  label: string;
  type: string;
  size?: string;
  /** Zoom (log10 m) for "Fly to". */
  viewLogD: number;
  fade: Fade;
  /** Orbit ring opacity; the headline station is drawn brighter than the rest. */
  ring: number;
  fact: string;
}

const LEO: Fade = [-Infinity, -Infinity, 8.8, 9.4];

export const SATELLITES: Satellite[] = [
  { id: 'iss', norad: 25544, name: 'International Space Station (ISS)', label: 'ISS', type: 'Crewed space station', size: '109 m end to end', viewLogD: 6.95, fade: LEO, ring: 0.35,
    fact: 'It circles Earth every ~92 minutes at about 28,000 km/h, so its crew sees 16 sunrises a day. Continuously crewed since November 2000.' },
  { id: 'hubble', norad: 20580, name: 'Hubble Space Telescope', label: 'Hubble', type: 'Space telescope', size: '13.2 m long', viewLogD: 6.95, fade: LEO, ring: 0.2,
    fact: 'Launched in 1990, its Deep Field images found thousands of galaxies in a patch of sky smaller than a grain of sand held at arm\'s length.' },
  { id: 'tiangong', norad: 48274, name: 'Tiangong space station', label: 'Tiangong', type: 'Crewed space station', size: 'about 55 m across', viewLogD: 6.95, fade: LEO, ring: 0.2,
    fact: 'China\'s three-module station; its name means "Heavenly Palace". Crews have lived aboard since 2021.' },
  { id: 'landsat-9', norad: 49260, name: 'Landsat 9', label: 'Landsat 9', type: 'Earth-observation satellite', viewLogD: 6.95, fade: LEO, ring: 0.2,
    fact: 'It extends the Landsat record of Earth\'s surface that began in 1972, the longest continuous view of our planet from space.' },
  { id: 'goes-19', norad: 60133, name: 'GOES-19', label: 'GOES-19', type: 'Geostationary weather satellite', viewLogD: 7.3, fade: [-Infinity, -Infinity, 9.2, 9.8], ring: 0.2,
    fact: 'At 35,786 km up it orbits exactly once a day, so it hangs over the same spot above the Americas and images the weather every few minutes.' },
];
