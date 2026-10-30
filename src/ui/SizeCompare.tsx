// Size comparison: everything from the Moon to the observable universe lined up on a baseline at true
// relative size, rendered in 3D with the same shaders as the main scene. The slider glides a log-scale
// "camera" along the lineup (a range of about 10^20).
import { Suspense, useEffect, useMemo, useRef, useState, type MutableRefObject, type ReactNode } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { useTexture } from '@react-three/drei';
import { BufferGeometry, LineBasicMaterial, LineLoop, SRGBColorSpace, Vector3, type Group } from 'three';
import { useStore } from '../store.ts';
import { SIZES, SUN_RADIUS_KM, LY_IN_KM, type Sized } from '../data/sizes.ts';
import { BODIES } from '../data/solarSystem.ts';
import { clock, earthMaterial, planetMaterial, ringMaterial, shellMaterial, sunMaterial } from '../scene/materials.ts';
import { PointCloud, cloud } from '../scene/PointCloud.tsx';
import { Glow } from '../scene/Glow.tsx';
import { addIrregular, addSpiral, web } from '../scene/galaxy.ts';
import { gauss, rng } from '../lib/coords.ts';
import { Close } from './icons.tsx';

const START = SIZES.findIndex((s) => s.name === 'Earth');
// center of each body along the lineup (km), with a gap proportional to each body
const CENTERS = SIZES.reduce<number[]>((xs, s, i) => [...xs, i ? xs[i - 1] + SIZES[i - 1].radiusKm + s.radiusKm * 1.3 : 0], []);
// a distant, narrow-angle camera: nearly orthographic, but perspective so world-sized points work
const CAM_Z = 1000, FOV = 3;
const VIEW_H = 2 * CAM_Z * Math.tan((FOV * Math.PI) / 360);
const LIGHT = new Vector3(-1, 0.55, 0.75).normalize(); // studio light from the upper left
const BASE = 0.7; // baseline, as a fraction of screen height

function describe(b: Sized) {
  const km = 2 * b.radiusKm;
  if (b.kind === 'star') return b.name === 'Sun' ? '1,392,000 km across' : `${Math.round(b.radiusKm / SUN_RADIUS_KM).toLocaleString()} × the Sun's width`;
  if (km < 1e8) return `${Math.round(km).toLocaleString()} km across`;
  if (km < 1e12) return `${Math.round(km / 1.496e8).toLocaleString()} AU across`;
  const ly = km / LY_IN_KM;
  return ly < 1e9 ? `${(ly >= 1e6 ? `${Math.round(ly / 1e6).toLocaleString()} million` : Math.round(ly).toLocaleString())} light-years across` : `${Math.round(ly / 1e9)} billion light-years across`;
}

interface Layout { x: number; s: number; w: number; h: number }

/** Places one body each frame from the shared layout (floating origin: only on-screen bodies render). */
function Slot({ k, layout, children }: { k: number; layout: MutableRefObject<Layout>; children: ReactNode }) {
  const g = useRef<Group>(null!);
  useFrame((_, dt) => {
    const { x, s, w, h } = layout.current;
    const u = VIEW_H / h; // world units per pixel
    const r = SIZES[k].radiusKm * s, cx = w / 2 + (CENTERS[k] - x) * s;
    g.current.visible = r > 0.3 && r < 15 * h && cx + r > -w && cx - r < 2 * w;
    if (!g.current.visible) return;
    g.current.position.set((cx - w / 2) * u, (h / 2 - (h * BASE - r)) * u, 0);
    g.current.scale.setScalar(r * u);
    g.current.rotation.y += dt * 0.05; // slow spin
  });
  return <group ref={g}>{children}</group>;
}

function Planet({ name }: { name: string }) {
  const b = BODIES.find((x) => x.name === name)!;
  const [mat, rings] = useMemo(() => {
    const m = planetMaterial(b.look!, b.radiusKm % 17);
    m.uniforms.sunPos = { value: LIGHT.clone().multiplyScalar(1e6) };
    return [m, name === 'Saturn' ? ringMaterial() : null];
  }, [b, name]);
  return (
    <>
      <mesh material={mat}><sphereGeometry args={[1, 64, 32]} /></mesh>
      {rings && <mesh material={rings} rotation={[1.2, 0, 0.3]}><ringGeometry args={[1.24, 2.27, 128, 1]} /></mesh>}
    </>
  );
}

function Earth() {
  const [day, night, clouds, spec, normal] = useTexture(['earth_day', 'earth_night', 'earth_clouds', 'earth_spec', 'earth_normal'].map((f) => `${import.meta.env.BASE_URL}textures/${f}.webp`));
  day.colorSpace = night.colorSpace = SRGBColorSpace;
  const mat = useMemo(() => {
    const m = earthMaterial({ day, night, clouds, spec, normal });
    m.uniforms.sunDir.value.copy(LIGHT);
    return m;
  }, [day, night, clouds, spec, normal]);
  return <mesh material={mat}><sphereGeometry args={[1, 96, 48]} /></mesh>;
}

