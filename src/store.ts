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

  /** Guided tour step, or null when not touring. */
  tour: number | null;
  /** Full-screen panel over the 3D scene (the scene pauses while one is open). */
  panel: 'sky' | 'sizes' | null;
  /** Short message shown above the time bar (tour stops, historic moments). */
  caption: { title: string; text: string } | null;
  /** The viewer's location, if they shared it. */
  home: { lat: number; lon: number } | null;

  flyTo: (id: string, logD?: number, viewDir?: Vector3) => void;
  jumpToLayer: (i: number) => void;
  select: (id: string | null) => void;
  set: (p: Partial<State>) => void;
}

// The viewer's shared location is remembered in this browser only, as a convenience.
function savedHome() {
  try {
    return JSON.parse(localStorage.getItem('zoomverse-home') ?? 'null');
  } catch {
    return null;
  }
}

/** Ask for the viewer's location (rounded to ~1 km), remember it, and resolve with it. */
export function locate() {
  return new Promise<{ lat: number; lon: number }>((resolve, reject) =>
    navigator.geolocation.getCurrentPosition(({ coords }) => {
      const home = { lat: Math.round(coords.latitude * 100) / 100, lon: Math.round(coords.longitude * 100) / 100 };
      useStore.getState().set({ home });
      try { localStorage.setItem('zoomverse-home', JSON.stringify(home)); } catch { /* private mode */ }
      resolve(home);
    }, reject, { timeout: 15000, maximumAge: 3.6e6 }));
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

  tour: null,
  panel: null,
  caption: null,
  home: savedHome(),

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

// astronomy-engine is accurate far beyond this; the limit keeps dates readable.
const TIME_MIN = Date.UTC(1700, 0, 1), TIME_MAX = Date.UTC(2300, 0, 1);

/** Simulation time after `dt` real seconds at the current speed (pauses at the date limits). */
export function nextSimTime(dt: number) {
  const s = useStore.getState();
  const t = s.playing ? s.simTime + dt * 1000 * SPEEDS[s.speed].rate * (s.reverse ? -1 : 1) : s.simTime;
  if (t >= TIME_MIN && t <= TIME_MAX) return t;
  s.set({ playing: false });
  return Math.min(TIME_MAX, Math.max(TIME_MIN, t));
}

/** onClick handler that selects `id`, ignoring clicks that were really camera drags. */
export const selectOnClick = (id: string) => (e: { delta: number; stopPropagation: () => void }) => {
  if (e.delta > 6) return;
  e.stopPropagation();
  useStore.getState().select(id);
};
