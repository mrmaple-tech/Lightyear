// "When does it pass over me?" for satellites: asks for the viewer's location once, then lists passes.
import { useMemo, useState } from 'react';
import { locate, useStore } from '../store.ts';
import { SATELLITES } from '../data/satellites.ts';
import { passes } from '../lib/passes.ts';

const day = new Intl.DateTimeFormat(undefined, { weekday: 'short', day: 'numeric', month: 'short' });
const time = new Intl.DateTimeFormat(undefined, { hour: '2-digit', minute: '2-digit' });

export function Passes({ id }: { id: string }) {
  const home = useStore((s) => s.home);
  const [error, setError] = useState('');
  const norad = SATELLITES.find((s) => s.id === id)?.norad;
  // computed from the current sim time when the card opens or the location changes
  const report = useMemo(() => (home && norad ? passes(norad, home.lat, home.lon, new Date(useStore.getState().simTime)) : null), [home, norad]);

  if (!norad) return null;
  if (!home) {
    return (
      <div className="passes">
        <button onClick={() => locate().catch(() => setError('Location unavailable. Allow location access to see passes.'))}>
          When does it pass over me?
        </button>
        {error && <p className="hint" role="alert">{error}</p>}
      </div>
    );
  }
  return (
    <div className="passes">
      <h3>Over your location</h3>
      {report && 'never' in report && <p className="hint">It doesn't rise above your horizon in the next two days.</p>}
      {report && 'always' in report && <p className="hint">Always above your horizon: {Math.round(report.always)}° up, toward the {report.dir}.</p>}
      {report && 'passes' in report && (
        <ul>
          {report.passes.map((p) => (
            <li key={+p.rise}>
              <span>{day.format(p.rise)}, {time.format(p.rise)}–{time.format(p.set)}</span>
              <span>{Math.round(p.maxEl)}° · {p.riseDir}→{p.setDir}{p.visible && <b className="visible"> · visible</b>}</span>
            </li>
          ))}
        </ul>
      )}
      <p className="hint">Local times from {home.lat.toFixed(1)}°, {home.lon.toFixed(1)}°. "Visible" passes happen in a dark sky with the satellite still sunlit.</p>
    </div>
  );
}