function Moon() {
  const map = useTexture(`${import.meta.env.BASE_URL}textures/moon.webp`);
  map.colorSpace = SRGBColorSpace;
  return <mesh><sphereGeometry args={[1, 64, 32]} /><meshStandardMaterial map={map} roughness={1} /></mesh>;
}

function Star({ b }: { b: Sized }) {
  const mat = useMemo(() => sunMaterial(...b.colors!), [b]);
  const glow = `rgb(${b.colors![1].map((c) => Math.round(c * 255)).join(',')})`;
  return (
    <>
      <mesh material={mat}><sphereGeometry args={[1, 64, 32]} /></mesh>
      <Glow size={3.2} color={glow} opacity={0.55} />
    </>
  );
}

/** The planets' orbits out to Neptune, seen at an angle, with the Sun at the center. */
function SolarSystem() {
  const orbits = useMemo(() => [0.39, 0.72, 1, 1.52, 5.2, 9.54, 19.2, 30.07].map((a) => {
    const pts = Array.from({ length: 129 }, (_, i) => new Vector3(Math.cos((i / 128) * 2 * Math.PI), Math.sin((i / 128) * 2 * Math.PI), 0).multiplyScalar(a / 30.07));
    return new LineLoop(new BufferGeometry().setFromPoints(pts), new LineBasicMaterial({ color: '#8fa6d6', transparent: true, opacity: 0.55 }));
  }), []);
  return (
    <group rotation={[-1.05, 0, 0]}>
      {orbits.map((o, i) => <primitive key={i} object={o} />)}
      <Glow size={0.12} color="#ffd38a" />
    </group>
  );
}

/** World-sized points stay legible up close and fade instead of turning into blobs from afar. */
function Cloud({ build, worldSize, opacity = 1 }: { build: (c: ReturnType<typeof cloud>) => void; worldSize: number; opacity?: number }) {
  const geometry = useMemo(() => { const c = cloud(); build(c); return c.build(); }, [build]);
  return <PointCloud geometry={geometry} worldSize={worldSize} opacity={opacity} />;
}

const oort = (c: ReturnType<typeof cloud>) => {
  const r = rng(31);
  for (let i = 0; i < 6000; i++) {
    const v = new Vector3(gauss(r), gauss(r), gauss(r)).normalize().multiplyScalar(0.25 + 0.75 * Math.cbrt(r()));
    const k = 0.6 + r() * 0.6;
    c.push(v.x, v.y, v.z, 0.7 * k, 0.8 * k, k, 1.2 + r());
  }
};
const milkyWay = (c: ReturnType<typeof cloud>) => addSpiral(c, { count: 26000, radius: 1, seed: 3, bright: 0.7 });
const andromeda = (c: ReturnType<typeof cloud>) => addSpiral(c, { count: 26000, radius: 1, seed: 20, bright: 0.75, pitchDeg: 9, arms: 2 });
const localGroup = (c: ReturnType<typeof cloud>) => {
  const r = rng(41);
  const spot = (x: number, y: number, rad: number, n: number, spiral: boolean, seed: number) => {
    const g = cloud();
    if (spiral) addSpiral(g, { count: n, radius: rad, seed, bright: 2 }); else addIrregular(g, { count: n, radius: rad, seed, bright: 2 });
    const geo = g.build(), pos = geo.getAttribute('position'), col = geo.getAttribute('color');
    for (let i = 0; i < pos.count; i++) c.push(pos.getX(i) + x, pos.getY(i) + y, pos.getZ(i), col.getX(i), col.getY(i), col.getZ(i), 1.2);
  };
  spot(-0.18, -0.08, 0.035, 3000, true, 3); // Milky Way
  spot(0.32, 0.16, 0.05, 3500, true, 20); // Andromeda
  spot(0.42, 0.02, 0.02, 1200, true, 21); // Triangulum
  spot(-0.15, -0.13, 0.008, 400, false, 22); // Magellanic Clouds
  for (let i = 0; i < 60; i++) spot(gauss(r) * 0.45, gauss(r) * 0.3, 0.004 + r() * 0.006, 80, false, 50 + i); // dwarf galaxies
};
const laniakea = (c: ReturnType<typeof cloud>) => web(c, 12, 140, 0, 1, 0.012, 40, 30);
const universe = (c: ReturnType<typeof cloud>) => web(c, 13, 700, 0, 0.98, 0.006, 16, 10);

