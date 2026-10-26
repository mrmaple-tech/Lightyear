import { useMemo } from 'react';
import { BufferGeometry, Line, LineBasicMaterial, Vector3 } from 'three';

/** A closed polyline from a sampler of positions (already in the parent's units). */
export function Orbit({ sample, samples = 256, color = '#8fa6d6', opacity = 0.35 }: {
  sample: (f: number) => Vector3; samples?: number; color?: string; opacity?: number;
}) {
  const line = useMemo(() => {
    const pts = Array.from({ length: samples + 1 }, (_, i) => sample((i % samples) / samples));
    return new Line(new BufferGeometry().setFromPoints(pts), new LineBasicMaterial({ color, transparent: true, opacity, depthWrite: false }));
  }, [sample, samples, color, opacity]);
  return <primitive object={line} />;
}

/** Heliocentric orbit sampler for a planet over one period, in AU. */
export function planetSampler(pos: (t: Date) => Vector3, periodDays: number, start: number) {
  return (f: number) => pos(new Date(start + f * periodDays * 864e5)).clone().divideScalar(1.495978707e11);
}
