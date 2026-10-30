import { useEffect, useReducer } from 'react';
import { useStore } from '../store.ts';
import { byId, get } from '../catalog.ts';
import { formatDistance, lightTime } from '../lib/scale.ts';
import { Close, Target } from './icons.tsx';
import { Passes } from './Passes.tsx';

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
      </dl>
      <p className="fact">{obj.fact}</p>
      {obj.earthOrbit && <Passes id={obj.id} />}
      <button className="primary" onClick={() => useStore.getState().flyTo(obj.id)}>
        <Target /> Fly to
      </button>
    </aside>
  );
}
