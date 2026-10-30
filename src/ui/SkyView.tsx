// Sky view: the sky from the viewer's location (Greenwich until they share one), following the
// simulation clock. Real bright stars, constellation figures, the Milky Way, Sun, Moon (with phase),
// planets and satellites crossing overhead, under a sky that brightens with the Sun.
import { useEffect, useMemo, useRef, useState, type MutableRefObject, type RefObject } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { BackSide, BufferGeometry, Color, DoubleSide, LineBasicMaterial, LineSegments, Matrix4, ShaderMaterial, Vector3, type Group, type PerspectiveCamera, type Points } from 'three';
import { Body, Equator, Observer, SiderealTime } from 'astronomy-engine';
import sky from '../data/sky.json';
import { locate, nextSimTime, useStore } from '../store.ts';
import { galToEqj, gauss, rng, unit } from '../lib/coords.ts';
import { starColor, starTemp } from '../lib/stars.ts';
import { SATELLITES, type Satellite } from '../data/satellites.ts';
import { hasElements } from '../lib/satellites.ts';
import { look, sunlit } from '../lib/passes.ts';
import { PointCloud, cloud } from '../scene/PointCloud.tsx';
import { Glow } from '../scene/Glow.tsx';
import { Close } from './icons.tsx';

const GREENWICH = { lat: 51.48, lon: 0 };
const R = 100; // celestial sphere radius
const D = Math.PI / 180;
const BODIES = [
  { body: Body.Sun, name: 'Sun', color: [1, 0.95, 0.8], size: 0 }, { body: Body.Moon, name: 'Moon', color: [1, 1, 1], size: 0 },
  { body: Body.Mercury, name: 'Mercury', color: [0.9, 0.85, 0.8], size: 5 }, { body: Body.Venus, name: 'Venus', color: [1, 0.97, 0.88], size: 9 },
  { body: Body.Mars, name: 'Mars', color: [1, 0.55, 0.35], size: 6 }, { body: Body.Jupiter, name: 'Jupiter', color: [1, 0.92, 0.78], size: 8 },
  { body: Body.Saturn, name: 'Saturn', color: [0.98, 0.88, 0.62], size: 6 },
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

/** Local horizon direction from elevation/azimuth (radians, azimuth from north through east). */
const altAz = (el: number, az: number, v: Vector3) => v.set(Math.cos(el) * Math.sin(az), Math.sin(el), -Math.cos(el) * Math.cos(az));

/** The sky's own glow: deep blue by day, an orange band near the Sun at twilight, faint horizon glow at night. */
const domeMaterial = () =>
  new ShaderMaterial({
    side: BackSide,
    depthWrite: false,
    uniforms: { sun: { value: new Vector3(0, -1, 0) } },
    vertexShader: /* glsl */ `varying vec3 vDir; void main() { vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: /* glsl */ `
      uniform vec3 sun; varying vec3 vDir;
      void main() {
        vec3 d = normalize(vDir);
        float h = clamp(d.y, 0.0, 1.0), s = sun.y; // clamped: pow() of a negative is NaN on GPUs
        float day = smoothstep(-0.1, 0.25, s);
        float near = pow(max(dot(d, sun), 0.0), 6.0);
        vec3 zenith = mix(vec3(0.004, 0.008, 0.02), vec3(0.12, 0.32, 0.68), day);
        vec3 horizon = mix(vec3(0.02, 0.03, 0.06), vec3(0.55, 0.72, 0.9), day);
        vec3 col = mix(horizon, zenith, pow(h, 0.45));
        float twilight = smoothstep(-0.32, -0.02, s) * (1.0 - smoothstep(0.05, 0.3, s));
        col += vec3(1.0, 0.45, 0.15) * twilight * (0.25 + 0.75 * near) * pow(1.0 - h, 4.0) * 0.7;
        col += vec3(1.0, 0.9, 0.7) * near * day * 0.35;
        gl_FragColor = vec4(col, 1.0);
      }`,
  });

/** The Moon's disc, lit from the Sun's direction so it shows its real phase. */
const moonMaterial = () =>
  new ShaderMaterial({
    transparent: true,
    uniforms: { sun: { value: new Vector3() }, earthshine: { value: 0 } },
    vertexShader: /* glsl */ `varying vec3 vN; void main() { vN = normalize(mat3(modelMatrix) * normal); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: /* glsl */ `
      uniform vec3 sun; uniform float earthshine; varying vec3 vN;
      void main() {
        // the unlit side lets the sky show through, apart from a faint earthshine glow at night
        float l = smoothstep(-0.05, 0.12, dot(normalize(vN), sun));
        gl_FragColor = vec4(mix(vec3(0.16, 0.18, 0.24), vec3(1.25, 1.22, 1.15), l), max(l, earthshine));
      }`,
  });

interface Item { text: string; cls: string; dir: () => Vector3; local?: boolean; show?: () => boolean }

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
      const above = v.y > -0.01 || it.cls === 'cardinal';
      v.multiplyScalar(R).project(camera);
      const fades = it.cls === 'const' || it.cls === 'star';
      const on = above && v.z < 1 && Math.abs(v.x) < 1.1 && Math.abs(v.y) < 1.1 && (!fades || night.current > 0.2) && (!it.show || it.show());
      el.style.visibility = on ? 'visible' : 'hidden';
      if (fades) el.style.opacity = String(night.current);
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

interface SkyProps {
  lat: number; lon: number; lines: boolean; sats: Satellite[];
  bodyDirs: Vector3[]; satDirs: Vector3[]; satUp: boolean[];
  skyRef: RefObject<Group>; night: MutableRefObject<number>; status: MutableRefObject<string>;
}

function Sky({ lat, lon, lines, sats: satList, bodyDirs, satDirs, satUp, skyRef, night, status }: SkyProps) {
  const [stars, milky] = useMemo(() => {
    const c = cloud();
    for (const [ra, dec, mag, bv] of sky.stars) {
      const v = eq(ra, dec).multiplyScalar(R);
      const [r, g, b] = starColor(starTemp(bv));
      const k = Math.min(1.8, 0.4 + (6 - mag) * 0.25);
      c.push(v.x, v.y, v.z, r * k, g * k, b * k, Math.max(1.4, (6.4 - mag) * 1.35));
    }
    // the Milky Way: soft overlapping glows along the galactic plane, brighter and wider toward Sagittarius
    const m = cloud(), rand = rng(9);
    for (let i = 0; i < 7000; i++) {
      const l = rand() * 360, toCenter = Math.exp(-((((l + 180) % 360 - 180) / 55) ** 2));
      const bLat = gauss(rand) * (3 + 5 * toCenter);
      const v = new Vector3(...galToEqj(...unit(l, bLat))).multiplyScalar(R * 1.01);
      const k = (0.03 + 0.07 * toCenter) * (0.6 + rand() * 0.8);
      m.push(v.x, v.y, v.z, 0.78 * k, 0.82 * k, k, 16 + rand() * 18);
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
    BODIES.forEach(({ color: [r, g, b], size }) => c.push(0, 0, 0, r, g, b, size));
    return c.build();
  }, []);
  const sats = useMemo(() => {
    const c = cloud();
    satList.forEach(() => c.push(0, 0, 0, 0.9, 0.97, 1, 6));
    return c.build();
  }, [satList]);
  const [dome, moonMat] = useMemo(() => [domeMaterial(), moonMaterial()], []);
  const sun = useRef<Group>(null!);
  const moon = useRef<Group>(null!);
  const tmp = useMemo(() => new Vector3(), []);
  const lastCalc = useRef(-1e9);
  const black = useMemo(() => new Color('#000'), []);

  useFrame(({ scene }, dt) => {
    scene.background = black;
    const simTime = nextSimTime(Math.min(dt, 0.1)); // the main scene is paused, so the clock runs here
    useStore.getState().set({ simTime });
    const date = new Date(simTime);
    const m = skyRef.current!.matrix;
    skyRef.current!.matrixAutoUpdate = false;
    horizonMatrix(date, lat, lon, m);
    skyRef.current!.matrixWorldNeedsUpdate = true;

    // positions change slowly on screen: recompute ~15×/s rather than every frame
    const due = performance.now() - lastCalc.current > 66;
    if (due) {
      lastCalc.current = performance.now();
      const obs = new Observer(lat, lon, 0);
      const pos = planets.getAttribute('position');
      BODIES.forEach(({ body }, i) => {
        const e = Equator(body, date, obs, false, true);
        bodyDirs[i].copy(eq(e.ra * 15, e.dec));
        pos.setXYZ(i, bodyDirs[i].x * R * 0.98, bodyDirs[i].y * R * 0.98, bodyDirs[i].z * R * 0.98);
      });
      pos.needsUpdate = true;
      sun.current.position.copy(bodyDirs[0]).multiplyScalar(R * 0.97);
      moon.current.position.copy(bodyDirs[1]).multiplyScalar(R * 0.96);
    }

    // sun direction in the local frame drives the sky color and the Moon's phase
    const sunLocal = tmp.copy(bodyDirs[0]).applyMatrix4(m);
    dome.uniforms.sun.value.copy(sunLocal);
    moonMat.uniforms.sun.value.copy(sunLocal);
    const alt = Math.asin(Math.max(-1, Math.min(1, sunLocal.y))) / D;
    night.current = Math.min(1, Math.max(0, -alt / 12));
    moonMat.uniforms.earthshine.value = 0.35 * night.current;
    status.current = alt > 0 ? 'Daytime' : alt > -6 ? 'Civil twilight' : alt > -12 ? 'Nautical twilight' : alt > -18 ? 'Astronomical twilight' : 'Night';
    (figures.material as LineBasicMaterial).opacity = 0.32 * night.current;
    if (!due) return;
    skyRef.current!.traverse((o) => {
      const mat = (o as Points).material as ShaderMaterial | undefined;
      if (mat?.uniforms?.uOpacity && o.parent?.userData.fadesByDay) mat.uniforms.uOpacity.value = night.current;
    });

    // satellites: live look angles from the observer; dim when in Earth's shadow
    const sp = sats.getAttribute('position'), sc = sats.getAttribute('color');
    satList.forEach((s, i) => {
      const l = look(s.norad, date, lat, lon);
      satUp[i] = !!l && l.el > 0;
      if (!l) return;
      altAz(l.el, l.az, satDirs[i]);
      sp.setXYZ(i, satDirs[i].x * R * 0.95, satDirs[i].y * R * 0.95, satDirs[i].z * R * 0.95);
      const k = sunlit(date, l.p) ? 1 : 0.25;
      sc.setXYZ(i, 0.9 * k, 0.97 * k, k);
    });
    sp.needsUpdate = true;
    sc.needsUpdate = true;
  });

  return (
    <>
      <mesh material={dome} renderOrder={-1}><sphereGeometry args={[R * 1.05, 48, 24]} /></mesh>
      <group ref={skyRef}>
        <group userData={{ fadesByDay: true }}><PointCloud geometry={milky} /></group>
        <group userData={{ fadesByDay: true }}><PointCloud geometry={stars} /></group>
        {lines && <primitive object={figures} />}
        <PointCloud geometry={planets} />
        <group ref={sun}>
          <mesh><sphereGeometry args={[0.9, 24, 12]} /><meshBasicMaterial color={[3, 2.8, 2.4]} toneMapped={false} /></mesh>
          <Glow size={26} color="#ffe2a0" />
        </group>
        {/* drawn ~3× its true size so the phase is readable */}
        <group ref={moon}><mesh material={moonMat}><sphereGeometry args={[1.4, 32, 16]} /></mesh></group>
      </group>
      <PointCloud geometry={sats} />
      {/* ground hides everything below the horizon */}
      <mesh>
        <sphereGeometry args={[R * 0.9, 48, 12, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2]} />
        <meshBasicMaterial color="#05070a" side={DoubleSide} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[R * 0.895, R * 0.9, 128]} />
        <meshBasicMaterial color="#4a5a78" transparent opacity={0.5} side={DoubleSide} />
      </mesh>
      <Look />
    </>
  );
}

/** Re-renders a text node 2×/s from a ref the scene writes to. */
function Live({ value }: { value: MutableRefObject<string> }) {
  const [text, setText] = useState(value.current);
  useEffect(() => {
    const i = setInterval(() => setText(value.current), 500);
    return () => clearInterval(i);
  }, [value]);
  return <>{text}</>;
}

export default function SkyView() {
  const home = useStore((s) => s.home);
  const loc = home ?? GREENWICH;
  const [lines, setLines] = useState(true);
  const [names, setNames] = useState(true);
  const [error, setError] = useState('');
  const skyRef = useRef<Group>(null!);
  const night = useRef(1); // 0 in daylight, 1 once the Sun is 12° below the horizon
  const status = useRef('');
  const els = useRef<(HTMLDivElement | null)[]>([]);
  const bodyDirs = useMemo(() => BODIES.map(() => new Vector3()), []);
  // satellites whose orbits have loaded by the time the view opens
  const sats = useMemo(() => SATELLITES.filter((s) => hasElements(s.norad)), []);
  const satDirs = useMemo(() => sats.map(() => new Vector3()), [sats]);
  const satUp = useMemo(() => sats.map(() => false), [sats]);
  const close = () => useStore.getState().set({ panel: null });
  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && close();
    addEventListener('keydown', esc);
    return () => removeEventListener('keydown', esc);
  }, []);

  const items = useMemo<Item[]>(() => [
    ...CARDINALS.map(([text, v]) => ({ text, cls: 'cardinal', dir: () => v.clone().multiplyScalar(0.92), local: true })),
    ...BODIES.map(({ name }, i) => ({ text: name, cls: 'body', dir: () => bodyDirs[i] })),
    ...sats.map((s, i) => ({ text: s.label, cls: 'sat', dir: () => satDirs[i], local: true, show: () => satUp[i] })),
    ...(names ? sky.bright.map(([text, ra, dec]) => ({ text: text as string, cls: 'star', dir: ((v) => () => v)(eq(ra as number, dec as number)) })) : []),
    ...(names ? sky.names.map(([text, ra, dec]) => ({ text: text as string, cls: 'const', dir: ((v) => () => v)(eq(ra as number, dec as number)) })) : []),
  ], [names, bodyDirs, sats, satDirs, satUp]);

  return (
    <div className="panel sky" role="dialog" aria-label="Sky view">
      <Canvas camera={{ fov: 70, near: 0.1, far: 1000, position: [0, 0, 0] }} dpr={[1, 1.5]}>
        <Sky lat={loc.lat} lon={loc.lon} lines={lines} sats={sats} bodyDirs={bodyDirs} satDirs={satDirs} satUp={satUp} skyRef={skyRef} night={night} status={status} />
        <Labels items={items} els={els} sky={skyRef} night={night} />
      </Canvas>
      <div className="sky-labels" aria-hidden>
        {items.map((it, i) => <div key={`${it.cls}-${it.text}`} ref={(el) => { els.current[i] = el; }} className={`sky-label ${it.cls}`}>{it.text}</div>)}
      </div>
      <header className="sky-head glass">
        <h2>The sky from {home ? 'your location' : 'Greenwich'}</h2>
        <p><Live value={status} /> · {loc.lat.toFixed(1)}°, {loc.lon.toFixed(1)}° · drag to look around, scroll or pinch to zoom</p>
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
