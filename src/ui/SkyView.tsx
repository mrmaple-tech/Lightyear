// Sky view: the sky from the viewer's location (Greenwich until they share one), following the
// simulation clock. Real bright stars, constellation figures, the Milky Way, Sun, Moon and planets.
import { useEffect, useMemo, useRef, useState, type MutableRefObject, type RefObject } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { BufferGeometry, Color, DoubleSide, LineBasicMaterial, LineSegments, Matrix4, Vector3, type Group, type PerspectiveCamera, type Points, type ShaderMaterial } from 'three';
import { Body, Equator, Horizon, Observer, SiderealTime } from 'astronomy-engine';
import sky from '../data/sky.json';
import { locate, nextSimTime, useStore } from '../store.ts';
import { galToEqj, gauss, rng, unit } from '../lib/coords.ts';
import { starColor, starTemp } from '../lib/stars.ts';
import { PointCloud, cloud } from '../scene/PointCloud.tsx';
import { Glow } from '../scene/Glow.tsx';
import { Close } from './icons.tsx';

const GREENWICH = { lat: 51.48, lon: 0 };
const R = 100; // celestial sphere radius
const D = Math.PI / 180;
const BODIES = [
  { body: Body.Sun, name: 'Sun' }, { body: Body.Moon, name: 'Moon' }, { body: Body.Mercury, name: 'Mercury' },
  { body: Body.Venus, name: 'Venus' }, { body: Body.Mars, name: 'Mars' }, { body: Body.Jupiter, name: 'Jupiter' },
  { body: Body.Saturn, name: 'Saturn' },
];
const CARDINALS: [string, Vector3][] = [['N', new Vector3(0, 0, -1)], ['E', new Vector3(1, 0, 0)], ['S', new Vector3(0, 0, 1)], ['W', new Vector3(-1, 0, 0)]];

/** Equatorial (J2000) unit vector from RA/Dec in degrees. */
const eq = (raDeg: number, dec: number) => new Vector3(...unit(raDeg, dec));

/**
 * Equatorial → local horizon frame (x = east, y = zenith, -z = north) for latitude/longitude at a date.
 * Precession since J2000 (~0.4°) is ignored, matching the rest of the app.
 */
function horizonMatrix(date: Date, lat: number, lon: number, m: Matrix4) {
  const th = (SiderealTime(date) * 15 + lon) * D, ph = lat * D;
  const [st, ct, sp, cp] = [Math.sin(th), Math.cos(th), Math.sin(ph), Math.cos(ph)];
  return m.set(-st, ct, 0, 0, cp * ct, cp * st, sp, 0, sp * ct, sp * st, -cp, 0, 0, 0, 0, 1);
}

interface Item { text: string; cls: string; dir: () => Vector3; local?: boolean }

/** Projects label directions to the screen each frame, hiding those below the horizon or behind the camera. */
function Labels({ items, els, sky: skyRef, night }: { items: Item[]; els: MutableRefObject<(HTMLDivElement | null)[]>; sky: RefObject<Group>; night: MutableRefObject<number> }) {
  const { camera, size } = useThree();
  const v = useMemo(() => new Vector3(), []);
  useFrame(() => {
    items.forEach((it, i) => {
      const el = els.current[i];
      if (!el || !skyRef.current) return;
      v.copy(it.dir());
      if (!it.local) v.applyMatrix4(skyRef.current.matrix);
      const above = v.y > -0.01 || it.local;
      v.multiplyScalar(R).project(camera);
      const on = above && v.z < 1 && Math.abs(v.x) < 1.1 && Math.abs(v.y) < 1.1;
      el.style.visibility = on && (it.cls !== 'const' || night.current > 0.2) ? 'visible' : 'hidden';
      if (it.cls === 'const') el.style.opacity = String(night.current);
      if (on) el.style.transform = `translate(${((v.x + 1) / 2) * size.width}px, ${((1 - v.y) / 2) * size.height}px)`;
    });
  });
  return null;
}

