// Camera rig: log-scale zoom (wheel, trackpad, pinch, keys), fly-to animation,
// simulation clock and the floating origin. Runs before everything else each frame.
import { useEffect } from 'react';
import { Quaternion, Vector3, type PerspectiveCamera } from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { useStore, nextSimTime } from '../store.ts';
import { get } from '../catalog.ts';
import { MAX_LOGD, MIN_LOGD } from '../data/layers.ts';
import { K } from './Space.tsx';

const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const ease = (x: number) => (x < 0.5 ? 4 * x ** 3 : 1 - (-2 * x + 2) ** 3 / 2);
const clamp = (x: number, a: number, b: number) => Math.min(b, Math.max(a, x));

// Outward direction of the Earth-orbiting focus last frame, so the camera can co-rotate with it.
const radial = new Vector3(), prevRadial = new Vector3(), turn = new Quaternion();
let viewShift = 0; // px the view is shifted up by (intro framing)

function zoom(dLog: number) {
  const s = useStore.getState();
  if (s.flight) s.set({ flight: null, targetLogD: s.logD });
  s.set({ targetLogD: s.targetLogD + dLog });
}

export function Rig() {
  const gl = useThree((s) => s.gl);
  const camera = useThree((s) => s.camera);

  useEffect(() => {
    // The canvas container, not the canvas: 3D labels sit on top of the canvas, and a wheel or pinch
    // over a label (they slide under the cursor while zooming) must still zoom.
    const el = gl.domElement.closest<HTMLElement>('.scene') ?? gl.domElement;
    const pts = new Map<number, { x: number; y: number }>();
    let last = 0;
    const wheel = (e: WheelEvent) => {
      e.preventDefault();
      const px = e.deltaMode === 1 ? e.deltaY * 33 : e.deltaY;
      zoom(px * (e.ctrlKey ? 0.01 : 0.0012)); // ctrlKey = trackpad pinch
    };
    const down = (e: PointerEvent) => pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const move = (e: PointerEvent) => {
      if (!pts.has(e.pointerId)) return;
      pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pts.size !== 2) return;
      const [a, b] = [...pts.values()];
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      if (last) zoom(-2 * Math.log10(d / last));
      last = d;
    };
    const up = (e: PointerEvent) => { pts.delete(e.pointerId); last = 0; };
    const key = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).closest('input, select, textarea')) return;
      if (e.key === '+' || e.key === '=') zoom(-0.25);
      if (e.key === '-' || e.key === '_') zoom(0.25);
    };
    el.addEventListener('wheel', wheel, { passive: false });
    el.addEventListener('pointerdown', down);
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
    window.addEventListener('keydown', key);
    return () => {
      el.removeEventListener('wheel', wheel);
      el.removeEventListener('pointerdown', down);
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
      window.removeEventListener('keydown', key);
    };
  }, [gl]);

  useFrame(({ size }, rawDt) => {
    const dt = Math.min(rawDt, 0.1);
    const s = useStore.getState();
    // During the intro the scene is framed higher (Earth above the title); ease back afterward.
    const cam = camera as PerspectiveCamera;
    viewShift += ((s.intro ? size.height * 0.2 : 0) - viewShift) * (1 - Math.exp(-dt * 2.5));
    if (viewShift > 0.5) cam.setViewOffset(size.width, size.height, 0, viewShift, size.width, size.height);
    else if (cam.view) cam.clearViewOffset();
    const simTime = nextSimTime(dt);
    const date = new Date(simTime);
    let { logD, targetLogD, focusId, flight } = s;

    if (flight) {
      const target = get(flight.to);
      const dest = target.pos(date);
      if (!flight.duration) {
        flight.camFrom = camera.position.clone().normalize();
        // look down on a satellite from outside, never from inside the planet
        if (target.earthOrbit && !flight.viewDir) flight.viewDir = dest.clone().sub(get('earth').pos(date)).normalize();
        if (Number.isNaN(flight.toLogD)) flight.toLogD = target.viewLogD;
        flight.toLogD = Math.max(flight.toLogD, target.minLogD);
        flight.peak = Math.max(flight.fromLogD, flight.toLogD, Math.log10(flight.from.distanceTo(dest) + 1) + 0.45);
        const travel = 2 * flight.peak - flight.fromLogD - flight.toLogD;
        flight.duration = reducedMotion ? 1e-3 : Math.min(5, 1 + travel * 0.2);
      }
      const t = (flight.t = Math.min(1, flight.t + dt / flight.duration));
      logD = t < 0.5 ? lerp(flight.fromLogD, flight.peak, ease(t * 2)) : lerp(flight.peak, flight.toLogD, ease(t * 2 - 1));
      s.focus.lerpVectors(flight.from, dest, ease(clamp((t - 0.15) / 0.7, 0, 1)));
      if (flight.viewDir) camera.position.lerpVectors(flight.camFrom!, flight.viewDir, ease(t)).setLength(K);
      targetLogD = logD;
      focusId = null;
      if (t >= 1) {
        focusId = flight.to;
        flight = null;
        prevRadial.set(0, 0, 0);
      }
    } else {
      if (focusId) s.focus.copy(get(focusId).pos(date));
      if (focusId && get(focusId).earthOrbit) {
        radial.copy(s.focus).sub(get('earth').pos(date)).normalize();
        if (prevRadial.lengthSq()) camera.position.applyQuaternion(turn.setFromUnitVectors(prevRadial, radial));
        prevRadial.copy(radial);
      }
      // each object knows how close the camera may get (satellites allow a close chase view)
      targetLogD = clamp(targetLogD, focusId ? get(focusId).minLogD : MIN_LOGD, MAX_LOGD);
      logD = lerp(logD, targetLogD, 1 - Math.exp(-dt * 8));
    }
    s.set({ simTime, logD, targetLogD, focusId, flight });
  }, -1);

  return <OrbitControls makeDefault enableZoom={false} enablePan={false} enableDamping rotateSpeed={0.6} />;
}
