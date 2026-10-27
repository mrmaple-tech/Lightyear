import type { Look } from '../data/solarSystem.ts';
import { AdditiveBlending, BackSide, CanvasTexture, Color, DoubleSide, ShaderMaterial, Vector3, type Texture } from 'three';

/** Soft round additive points. Optional per-vertex `aSpeed` (rad/day) spins points around Y, used by the asteroid belt. */
export const pointsMaterial = (opacity = 1) =>
  new ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
    uniforms: { uOpacity: { value: opacity }, uDays: { value: 0 }, uPx: { value: Math.min(devicePixelRatio, 2) } },
    vertexShader: /* glsl */ `
      attribute vec3 color; attribute float size; attribute float aSpeed;
      uniform float uDays, uPx;
      varying vec3 vColor; varying float vSize;
      void main() {
        vSize = size;
        float a = aSpeed * uDays; float c = cos(a), s = sin(a);
        vec3 p = vec3(c * position.x + s * position.z, position.y, -s * position.x + c * position.z);
        vColor = color;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
        gl_PointSize = size * uPx;
      }`,
    fragmentShader: /* glsl */ `
      uniform float uOpacity; varying vec3 vColor; varying float vSize;
      void main() {
        vec2 d = abs(gl_PointCoord - 0.5) * 2.0;
        float r = length(d);
        float a = exp(-r * r * 5.0) * (1.0 - smoothstep(0.85, 1.0, r));
        // faint diffraction spikes on the biggest (brightest) points
        a += smoothstep(8.0, 12.0, vSize) * 0.5 * (exp(-d.x * 24.0) + exp(-d.y * 24.0)) * (1.0 - r * 0.9);
        gl_FragColor = vec4(vColor, a * uOpacity);
      }`,
  });

/** Earth: textured day side, city lights on the night side, terminator from the real Sun direction, thin atmosphere rim. */
export const earthMaterial = (day: Texture, night: Texture) =>
  new ShaderMaterial({
    uniforms: { day: { value: day }, night: { value: night }, sunDir: { value: null }, uOpacity: { value: 1 } },
    transparent: true,
    vertexShader: /* glsl */ `
      varying vec2 vUv; varying vec3 vN; varying vec3 vW;
      void main() {
        vUv = uv; vN = normalize(mat3(modelMatrix) * normal);
        vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz;
        gl_Position = projectionMatrix * viewMatrix * w;
      }`,
    fragmentShader: /* glsl */ `
      uniform sampler2D day, night; uniform vec3 sunDir; uniform float uOpacity;
      varying vec2 vUv; varying vec3 vN; varying vec3 vW;
      void main() {
        vec3 n = normalize(vN);
        float l = dot(n, sunDir);
        vec3 d = texture2D(day, vUv).rgb * max(l, 0.0) * 1.35;
        vec3 nt = texture2D(night, vUv).rgb * vec3(1.0, 0.8, 0.55) * 0.9;
        vec3 col = mix(nt, d, smoothstep(-0.12, 0.12, l));
        float rim = pow(1.0 - max(dot(n, normalize(cameraPosition - vW)), 0.0), 3.0);
        col += vec3(0.3, 0.55, 1.0) * rim * smoothstep(-0.3, 0.4, l) * 0.9;
        gl_FragColor = vec4(col, uOpacity);
      }`,
  });

