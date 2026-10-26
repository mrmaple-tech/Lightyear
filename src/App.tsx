import { Canvas } from '@react-three/fiber';
import { Universe } from './scene/Universe.tsx';
import { Hud } from './ui/Hud.tsx';
import { InfoCard } from './ui/InfoCard.tsx';
import { TimeBar } from './ui/TimeBar.tsx';

export function App() {
  return (
    <>
      <Canvas
        className="scene"
        dpr={[1, 2]}
        camera={{ position: [0, 3.2, 9.5], fov: 50, near: 0.01, far: 1e7 }}
        gl={{ antialias: false, powerPreference: 'high-performance' }}
        raycaster={{ params: { Points: { threshold: 0.06 } } } as never}
      >
        <Universe />
      </Canvas>
      <Hud />
      <InfoCard />
      <TimeBar />
    </>
  );
}
