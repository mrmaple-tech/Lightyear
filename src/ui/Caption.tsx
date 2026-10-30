// Caption card above the time bar, plus the guided-tour autopilot that drives it.
import { useEffect } from 'react';
import { useStore } from '../store.ts';
import { TOUR } from '../data/tour.ts';
import { galDir } from '../lib/coords.ts';
import { Close } from './icons.tsx';

export const startTour = () => useStore.getState().set({ tour: 0, selected: null, panel: null });
const goto = (tour: number | null) => useStore.getState().set(tour === null || tour >= TOUR.length ? { tour: null, caption: null } : { tour: Math.max(0, tour) });

/** Flies to each stop, waits for arrival, lingers, then moves on. Zooming yourself mid-flight ends the tour. */
function useTourAutopilot(step: number | null) {
  useEffect(() => {
    if (step === null) return;
    const stop = TOUR[step];
    const s = useStore.getState();
    s.set({ caption: { title: stop.title, text: stop.text } });
    s.flyTo(stop.focus, stop.logD, stop.viewGal && galDir(...stop.viewGal));
    let timer: ReturnType<typeof setTimeout> | undefined;
    const unsub = useStore.subscribe((st, prev) => {
      if (!prev.flight || st.flight) return;
      unsub();
      if (st.focusId === stop.focus) timer = setTimeout(() => goto(step + 1), stop.hold * 1000);
      else goto(null); // the flight was interrupted by the viewer
    });
    return () => { unsub(); clearTimeout(timer); };
  }, [step]);
}

export function Caption() {
  const caption = useStore((s) => s.caption);
  const tour = useStore((s) => s.tour);
  useTourAutopilot(tour);
  if (!caption) return null;
  return (
    <section className="caption glass" aria-live="polite">
      <button className="icon close" aria-label={tour === null ? 'Dismiss' : 'Exit tour'} onClick={() => goto(null)}><Close /></button>
      {tour !== null && <p className="kicker">Tour · {tour + 1} of {TOUR.length}</p>}
      <h2>{caption.title}</h2>
      <p>{caption.text}</p>
      {tour !== null && (
        <div className="row">
          <button disabled={tour === 0} onClick={() => goto(tour - 1)}>Back</button>
          <button className="primary" onClick={() => goto(tour + 1)}>{tour === TOUR.length - 1 ? 'Finish' : 'Next'}</button>
        </div>
      )}
    </section>
  );
}