/** Earth's atmosphere: a larger back-face shell that glows brightest at the limb and fades outward, lit on the day side. */
export const atmosphereMaterial = (color: string, scale: number) =>
  new ShaderMaterial({
    transparent: true,
    depthWrite: false,
    side: BackSide,
    blending: AdditiveBlending,
    uniforms: { uColor: { value: new Color(color) }, sunPos: sunWorld, uOpacity: { value: 1 }, limb: { value: Math.sqrt(1 - 1 / (scale * scale)) } },
    vertexShader: SPHERE_VERT,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor, sunPos; uniform float uOpacity, limb; varying vec3 vP; varying vec3 vN; varying vec3 vW;
      void main() {
        vec3 N = normalize(vN);
        float k = clamp(-dot(N, normalize(cameraPosition - vW)) / limb, 0.0, 1.0);
        float day = smoothstep(-0.35, 0.4, dot(N, normalize(sunPos - vW)));
        gl_FragColor = vec4(uColor, pow(k, 4.0) * day * uOpacity);
      }`,
  });

/** Faint fresnel shell for boundaries (heliopause, edge of the observable universe). */
export const shellMaterial = (color: string, opacity: number) =>
  new ShaderMaterial({
    transparent: true,
    depthWrite: false,
    side: BackSide,
    blending: AdditiveBlending,
    uniforms: { uColor: { value: new Color(color) }, uOpacity: { value: opacity } },
    vertexShader: /* glsl */ `
      varying vec3 vN; varying vec3 vW;
      void main() {
        vN = normalize(mat3(modelMatrix) * normal);
        vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz;
        gl_Position = projectionMatrix * viewMatrix * w;
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor; uniform float uOpacity; varying vec3 vN; varying vec3 vW;
      void main() {
        float f = 1.0 - abs(dot(normalize(vN), normalize(cameraPosition - vW)));
        gl_FragColor = vec4(uColor, (0.04 + pow(f, 2.5)) * uOpacity);
      }`,
  });

/** World-space Sun position, shared by every lit shader; updated once per frame in Universe. */
export const sunWorld = { value: new Vector3() };
export const clock = { value: 0 };

const NOISE = /* glsl */ `
  float hash(vec3 p) { p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
  float noise(vec3 x) {
    vec3 i = floor(x), f = fract(x); f = f * f * (3.0 - 2.0 * f);
    return mix(mix(mix(hash(i), hash(i + vec3(1, 0, 0)), f.x), mix(hash(i + vec3(0, 1, 0)), hash(i + vec3(1, 1, 0)), f.x), f.y),
               mix(mix(hash(i + vec3(0, 0, 1)), hash(i + vec3(1, 0, 1)), f.x), mix(hash(i + vec3(0, 1, 1)), hash(i + vec3(1, 1, 1)), f.x), f.y), f.z);
  }
  float fbm(vec3 p) { float a = 0.5, s = 0.0; for (int i = 0; i < 5; i++) { s += a * noise(p); p *= 2.03; a *= 0.5; } return s; }`;

const SPHERE_VERT = /* glsl */ `
  varying vec3 vP; varying vec3 vN; varying vec3 vW;
  void main() {
    vP = position; vN = normalize(mat3(modelMatrix) * normal);
    vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz;
    gl_Position = projectionMatrix * viewMatrix * w;
  }`;


/** Procedural planet: gas-giant bands or a mottled rocky surface, lit by the real Sun position. */
export const planetMaterial = ({ colors, bands, turb, rim }: Look, seed: number) =>
  new ShaderMaterial({
    transparent: true,
    uniforms: {
      c1: { value: new Color(colors[0]) }, c2: { value: new Color(colors[1]) }, c3: { value: new Color(colors[2]) },
      bands: { value: bands }, turb: { value: turb }, rim: { value: rim }, seed: { value: seed },
      sunPos: sunWorld, uOpacity: { value: 1 },
    },
    vertexShader: SPHERE_VERT,
    fragmentShader: /* glsl */ `
      uniform vec3 c1, c2, c3, sunPos; uniform float bands, turb, rim, seed, uOpacity;
      varying vec3 vP; varying vec3 vN; varying vec3 vW;
      ${NOISE}
      void main() {
        vec3 p = vP + seed;
        float n = fbm(p * 3.0);
        float t = bands > 0.0
          ? mix(0.5 + 0.5 * sin(vP.y * bands + n * turb), fbm(p * vec3(1.5, 14.0, 1.5)), 0.3)
          : smoothstep(0.3, 0.75, n + 0.25 * fbm(p * 9.0));
        vec3 col = mix(c1, c2, t);
        col = mix(col, c3, smoothstep(0.6, 0.78, fbm(p * 5.0 + 7.0)) * 0.7);
        vec3 N = normalize(vN), L = normalize(sunPos - vW), V = normalize(cameraPosition - vW);
        float l = dot(N, L);
        float fr = pow(1.0 - max(dot(N, V), 0.0), 3.0);
        col = col * (max(l, 0.0) * 1.15 + 0.015) + mix(c2, vec3(0.6, 0.8, 1.0), 0.4) * rim * fr * smoothstep(-0.25, 0.5, l);
        gl_FragColor = vec4(col, uOpacity);
      }`,
  });

/** The Sun: churning granulation, limb darkening, pushed past 1.0 so bloom catches it. */
export const sunMaterial = () =>
  new ShaderMaterial({
    transparent: true,
    uniforms: { uTime: clock, uOpacity: { value: 1 } },
    vertexShader: SPHERE_VERT,
    fragmentShader: /* glsl */ `
      uniform float uTime, uOpacity; varying vec3 vP; varying vec3 vN; varying vec3 vW;
      ${NOISE}
      void main() {
        float g = fbm(vP * 7.0 + vec3(0.0, uTime * 0.04, uTime * 0.03));
        float s = fbm(vP * 2.5 - uTime * 0.01);
        vec3 col = mix(vec3(1.0, 0.42, 0.08), vec3(1.0, 0.92, 0.65), smoothstep(0.25, 0.75, g));
        col *= 0.75 + 0.5 * s;
        float mu = max(dot(normalize(vN), normalize(cameraPosition - vW)), 0.0);
        col *= 0.45 + 0.55 * pow(mu, 0.5);
        gl_FragColor = vec4(col * 1.7, uOpacity);
      }`,
  });

/** Saturn's rings: radial ringlets and the Cassini division (radii in planet radii). */
export const ringMaterial = () =>
  new ShaderMaterial({
    transparent: true,
    depthWrite: false,
    side: DoubleSide,
    uniforms: { sunPos: sunWorld, uOpacity: { value: 1 } },
    vertexShader: /* glsl */ `
      varying float vR; varying vec3 vW;
      void main() {
        vR = length(position.xy);
        vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz;
        gl_Position = projectionMatrix * viewMatrix * w;
      }`,
    fragmentShader: /* glsl */ `
      uniform float uOpacity; varying float vR; varying vec3 vW;
      ${NOISE}
      void main() {
        float a = smoothstep(1.24, 1.32, vR) * (1.0 - smoothstep(2.2, 2.27, vR));
        a *= 1.0 - 0.92 * smoothstep(1.98, 2.0, vR) * (1.0 - smoothstep(2.04, 2.06, vR)); // Cassini division
        a *= 1.0 - 0.6 * (1.0 - smoothstep(1.3, 1.52, vR));                              // faint C ring
        float ringlets = noise(vec3(vR * 90.0, 0.0, 0.0)) * 0.5 + noise(vec3(vR * 23.0, 1.0, 0.0)) * 0.5;
        a *= 0.45 + 0.55 * ringlets;
        vec3 col = mix(vec3(0.62, 0.53, 0.40), vec3(0.93, 0.85, 0.70), ringlets);
        gl_FragColor = vec4(col, a * 0.85 * uOpacity);
      }`,
  });

let glow: CanvasTexture | undefined;
/** Soft radial falloff for coronas and galaxy cores (built once). */
export function glowTexture() {
  if (glow) return glow;
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d')!;
  const r = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  [[0, 1], [0.12, 0.55], [0.35, 0.14], [0.7, 0.03], [1, 0]].forEach(([o, a]) => r.addColorStop(o, `rgba(255,255,255,${a})`));
  g.fillStyle = r;
  g.fillRect(0, 0, 128, 128);
  return (glow = new CanvasTexture(c));
}
