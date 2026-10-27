import { Component, type ReactNode } from 'react';
import { Canvas } from '@react-three/fiber';
import { Universe } from './scene/Universe.tsx';
import { Hud } from './ui/Hud.tsx';
import { InfoCard } from './ui/InfoCard.tsx';
import { TimeBar } from './ui/TimeBar.tsx';

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
  return (
    <>
      <SceneBoundary>
        <Canvas
          className="scene"
          dpr={[1, 1.5]}
          camera={{ position: [0, 3.2, 9.5], fov: 50, near: 0.01, far: 1e7 }}
          gl={{ antialias: false, powerPreference: 'high-performance' }}
          raycaster={{ params: { Points: { threshold: 0.06 } } } as never}
        >
          <Universe />
        </Canvas>
      </SceneBoundary>
      <Hud />
      <InfoCard />
      <TimeBar />
    </>
  );
}
