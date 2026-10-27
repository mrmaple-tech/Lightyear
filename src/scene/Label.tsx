import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import { useStore } from '../store.ts';
import { fade } from '../lib/coords.ts';
import type { Fade } from '../data/layers.ts';

interface Props {
  id: string;
  text: string;
  window: Fade;
  position?: [number, number, number];
  variant?: 'here' | 'faint';
}

/** Clickable DOM label pinned to a 3D point. Doubles as the hit target for tiny objects. */
export function Label({ id, text, window, position, variant }: Props) {
  const el = useRef<HTMLButtonElement>(null!);
  const selected = useStore((s) => s.selected === id);
  useFrame(() => {
    if (!el.current) return; // Html mounts its DOM a frame later
    const s = useStore.getState();
    // the focused object stays labeled up close, but not once zoomed out past its own window
    const o = (s.focusId === id || s.flight?.to === id) && s.logD < window[2] ? 1 : fade(s.logD, window);
    el.current.style.opacity = String(o);
    el.current.style.visibility = o < 0.25 ? 'hidden' : 'visible';
  });
  return (
    <Html position={position} zIndexRange={[10, 0]} style={{ pointerEvents: 'none' }}>
      <button
        ref={el}
        className={`label ${variant ?? ''} ${selected ? 'selected' : ''}`}
        onClick={() => useStore.getState().select(id)}
      >
        {variant === 'here' && <span className="pin" aria-hidden />}
        {text}
      </button>
    </Html>
  );
}
