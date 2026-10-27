import { useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { SPEEDS, useStore } from '../store.ts';
import { TIME_RELEVANT_LOGD } from '../data/layers.ts';
import { Pause, Play, Reverse } from './icons.tsx';

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
      {dim && <p className="note">Planetary motion is imperceptible at this scale</p>}
    </section>
  );
}
