import { useState } from 'react';
import { useStore } from '../store.ts';
import { CATALOG } from '../catalog.ts';
import { LAYERS, layerAt } from '../data/layers.ts';
import { scaleBar } from '../lib/scale.ts';
import { Search as SearchIcon } from './icons.tsx';

const FOV = (50 * Math.PI) / 180;
const NAMES = [...new Set(CATALOG.map((o) => o.name))].sort();

function go(name: string) {
  const q = name.trim().toLowerCase();
  if (!q) return false;
  const hit = CATALOG.find((o) => o.name.toLowerCase() === q) ?? CATALOG.find((o) => o.name.toLowerCase().includes(q));
  if (!hit) return false;
  const s = useStore.getState();
  s.select(hit.id);
  s.flyTo(hit.id);
  return true;
}

function Search() {
  const [q, setQ] = useState('');
  const [miss, setMiss] = useState(false);
  return (
    <form
      className="search glass"
      role="search"
      onSubmit={(e) => {
        e.preventDefault();
        const ok = go(q);
        setMiss(!ok);
        if (ok) (document.activeElement as HTMLElement)?.blur();
      }}
    >
      <SearchIcon />
      <label htmlFor="search" className="sr-only">Search for an object</label>
      <input
        id="search"
        list="objects"
        placeholder="Search planets, stars, galaxies…"
        value={q}
        aria-invalid={miss}
        onChange={(e) => {
          setQ(e.target.value);
          setMiss(false);
          // picking from the native suggestion list fires change with an exact name
          if (NAMES.includes(e.target.value) && go(e.target.value)) (e.target as HTMLInputElement).blur();
        }}
      />
      <datalist id="objects">{NAMES.map((n) => <option key={n} value={n} />)}</datalist>
      {miss && <span className="miss" role="status">No match</span>}
    </form>
  );
}

function ScaleBar() {
  const logD = useStore((s) => Math.round(s.logD * 100) / 100);
  const { label, px } = scaleBar((2 * 10 ** logD * Math.tan(FOV / 2)) / innerHeight);
  return (
    <div className="scalebar" aria-label={`Scale: ${label}`}>
      <div className="bar" style={{ width: px }} />
      <span>{label}</span>
    </div>
  );
}

function LayerNav() {
  const current = useStore((s) => layerAt(s.logD).id);
  return (
    <nav className="layers glass" aria-label="Zoom layers">
      <ol>
        {LAYERS.map((l, i) => (
          <li key={l.id}>
            <button aria-current={l.id === current ? 'true' : undefined} onClick={() => useStore.getState().jumpToLayer(i)}>
              <span className="num">{l.id}</span>
              <span className="name">{l.name}</span>
            </button>
          </li>
        ))}
      </ol>
    </nav>
  );
}

function ScaleToggle() {
  const readable = useStore((s) => s.readable);
  const set = useStore((s) => s.set);
  return (
    <div className="seg glass" role="group" aria-label="Body size scale">
      <button aria-pressed={readable} onClick={() => set({ readable: true })}>Readable</button>
      <button aria-pressed={!readable} onClick={() => set({ readable: false })}>True scale</button>
    </div>
  );
}

export function Hud() {
  return (
    <>
      <header className="top">
        <h1 className="wordmark">Lightyear</h1>
        <div className="top-right">
          <Search />
          <ScaleToggle />
        </div>
      </header>
      <LayerNav />
      <ScaleBar />
    </>
  );
}
