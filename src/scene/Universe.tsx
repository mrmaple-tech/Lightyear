import { Suspense, useRef, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { PerformanceMonitor, Stars } from '@react-three/drei';
import { Bloom, EffectComposer, Vignette } from '@react-three/postprocessing';
import type { Group } from 'three';
import { AU, KPC, MPC, PC } from '../lib/coords.ts';
import { get } from '../catalog.ts';
import { simDate, useStore } from '../store.ts';
import { clock, sunWorld } from './materials.ts';
import { Rig } from './Rig.tsx';
import { K, Space } from './Space.tsx';
import { Label } from './Label.tsx';
import { EarthMoonLayer } from '../layers/EarthMoonLayer.tsx';
import { InnerSolarLayer } from '../layers/InnerSolarLayer.tsx';
import { OuterSolarLayer } from '../layers/OuterSolarLayer.tsx';
import { HeliosphereLayer } from '../layers/HeliosphereLayer.tsx';
import { NearbyStarsLayer } from '../layers/NearbyStarsLayer.tsx';
import { MilkyWayLayer } from '../layers/MilkyWayLayer.tsx';
import { LocalGroupLayer } from '../layers/LocalGroupLayer.tsx';
import { CosmicWebLayer } from '../layers/CosmicWebLayer.tsx';

const ALWAYS = [-Infinity, -Infinity, Infinity, Infinity] as const;

/** Persistent marker on Earth, visible at every scale. */
function YouAreHere() {
  const ref = useRef<Group>(null!);
  useFrame(() => ref.current.position.copy(get('earth').pos(simDate())).divideScalar(AU));
  return <group ref={ref}><Label id="earth" text="You are here" window={ALWAYS} variant="here" /></group>;
}

/** Quality tiers for slow GPUs: 2 = full, 1 = lower resolution, 0 = also no bloom. */
const DPR = [1, 1, 1.5];

export function Universe() {
  const [tier, setTier] = useState(2);
  const setDpr = useThree((s) => s.setDpr);
  const step = (d: number) => setTier((t) => {
    const n = Math.min(2, Math.max(0, t + d));
    setDpr(DPR[n]);
    return n;
  });
  useFrame((_, dt) => {
    const { focus, logD } = useStore.getState();
    sunWorld.value.copy(focus).multiplyScalar(-K / 10 ** logD); // the Sun is the world origin
    clock.value += dt;
  });
  return (
    <>
      <color attach="background" args={['#020308']} />
      <PerformanceMonitor onDecline={() => step(-1)} onIncline={() => step(1)} flipflops={4} />
      <ambientLight intensity={0.06} />
      <Stars radius={300} depth={80} count={7000} factor={5} saturation={0.4} fade />
      <Rig />
      <Space unit={AU}>
        <Suspense fallback={null}><EarthMoonLayer /></Suspense>
        <InnerSolarLayer />
        <OuterSolarLayer />
        <HeliosphereLayer />
        <YouAreHere />
      </Space>
      <Space unit={PC}><NearbyStarsLayer /></Space>
      <Space unit={KPC}><MilkyWayLayer /></Space>
      <Space unit={KPC}><LocalGroupLayer /></Space>
      <Space unit={MPC}><CosmicWebLayer /></Space>
      {/* no MSAA: it multiplies the cost of every point/additive pixel; dpr 1.5 + bloom keep edges soft */}
      {tier > 0 && (
        <EffectComposer multisampling={0}>
          <Bloom mipmapBlur luminanceThreshold={0.85} intensity={0.9} radius={0.7} />
          <Vignette offset={0.3} darkness={0.65} />
        </EffectComposer>
      )}
    </>
  );
}
