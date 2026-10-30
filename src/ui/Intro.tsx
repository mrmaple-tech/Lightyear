// Opening title over the live Earth. Any interaction (or either button) dismisses it and the
// interface fades in.
import { useEffect, useState } from 'react';
import { startTour } from './Caption.tsx';

export function Intro({ onDone }: { onDone: () => void }) {
  const [leaving, setLeaving] = useState(false);
  const leave = () => {
    if (leaving) return;
    setLeaving(true);
    setTimeout(onDone, 650);
  };
  useEffect(() => {
    // scrolling, dragging or a key press over the scene means "let me explore"
    const go = (e: Event) => { if (!(e.target as HTMLElement).closest('.intro .ctas')) leave(); };
    const opts = { once: true, passive: true } as const;
    addEventListener('wheel', go, opts);
    addEventListener('pointerdown', go, opts);
    addEventListener('keydown', go, opts);
    return () => {
      removeEventListener('wheel', go);
      removeEventListener('pointerdown', go);
      removeEventListener('keydown', go);
    };
  }, [leaving]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <section className={`intro ${leaving ? 'out' : ''}`} aria-label="Welcome">
      <p className="eyebrow">Zoomverse</p>
      <h1>The universe,<br />to scale.</h1>
      <p className="lede">Fly from your doorstep to the edge of everything we can see. Real planets, real stars, and the satellites passing over you right now.</p>
      <div className="ctas">
        <button className="primary" onClick={() => { leave(); startTour(); }}>Take the tour</button>
        <button className="link" onClick={leave}>Start exploring</button>
      </div>
    </section>
  );
}
