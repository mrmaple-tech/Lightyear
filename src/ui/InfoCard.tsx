import { useEffect } from 'react';
import { useStore } from '../store.ts';
import { byId, get } from '../catalog.ts';
import { formatDistance, lightTime } from '../lib/scale.ts';
import { Close, Target } from './icons.tsx';

export function InfoCard() {
  const id = useStore((s) => s.selected);
  const obj = id ? byId.get(id) : undefined;
  // live objects re-render with sim time; static ones only once
  const t = useStore((s) => (obj?.live ? s.simTime : 0));
  const select = useStore((s) => s.select);

  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && select(null);
    addEventListener('keydown', esc);
    return () => removeEventListener('keydown', esc);
  }, [select]);

  if (!obj) return null;
  const date = new Date(t || useStore.getState().simTime);
  const d = obj.id === 'earth' ? 0 : obj.pos(date).distanceTo(get('earth').pos(date));

  return (
    <aside className="card glass" aria-label={`${obj.name} details`}>
      <button className="icon close" onClick={() => select(null)} aria-label="Close"><Close /></button>
      <p className="kicker">{obj.type}</p>
      <h2>{obj.name}</h2>
      <dl>
        {obj.size && (<><dt>Size</dt><dd>{obj.size}</dd></>)}
        <dt>Distance from Earth{obj.live && <span className="live" title="Updates with simulation time">live</span>}</dt>
        <dd>{d ? formatDistance(d) : 'You are here'}</dd>
        <dt>Light travel time</dt>
        <dd>{d ? lightTime(d) : '—'}</dd>
      </dl>
      <p className="fact">{obj.fact}</p>
      <button className="primary" onClick={() => useStore.getState().flyTo(obj.id)}>
        <Target /> Fly to
      </button>
    </aside>
  );
}