/** Drag to look around, wheel or pinch to zoom (field of view). */
function Look() {
  const { camera, gl } = useThree();
  useEffect(() => {
    const cam = camera as PerspectiveCamera;
    let yaw = Math.PI, pitch = 0.35; // facing south, a little above the horizon
    const apply = () => { cam.rotation.set(pitch, yaw, 0, 'YXZ'); cam.updateProjectionMatrix(); };
    apply();
    const pts = new Map<number, { x: number; y: number }>();
    let pinch = 0;
    const el = gl.domElement;
    const down = (e: PointerEvent) => { pts.set(e.pointerId, { x: e.clientX, y: e.clientY }); el.setPointerCapture(e.pointerId); };
    const move = (e: PointerEvent) => {
      const p = pts.get(e.pointerId);
      if (!p) return;
      if (pts.size === 1) {
        const k = (cam.fov * D) / el.clientHeight;
        yaw += (e.clientX - p.x) * k;
        pitch = Math.max(-0.2, Math.min(Math.PI / 2, pitch + (e.clientY - p.y) * k));
      }
      pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pts.size === 2) {
        const [a, b] = [...pts.values()];
        const d = Math.hypot(a.x - b.x, a.y - b.y);
        if (pinch) cam.fov = Math.max(15, Math.min(100, cam.fov * (pinch / d)));
        pinch = d;
      }
      apply();
    };
    const up = (e: PointerEvent) => { pts.delete(e.pointerId); pinch = 0; };
    const wheel = (e: WheelEvent) => { e.preventDefault(); cam.fov = Math.max(15, Math.min(100, cam.fov * Math.exp(e.deltaY * 0.001))); apply(); };
    el.addEventListener('pointerdown', down);
    el.addEventListener('pointermove', move);
    el.addEventListener('pointerup', up);
    el.addEventListener('pointercancel', up);
    el.addEventListener('wheel', wheel, { passive: false });
    return () => {
      el.removeEventListener('pointerdown', down);
      el.removeEventListener('pointermove', move);
      el.removeEventListener('pointerup', up);
      el.removeEventListener('pointercancel', up);
      el.removeEventListener('wheel', wheel);
    };
  }, [camera, gl]);
  return null;
}

function Sky({ lat, lon, lines, bodyDirs, skyRef, night }: { lat: number; lon: number; lines: boolean; bodyDirs: Vector3[]; skyRef: RefObject<Group>; night: MutableRefObject<number> }) {
  const scene = useThree((s) => s.scene);
  const [stars, milky] = useMemo(() => {
    const c = cloud();
    for (const [ra, dec, mag, bv] of sky.stars) {
      const v = eq(ra, dec).multiplyScalar(R);
      const [r, g, b] = starColor(starTemp(bv));
      const k = Math.min(1.6, 0.35 + (6 - mag) * 0.22);
      c.push(v.x, v.y, v.z, r * k, g * k, b * k, Math.max(1.3, (6.3 - mag) * 1.25));
    }
    // the Milky Way: a soft band along the galactic plane, thicker and brighter toward Sagittarius
    const m = cloud(), rand = rng(9);
    for (let i = 0; i < 9000; i++) {
      const l = rand() * 360, toCenter = Math.exp(-((((l + 180) % 360 - 180) / 55) ** 2));
      const bLat = gauss(rand) * (3.5 + 5 * toCenter);
      const v = new Vector3(...galToEqj(...unit(l, bLat))).multiplyScalar(R * 1.01);
      const k = (0.05 + 0.1 * toCenter) * (0.6 + rand() * 0.8);
      m.push(v.x, v.y, v.z, 0.75 * k, 0.8 * k, k, 9 + rand() * 9);
    }
    return [c.build(), m.build()];
  }, []);
  const figures = useMemo(() => {
    const pts: Vector3[] = [];
    for (const fig of sky.lines) for (const line of fig) for (let i = 1; i < line.length; i++) pts.push(eq(...(line[i - 1] as [number, number])).multiplyScalar(R * 0.99), eq(...(line[i] as [number, number])).multiplyScalar(R * 0.99));
    return new LineSegments(new BufferGeometry().setFromPoints(pts), new LineBasicMaterial({ color: '#7f9ee8', transparent: true, opacity: 0.32, depthWrite: false }));
  }, []);
  const planets = useMemo(() => {
    const c = cloud();
    BODIES.forEach(() => c.push(0, 0, 0, 1, 0.95, 0.85, 7));
    return c.build();
  }, []);
  const sun = useRef<Group>(null!);
  const [day, dusk, dark] = useMemo(() => [new Color('#4f86c6'), new Color('#1c2a4a'), new Color('#020308')], []);

  useFrame((_, dt) => {
    const simTime = nextSimTime(Math.min(dt, 0.1)); // the main scene is paused, so the clock runs here
    useStore.getState().set({ simTime });
    const date = new Date(simTime);
    skyRef.current!.matrixAutoUpdate = false;
    horizonMatrix(date, lat, lon, skyRef.current!.matrix);
    skyRef.current!.matrixWorldNeedsUpdate = true;
    const obs = new Observer(lat, lon, 0);
    const pos = planets.getAttribute('position');
    BODIES.forEach(({ body }, i) => {
      const e = Equator(body, date, obs, false, true);
      bodyDirs[i].copy(eq(e.ra * 15, e.dec));
      pos.setXYZ(i, bodyDirs[i].x * R * 0.98, bodyDirs[i].y * R * 0.98, bodyDirs[i].z * R * 0.98);
    });
    pos.needsUpdate = true;
    sun.current.position.copy(bodyDirs[0]).multiplyScalar(R * 0.97);
    // daylight washes out the stars; twilight runs from 0° to -12° solar altitude
    const sunEq = Equator(Body.Sun, date, obs, true, true);
    const alt = Horizon(date, obs, sunEq.ra, sunEq.dec).altitude;
    night.current = Math.min(1, Math.max(0, -alt / 12));
    (figures.material as LineBasicMaterial).opacity = 0.32 * night.current;
    const bg = (scene.background as Color) ?? (scene.background = new Color());
    if (alt > 0) bg.copy(dusk).lerp(day, Math.min(1, alt / 15));
    else bg.copy(dusk).lerp(dark, night.current);
    skyRef.current!.traverse((o) => {
      const m = (o as Points).material as ShaderMaterial | undefined;
      if (m?.uniforms?.uOpacity && o.parent?.userData.fadesByDay) m.uniforms.uOpacity.value = night.current;
    });
  });

  return (
    <>
      <group ref={skyRef}>
        <group userData={{ fadesByDay: true }}><PointCloud geometry={milky} /></group>
        <group userData={{ fadesByDay: true }}><PointCloud geometry={stars} /></group>
        {lines && <primitive object={figures} />}
        <PointCloud geometry={planets} />
        <group ref={sun}><Glow size={30} color="#ffe2a0" /></group>
      </group>
      {/* ground hides everything below the horizon */}
      <mesh>
        <sphereGeometry args={[R * 0.9, 48, 12, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2]} />
        <meshBasicMaterial color="#06080b" side={DoubleSide} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[R * 0.895, R * 0.9, 128]} />
        <meshBasicMaterial color="#3a4a66" transparent opacity={0.6} side={DoubleSide} />
      </mesh>
      <Look />
    </>
  );
}

