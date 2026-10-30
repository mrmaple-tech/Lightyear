import { useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { SPEEDS, useStore } from '../store.ts';
import { TIME_RELEVANT_LOGD } from '../data/layers.ts';
import { MOMENTS } from '../data/moments.ts';
import { Pause, Play, Reverse } from './icons.tsx';

/** Jump the clock to a historic moment, pause there, and fly to the scene. */
function visit(i: number) {
  const m = MOMENTS[i];
  const s = useStore.getState();
  s.set({ simTime: Date.parse(m.date), playing: false, tour: null, caption: { title: m.label, text: m.note } });
  s.flyTo(m.focus, m.logD);
}

const toInput = (ms: number) => new Date(ms - new Date(ms).getTimezoneOffset() * 6e4).toISOString().slice(0, 16);

export function TimeBar() {
  // The input shows minutes, so only re-render when the minute changes (not every frame).
  const { minute, playing, speed, reverse, set } = useStore(
    useShallow((s) => ({ minute: Math.floor(s.simTime / 6e4), playing: s.playing, speed: s.speed, reverse: s.reverse, set: s.set })),
  );
  const simTime = minute * 6e4;
  const dim = useStore((s) => s.logD > TIME_RELEVANT_LOGD);
  const [draft, setDraft] = useState<string | null>(null);

  return (
    <section className={`timebar glass ${dim ? 'dim' : ''}`} aria-label="Time controls">
      <button className="icon" onClick={() => set({ playing: !playing })} aria-label={playing ? 'Pause' : 'Play'}>
        {playing ? <Pause /> : <Play />}
      </button>
      <button className="icon" aria-pressed={reverse} onClick={() => set({ reverse: !reverse })} aria-label="Run time backwards">
        <Reverse />
      </button>
      <div className="speeds" role="group" aria-label="Speed">
        {SPEEDS.map((s, i) => (
          <button key={s.label} aria-pressed={speed === i} onClick={() => set({ speed: i, playing: true })}>{s.label}</button>
        ))}
      </div>
      <label className="sr-only" htmlFor="when">Simulation date and time</label>
      <input
        id="when"
        type="datetime-local"
        value={draft ?? toInput(simTime)}
        onFocus={() => setDraft(toInput(simTime))}
        onBlur={() => setDraft(null)}
        onChange={(e) => {
          setDraft(e.target.value);
          const t = new Date(e.target.value).getTime();
          if (Number.isFinite(t)) set({ simTime: t });
        }}
      />
      <button className="now" onClick={() => set({ simTime: Date.now(), speed: 0, reverse: false, playing: true })}>Now</button>
      <label className="sr-only" htmlFor="moments">Jump to a moment in history</label>
      <select id="moments" className="moments" value="" onChange={(e) => e.target.value && visit(+e.target.value)}>
        <option value="">Moments…</option>
        {MOMENTS.map((m, i) => <option key={m.label} value={i}>{m.date.slice(0, 4)} · {m.label}</option>)}
      </select>
      {dim && <p className="note">Planetary motion is imperceptible at this scale</p>}
    </section>
  );
}
