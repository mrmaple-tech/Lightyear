import { Suspense, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Stars } from '@react-three/drei';
import { Bloom, EffectComposer } from '@react-three/postprocessing';
import type { Group } from 'three';
import { AU, KPC, MPC, PC } from '../lib/coords.ts';
import { get } from '../catalog.ts';
import { simDate } from '../store.ts';
import { Rig } from './Rig.tsx';
import { Space } from './Space.tsx';
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

export function Universe() {
  return (
    <>
      <color attach="background" args={['#020308']} />
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
      <EffectComposer>
        <Bloom mipmapBlur luminanceThreshold={0.85} intensity={0.9} radius={0.7} />
      </EffectComposer>
    </>
  );
}