export default function SkyView() {
  const home = useStore((s) => s.home);
  const loc = home ?? GREENWICH;
  const [lines, setLines] = useState(true);
  const [names, setNames] = useState(true);
  const [error, setError] = useState('');
  const skyRef = useRef<Group>(null!);
  const night = useRef(1); // 0 in daylight, 1 once the Sun is 12° below the horizon
  const els = useRef<(HTMLDivElement | null)[]>([]);
  const bodyDirs = useMemo(() => BODIES.map(() => new Vector3()), []);
  const close = () => useStore.getState().set({ panel: null });
  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && close();
    addEventListener('keydown', esc);
    return () => removeEventListener('keydown', esc);
  }, []);

  const items = useMemo<Item[]>(() => [
    ...CARDINALS.map(([text, v]) => ({ text, cls: 'cardinal', dir: () => v.clone().multiplyScalar(0.92), local: true })),
    ...BODIES.map(({ name }, i) => ({ text: name, cls: 'body', dir: () => bodyDirs[i] })),
    ...(names ? sky.names.map(([text, ra, dec]) => ({ text: text as string, cls: 'const', dir: ((v) => () => v)(eq(ra as number, dec as number)) })) : []),
  ], [names, bodyDirs]);

  return (
    <div className="panel sky" role="dialog" aria-label="Sky view">
      <Canvas camera={{ fov: 70, near: 0.1, far: 1000, position: [0, 0, 0] }} dpr={[1, 1.5]}>
        <Sky lat={loc.lat} lon={loc.lon} lines={lines} bodyDirs={bodyDirs} skyRef={skyRef} night={night} />
        <Labels items={items} els={els} sky={skyRef} night={night} />
      </Canvas>
      <div className="sky-labels" aria-hidden>
        {items.map((it, i) => <div key={`${it.cls}-${it.text}`} ref={(el) => { els.current[i] = el; }} className={`sky-label ${it.cls}`}>{it.text}</div>)}
      </div>
      <header className="sky-head glass">
        <h2>The sky from {home ? 'your location' : 'Greenwich'}</h2>
        <p>{loc.lat.toFixed(1)}°, {loc.lon.toFixed(1)}° · drag to look around, scroll or pinch to zoom</p>
        <div className="row">
          {!home && <button onClick={() => locate().catch(() => setError('Location unavailable'))}>Use my location</button>}
          <button aria-pressed={lines} onClick={() => setLines(!lines)}>Figures</button>
          <button aria-pressed={names} onClick={() => setNames(!names)}>Names</button>
        </div>
        {error && <p className="hint" role="alert">{error}</p>}
      </header>
      <button className="icon close" aria-label="Close sky view" onClick={close}><Close /></button>
    </div>
  );
}
