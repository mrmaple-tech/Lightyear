import { useEffect, useReducer } from 'react';
import { useStore } from '../store.ts';
import { byId, get } from '../catalog.ts';
import { formatDistance, lightTime } from '../lib/scale.ts';
import { Close, Target } from './icons.tsx';
import { Passes } from './Passes.tsx';

/**
 * Chase view: fly in close behind and a little above a satellite, looking along its path with Earth
 * below; the camera then rides along with the orbit.
 */
export function follow(id: string) {
  const t = useStore.getState().simTime;
  const up = geo(id, t).normalize();
  const ahead = geo(id, t + 1000).normalize().sub(up).normalize();
  useStore.getState().flyTo(id, 5.95, up.multiplyScalar(0.5).addScaledVector(ahead, -0.87).normalize());
}

/** Position relative to Earth's center (m). Satellite motion must be measured against Earth, not the Sun. */
const geo = (id: string, t: number) => get(id).pos(new Date(t)).clone().sub(get('earth').pos(new Date(t)));

/** Orbital speed in km/s, from Earth-relative positions a second apart (sim time). */
const speedKmS = (id: string, t: number) => geo(id, t + 1000).distanceTo(geo(id, t)) / 1e3;

export function InfoCard() {
  const id = useStore((s) => s.selected);
  const obj = id ? byId.get(id) : undefined;
  const select = useStore((s) => s.select);
  // live numbers refresh 4×/s; re-rendering every frame buys nothing a reader can see
  const [, tick] = useReducer((n: number) => n + 1, 0);
  useEffect(() => {
    if (!obj?.live) return;
    const i = setInterval(tick, 250);
    return () => clearInterval(i);
  }, [obj]);

  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && select(null);
    addEventListener('keydown', esc);
    return () => removeEventListener('keydown', esc);
  }, [select]);

  if (!obj) return null;
  const date = new Date(useStore.getState().simTime);
  const center = obj.id === 'earth' ? 0 : obj.pos(date).distanceTo(get('earth').pos(date));
  // satellites: height above the surface is the meaningful number
  const d = obj.earthOrbit ? center - get('earth').radiusM! : center;

  return (
    <aside className="card glass" aria-label={`${obj.name} details`}>
      <button className="icon close" onClick={() => select(null)} aria-label="Close"><Close /></button>
      <p className="kicker">{obj.type}</p>
      <h2>{obj.name}</h2>
      <dl>
        {obj.size && (<><dt>Size</dt><dd>{obj.size}</dd></>)}
        <dt>{obj.earthOrbit ? 'Altitude' : 'Distance from Earth'}{obj.live && <span className="live" title="Updates with simulation time">live</span>}</dt>
        <dd>{d ? formatDistance(d) : 'You are here'}</dd>
        <dt>Light travel time</dt>
        <dd>{d ? lightTime(d) : '—'}</dd>
        {obj.earthOrbit && (<><dt>Speed</dt><dd>{(() => { const v = speedKmS(obj.id, date.getTime()); return `${v.toFixed(2)} km/s (${Math.round(v * 3600).toLocaleString()} km/h)`; })()}</dd></>)}
      </dl>
      <p className="fact">{obj.fact}</p>
      {obj.earthOrbit && <Passes id={obj.id} />}
      <div className="actions">
        {obj.earthOrbit && <button className="primary" onClick={() => follow(obj.id)}><Target /> Follow</button>}
        <button className={obj.earthOrbit ? 'secondary' : 'primary'} onClick={() => useStore.getState().flyTo(obj.id)}>
          {!obj.earthOrbit && <Target />} Fly to
        </button>
      </div>
    </aside>
  );
}