function Body({ b }: { b: Sized }) {
  const shell = useMemo(() => shellMaterial('#c08bff', 0.5), []);
  switch (b.kind) {
    case 'moon': return <Moon />;
    case 'earth': return <Earth />;
    case 'planet': return <Planet name={b.name} />;
    case 'star': return <Star b={b} />;
    case 'system': return <SolarSystem />;
    case 'oort': return <><Cloud build={oort} worldSize={0.009} /><Glow size={0.08} color="#ffd38a" /></>;
    case 'galaxy': return (
      <group rotation={b.name.startsWith('Andromeda') ? [-1.2, 0, 0.5] : [-0.5, 0, 0]}>
        <Cloud build={b.name.startsWith('Andromeda') ? andromeda : milkyWay} worldSize={0.006} />
        <Glow size={0.7} color="#ffd9a8" opacity={0.6} />
      </group>
    );
    case 'group': return (
      <>
        <Cloud build={localGroup} worldSize={0.005} />
        <Glow size={0.1} color="#ffe2bd" opacity={0.7} position={[-0.18, -0.08, 0]} />
        <Glow size={0.14} color="#ffe2bd" opacity={0.7} position={[0.32, 0.16, 0]} />
      </>
    );
    case 'web': return <Cloud build={laniakea} worldSize={0.004} />;
    case 'universe': return (
      <>
        <Cloud build={universe} worldSize={0.0025} />
        <mesh material={shell}><sphereGeometry args={[1, 64, 32]} /></mesh>
      </>
    );
  }
}

function useViewport() {
  const [v, setV] = useState({ w: innerWidth, h: innerHeight });
  useEffect(() => {
    const on = () => setV({ w: innerWidth, h: innerHeight });
    addEventListener('resize', on);
    return () => removeEventListener('resize', on);
  }, []);
  return v;
}

function Ticker() {
  useFrame((_, dt) => { clock.value += dt; }); // the main scene is paused; keep star surfaces churning
  return null;
}

export default function SizeCompare() {
  const { w, h } = useViewport();
  const [target, setTarget] = useState(START);
  const [pos, setPos] = useState(START);
  // ease toward the target index
  useEffect(() => {
    let raf = 0;
    const tick = () => setPos((p) => {
      if (Math.abs(target - p) < 0.002) return target;
      raf = requestAnimationFrame(tick);
      return p + (target - p) * 0.12;
    });
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target]);
  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && useStore.getState().set({ panel: null });
    addEventListener('keydown', esc);
    return () => removeEventListener('keydown', esc);
  }, []);

  // log-interpolate the focus size between neighbors so each step zooms smoothly
  const i = Math.min(Math.floor(pos), SIZES.length - 2), f = pos - i;
  const R = Math.exp(Math.log(SIZES[i].radiusKm) * (1 - f) + Math.log(SIZES[i + 1].radiusKm) * f);
  const x = CENTERS[i] * (1 - f) + CENTERS[i + 1] * f;
  const s = Math.min(h * 0.24, w * 0.4) / R; // px per km; the focused body fits below the heading
  const layout = useRef<Layout>({ x, s, w, h });
  layout.current = { x, s, w, h };
  const near = SIZES[Math.round(pos)];
  const close = () => useStore.getState().set({ panel: null });

  return (
    <div className="panel sizes" role="dialog" aria-label="Size comparison">
      <Canvas camera={{ fov: FOV, near: 1, far: 5000, position: [0, 0, CAM_Z] }} dpr={[1, 2]}>
        <ambientLight intensity={0.08} />
        <directionalLight position={LIGHT.clone().multiplyScalar(10)} intensity={2.6} />
        <Ticker />
        <Suspense fallback={null}>
          {SIZES.map((b, k) => <Slot key={b.name} k={k} layout={layout}><Body b={b} /></Slot>)}
        </Suspense>
      </Canvas>
      <div className="sz-baseline" style={{ top: h * BASE }} />
      {SIZES.map((b, k) => {
        const r = b.radiusKm * s, cx = w / 2 + (CENTERS[k] - x) * s;
        return r > 12 && r < 15 * h && cx > -60 && cx < w + 60
          ? <span key={b.name} className="sz-name" style={{ left: cx, top: h * BASE + 10 }}>{b.name}</span>
          : null;
      })}
      <header className="sz-head">
        <h2>{near.name}</h2>
        <p>{describe(near)}</p>
        {near.note && <p className="sz-note">{near.note}</p>}
      </header>
      <button className="icon close" aria-label="Close" onClick={close}><Close /></button>
      <div className="sz-controls glass">
        <button onClick={() => setTarget(Math.max(0, Math.round(target) - 1))} disabled={target <= 0}>Smaller</button>
        <input type="range" min={0} max={SIZES.length - 1} step={0.01} value={pos} aria-label="Zoom through sizes"
          onChange={(e) => { setTarget(+e.target.value); setPos(+e.target.value); }} />
        <button onClick={() => setTarget(Math.min(SIZES.length - 1, Math.round(target) + 1))} disabled={target >= SIZES.length - 1}>Bigger</button>
      </div>
    </div>
  );
}
