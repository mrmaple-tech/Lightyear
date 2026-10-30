import { Component, Suspense, lazy, type ReactNode } from 'react';
import { Canvas } from '@react-three/fiber';
import { Universe } from './scene/Universe.tsx';
import { Hud } from './ui/Hud.tsx';
import { InfoCard } from './ui/InfoCard.tsx';
import { TimeBar } from './ui/TimeBar.tsx';
import { Caption } from './ui/Caption.tsx';
import { Intro } from './ui/Intro.tsx';
import { useStore } from './store.ts';

// Loaded on first open, so they don't weigh on the initial page load.
const SkyView = lazy(() => import('./ui/SkyView.tsx'));
const SizeCompare = lazy(() => import('./ui/SizeCompare.tsx'));

/** Without this, a WebGL failure unmounts the whole app and leaves a blank page. */
class SceneBoundary extends Component<{ children: ReactNode }, { error?: Error }> {
  state: { error?: Error } = {};
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="scene-error glass" role="alert">
        <h2>The 3D view couldn't start</h2>
        <p>
          Your browser couldn't create a WebGL context. Turn on hardware acceleration (Chrome: Settings → System → "Use graphics
          acceleration when available"), then restart the browser.
        </p>
        <p className="detail">{this.state.error.message}</p>
      </div>
    );
  }
}

export function App() {
  const panel = useStore((s) => s.panel);
  const intro = useStore((s) => s.intro);
  return (
    <div className={intro ? 'intro-on' : undefined}>
      <SceneBoundary>
        <Canvas
          className="scene"
          dpr={1.5}
          frameloop={panel ? 'never' : 'always'} // paused behind full-screen panels
          camera={{ position: [0, 3.2, 9.5], fov: 50, near: 0.01, far: 1e7 }}
          gl={{ antialias: false, powerPreference: 'high-performance' }}
          // shader error checks force the GPU to finish every compile on the spot; only useful in dev
          onCreated={({ gl }) => { gl.debug.checkShaderErrors = import.meta.env.DEV; }}
          raycaster={{ params: { Points: { threshold: 0.06 } } } as never}
        >
          <Universe />
        </Canvas>
      </SceneBoundary>
      <Hud />
      <InfoCard />
      <Caption />
      <TimeBar />
      <Suspense fallback={null}>
        {panel === 'sky' && <SkyView />}
        {panel === 'sizes' && <SizeCompare />}
      </Suspense>
      {intro && <Intro onDone={() => useStore.getState().set({ intro: false })} />}
    </div>
  );
}
