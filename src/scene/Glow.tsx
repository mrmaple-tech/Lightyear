import { AdditiveBlending } from 'three';
import { glowTexture } from './materials.ts';

/** Camera-facing additive halo. `size` is the sprite's diameter in parent units. */
export function Glow({ size, color, opacity = 1, position }: { size: number; color: string; opacity?: number; position?: [number, number, number] }) {
  return (
    <sprite scale={size} position={position}>
      <spriteMaterial map={glowTexture()} color={color} opacity={opacity} blending={AdditiveBlending} depthWrite={false} transparent toneMapped={false} />
    </sprite>
  );
}
