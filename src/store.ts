import { create } from 'zustand';
import { Vector3 } from 'three';
import { LAYERS } from './data/layers.ts';
import { galDir } from './lib/coords.ts';

export const SPEEDS = [
  { label: '1×', rate: 1 },
  { label: '1 hr/s', rate: 3600 },
  { label: '1 day/s', rate: 86400 },
  { label: '1 mo/s', rate: 2.6298e6 },
  { label: '1 yr/s', rate: 3.15576e7 },
] as const;

export interface Flight {
  to: string;
  from: Vector3;
  fromLogD: number;
  toLogD: number;
  peak: number;
  t: number;
  duration: number;
  /** Optional camera direction to swing to (unit vector, scene frame). */
  viewDir?: Vector3;
  camFrom?: Vector3;
}

interface State {
  /** log10 of camera distance from the focus, in meters (eased), and where it's heading. */
  logD: number;
  targetLogD: number;
  /** Object the camera orbits; its position becomes the floating origin. Null = free point in `focus`. */
  focusId: string | null;
  /** Current floating-origin position in world meters (mutated in place every frame; not reactive). */
  focus: Vector3;
  flight: Flight | null;

  simTime: number;
  playing: boolean;
  speed: number;
  reverse: boolean;

  selected: string | null;
  readable: boolean;

  flyTo: (id: string, logD?: number, viewDir?: Vector3) => void;
  jumpToLayer: (i: number) => void;
  select: (id: string | null) => void;
  set: (p: Partial<State>) => void;
}

export const useStore = create<State>()((set, get) => ({
  logD: 7.55,
  targetLogD: 7.55,
  focusId: 'earth',
  focus: new Vector3(),
  flight: null,

  simTime: Date.now(),
  playing: true,
  speed: 0,
  reverse: false,

  selected: null,
  readable: true,

  flyTo: (to, toLogD, viewDir) => {
    const s = get();
    set({ flight: { to, from: s.focus.clone(), fromLogD: s.logD, toLogD: toLogD ?? NaN, peak: NaN, t: 0, duration: 0, viewDir } });
  },
  jumpToLayer: (i) => {
    const l = LAYERS[i];
    get().flyTo(l.focus, l.home, l.viewGal && galDir(...l.viewGal));
  },
  select: (selected) => set({ selected }),
  set: (p) => set(p),
}));

export const simDate = () => new Date(useStore.getState().simTime);
