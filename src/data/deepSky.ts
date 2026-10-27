export interface Galaxy {
  id: string;
  name: string;
  type: string;
  /** Galactic longitude/latitude (deg) and distance (kpc) from the Sun. */
  l: number; b: number; distKpc: number;
  diameterKpc: number;
  shape: 'spiral' | 'irregular';
  /** Disk tilt (Euler XYZ, degrees) for the procedural cloud. */
  tilt: [number, number, number];
  fact: string;
}

export const MILKY_WAY = {
  id: 'milky-way', name: 'Milky Way', type: 'Barred spiral galaxy',
  /** The Sun sits ~8.2 kpc from the center; galactic +X points at the center. */
  sunDistKpc: 8.2, diameterKpc: 30, count: 70_000,
  fact: 'Our galaxy holds 100–400 billion stars. The Sun takes ~230 million years to orbit its center once.',
};

export const LOCAL_GROUP: Galaxy[] = [
  { id: 'andromeda', name: 'Andromeda (M31)', type: 'Spiral galaxy', l: 121.17, b: -21.57, distKpc: 765, diameterKpc: 46, shape: 'spiral', tilt: [77, 0, 38],
    fact: 'Andromeda is heading toward us at ~110 km/s and will merge with the Milky Way in about 4.5 billion years.' },
  { id: 'triangulum', name: 'Triangulum (M33)', type: 'Spiral galaxy', l: 133.61, b: -31.33, distKpc: 840, diameterKpc: 18.7, shape: 'spiral', tilt: [55, 0, 20],
    fact: 'Under very dark skies, Triangulum is the most distant object most people can see with the naked eye.' },
  { id: 'lmc', name: 'Large Magellanic Cloud', type: 'Irregular dwarf galaxy', l: 280.47, b: -32.89, distKpc: 50, diameterKpc: 9.9, shape: 'irregular', tilt: [30, 0, 0],
    fact: 'Home of supernova 1987A, the closest supernova seen since the invention of the telescope.' },
  { id: 'smc', name: 'Small Magellanic Cloud', type: 'Irregular dwarf galaxy', l: 302.8, b: -44.3, distKpc: 62, diameterKpc: 5.8, shape: 'irregular', tilt: [60, 0, 40],
    fact: 'Ferdinand Magellan\'s crew described both Magellanic Clouds during their 1519 voyage.' },
];

/** The group's center of mass sits roughly midway between its two giants. */
export const LOCAL_GROUP_CENTER = {
  id: 'local-group', name: 'Local Group', type: 'Galaxy group', towardAndromeda: 0.5, diameterMpc: 3,
  fact: 'More than 80 galaxies bound by gravity, dominated by the Milky Way and Andromeda, which are falling toward each other.',
};

export interface Structure {
  id: string;
  name: string;
  type: string;
  l: number; b: number; distMpc: number;
  sizeMpc: number;
  fact: string;
}

export const STRUCTURES: Structure[] = [
  { id: 'virgo-cluster', name: 'Virgo Cluster', type: 'Galaxy cluster', l: 283.8, b: 74.5, distMpc: 16.5, sizeMpc: 2.2,
    fact: 'About 1,300 galaxies; its gravity is slowly pulling the Local Group toward it.' },
  { id: 'great-attractor', name: 'Great Attractor', type: 'Gravitational anomaly', l: 307.8, b: 9.3, distMpc: 75, sizeMpc: 50,
    fact: 'Hidden behind the Milky Way\'s disk, it tugs on galaxies across hundreds of millions of light-years.' },
  { id: 'coma-cluster', name: 'Coma Cluster', type: 'Galaxy cluster', l: 58.1, b: 87.96, distMpc: 99, sizeMpc: 6,
    fact: 'Fritz Zwicky first inferred dark matter in 1933 from how fast its galaxies move.' },
  { id: 'shapley', name: 'Shapley Supercluster', type: 'Supercluster', l: 312, b: 31, distMpc: 200, sizeMpc: 80,
    fact: 'The most massive concentration of galaxies in our cosmic neighborhood.' },
  { id: 'bootes-void', name: 'Boötes Void', type: 'Cosmic void', l: 80, b: 60, distMpc: 210, sizeMpc: 100,
    fact: 'A near-empty sphere ~330 million light-years across with only about 60 galaxies.' },
];

export const OBSERVABLE_UNIVERSE = {
  id: 'observable-universe', name: 'Edge of the observable universe', type: 'Cosmological horizon',
  radiusMpc: 14_250,
  fact: 'Light from here left 13.8 billion years ago, but space has stretched so the edge is now ~46 billion light-years away.',
};

export const COSMIC_WEB = { nearRadiusMpc: 600, nearNodes: 380, farNodes: 550 };
