// Size comparison: bodies lined up on a baseline at true relative size; the slider glides the
// "camera" from the Moon to VY Canis Majoris (a range of about 570,000×).
import { useEffect, useState } from 'react';
import { useStore } from '../store.ts';
import { SIZES } from '../data/sizes.ts';
import { Close } from './icons.tsx';

const SUN_KM = 696_000;
const START = SIZES.findIndex((s) => s.name === 'Earth');
// x position (km) of each center along the lineup, with a gap proportional to each body
const CENTERS = SIZES.reduce<number[]>((xs, s, i) => [...xs, i ? xs[i - 1] + SIZES[i - 1].radiusKm + s.radiusKm * 1.3 : 0], []);
const fmt = (r: number) => (r < 3 * SUN_KM ? `${Math.round(2 * r).toLocaleString()} km across` : `${Math.round(r / SUN_KM).toLocaleString()} × the Sun's width`);

function useViewport() {
  const [v, setV] = useState({ w: innerWidth, h: innerHeight });
  useEffect(() => {
    const on = () => setV({ w: innerWidth, h: innerHeight });
    addEventListener('resize', on);
    return () => removeEventListener('resize', on);
  }, []);
  return v;
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

  const i = Math.min(Math.floor(pos), SIZES.length - 2), f = pos - i;
  const R = Math.exp(Math.log(SIZES[i].radiusKm) * (1 - f) + Math.log(SIZES[i + 1].radiusKm) * f);
  const x = CENTERS[i] * (1 - f) + CENTERS[i + 1] * f;
  const s = Math.min(h * 0.28, w * 0.4) / R; // px per km; the focused body fits either orientation
  const base = h * 0.7;
  const near = SIZES[Math.round(pos)];
  const close = () => useStore.getState().set({ panel: null });
  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && useStore.getState().set({ panel: null });
    addEventListener('keydown', esc);
    return () => removeEventListener('keydown', esc);
  }, []);

  return (
    <div className="panel sizes" role="dialog" aria-label="Size comparison">
      <svg width={w} height={h} aria-hidden>
        <defs>
          {SIZES.map((b, k) => (
            <radialGradient key={k} id={`sz${k}`} cx="38%" cy="35%" r="70%">
              <stop offset="0%" stopColor="#fff" stopOpacity={b.radiusKm > SUN_KM * 0.9 ? 0.9 : 0.35} />
              <stop offset="35%" stopColor={b.color} />
              <stop offset="100%" stopColor={b.radiusKm > SUN_KM * 0.9 ? b.color : '#05060a'} />
            </radialGradient>
          ))}
        </defs>
        <line x1={0} x2={w} y1={base} y2={base} stroke="rgba(255,255,255,0.12)" />
        {SIZES.map((b, k) => {
          const r = b.radiusKm * s, cx = w / 2 + (CENTERS[k] - x) * s;
          if (r < 0.4 || cx + r < -w || cx - r > 2 * w) return null;
          const big = Math.min(r, 4e5); // keep giant circles within what SVG renders reliably
          return (
            <g key={k}>
              <circle cx={cx} cy={base - big} r={big} fill={`url(#sz${k})`} />
              {r > 12 && cx > -40 && cx < w + 40 && (
                <text x={cx} y={base + 22} textAnchor="middle" className="sz-name">{b.name}</text>
              )}
            </g>
          );
        })}
      </svg>
      <header className="sz-head">
        <h2>{near.name}</h2>
        <p>{fmt(near.radiusKm)}</p>
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
