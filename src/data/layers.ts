export type Fade = readonly [number, number, number, number];

export interface Layer {
  id: number;
  name: string;
  /** log10(camera distance in m) range this layer "owns" for the indicator. */
  range: readonly [number, number];
  /** Where clicking the layer name zooms to. */
  home: number;
  /** Object the camera centers on when jumping here. */
  focus: string;
  /** Cross-fade window for the layer's own content. */
  fade: Fade;
  /** Optional camera direction after jumping here, as galactic [l, b] in degrees. */
  viewGal?: readonly [number, number];
}

const I = Infinity;
export const LAYERS: Layer[] = [
  { id: 1, name: 'Earth & Moon', range: [6.9, 9.3], home: 7.55, focus: 'earth', fade: [-I, -I, 9.6, 10.3] },
  { id: 2, name: 'Inner solar system', range: [9.3, 12], home: 11.65, focus: 'sun', fade: [8.6, 9.6, 12.8, 13.8] },
  { id: 3, name: 'Outer solar system', range: [12, 13.3], home: 13.05, focus: 'sun', fade: [11.3, 12.1, 14.6, 15.6] },
  { id: 4, name: 'Heliosphere & Oort cloud', range: [13.3, 16.2], home: 14.2, focus: 'sun', fade: [12.8, 13.6, 16.6, 17.3] },
  { id: 5, name: 'Nearby stars', range: [16.2, 18.6], home: 17.4, focus: 'sun', fade: [15.4, 16.3, 19.2, 20.2] },
  { id: 6, name: 'Milky Way', range: [18.6, 21.6], home: 21.05, focus: 'milky-way', fade: [18.3, 19.3, 21.9, 22.6], viewGal: [180, 50] },
  { id: 7, name: 'Local Group', range: [21.6, 23.6], home: 22.75, focus: 'local-group', fade: [20.8, 21.8, 24.6, 25.4], viewGal: [150, 35] },
  { id: 8, name: 'Cosmic web', range: [23.6, 27], home: 25.2, focus: 'milky-way', fade: [22.8, 23.8, I, I] },
];

export const MIN_LOGD = 6.9;
export const MAX_LOGD = 27;
/** Above this zoom, time controls stop mattering (motion is imperceptible). */
export const TIME_RELEVANT_LOGD = LAYERS[3].range[1];

export const layerAt = (logD: number) => LAYERS.find((l) => logD < l.range[1]) ?? LAYERS[LAYERS.length - 1];
