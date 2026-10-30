import type { Look } from '../data/solarSystem.ts';
import { AdditiveBlending, BackSide, CanvasTexture, Color, DoubleSide, ShaderMaterial, Vector3, type Texture } from 'three';

/**
 * Soft round additive points. Optional per-vertex `aSpeed` (rad/day) spins points around Y, used by the asteroid belt.
 * With uWorld > 0, `size` is in world units × uWorld instead of pixels: points shrink with distance and fade below
 * one pixel (alpha ∝ px²), so a distant cloud keeps its surface brightness instead of piling up into a white blob.
 */
export const pointsMaterial = (opacity = 1) =>
  new ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
    uniforms: { uOpacity: { value: opacity }, uDays: { value: 0 }, uPx: { value: Math.min(devicePixelRatio, 2) }, uWorld: { value: 0 }, uHalfH: { value: 400 } },
    vertexShader: /* glsl */ `
      attribute vec3 color; attribute float size; attribute float aSpeed;
      uniform float uDays, uPx, uWorld, uHalfH;
      varying vec3 vColor; varying float vSize; varying float vFade;
      void main() {
        vSize = size;
        float a = aSpeed * uDays; float c = cos(a), s = sin(a);
        vec3 p = vec3(c * position.x + s * position.z, position.y, -s * position.x + c * position.z);
        vColor = color;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_Position = projectionMatrix * mv;
        float px = size;
        vFade = 1.0;
        if (uWorld > 0.0) {
          px = size * uWorld * length(modelViewMatrix[0].xyz) * projectionMatrix[1][1] * uHalfH / -mv.z;
          vFade = min(px * px, 1.0);
          px = clamp(px, 1.0, 4.0);
        }
        gl_PointSize = px * uPx;
      }`,
    fragmentShader: /* glsl */ `
      uniform float uOpacity; varying vec3 vColor; varying float vSize; varying float vFade;
      void main() {
        vec2 d = abs(gl_PointCoord - 0.5) * 2.0;
        float r = length(d);
        float a = exp(-r * r * 5.0) * (1.0 - smoothstep(0.85, 1.0, r));
        // faint diffraction spikes on the biggest (brightest) points only
        if (vSize > 8.0) a += smoothstep(8.0, 12.0, vSize) * 0.5 * (exp(-d.x * 24.0) + exp(-d.y * 24.0)) * (1.0 - r * 0.9);
        gl_FragColor = vec4(vColor, a * vFade * uOpacity);
      }`,
  });

export interface EarthMaps { day: Texture; night: Texture; clouds: Texture; spec: Texture; normal: Texture }

/**
 * Earth: day map with terrain relief (normal map) and ocean sun glint (specular mask), drifting
 * clouds, city lights on the night side (dimmed under cloud), a warm band along the terminator,
 * all lit by the real Sun direction.
 */
export const earthMaterial = ({ day, night, clouds, spec, normal }: EarthMaps) =>
  new ShaderMaterial({
    uniforms: {
      day: { value: day }, night: { value: night }, clouds: { value: clouds }, spec: { value: spec }, normalMap: { value: normal },
      sunDir: { value: new Vector3(1, 0, 0) }, uTime: clock, uOpacity: { value: 1 },
    },
    transparent: true,
    vertexShader: /* glsl */ `
      varying vec2 vUv; varying vec3 vN; varying vec3 vT; varying vec3 vB; varying vec3 vW;
      void main() {
        vUv = uv;
        // sphere tangent frame: east follows +u, north follows +v
        vec3 t = normalize(vec3(normal.z, 0.0, -normal.x) + vec3(1e-6, 0.0, 0.0));
        mat3 m = mat3(modelMatrix);
        vN = normalize(m * normal); vT = normalize(m * t); vB = cross(vN, vT);
        vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz;
        gl_Position = projectionMatrix * viewMatrix * w;
      }`,
    fragmentShader: /* glsl */ `
      uniform sampler2D day, night, clouds, spec, normalMap; uniform vec3 sunDir; uniform float uTime, uOpacity;
      varying vec2 vUv; varying vec3 vN; varying vec3 vT; varying vec3 vB; varying vec3 vW;
      void main() {
        vec3 n0 = normalize(vN);
        vec3 nm = texture2D(normalMap, vUv).xyz * 2.0 - 1.0;
        vec3 n = normalize(normalize(vT) * nm.x + normalize(vB) * nm.y + n0 * nm.z);
        vec3 V = normalize(cameraPosition - vW);
        float l0 = dot(n0, sunDir);            // terminator from the smooth sphere
        float l = dot(n, sunDir);              // relief shading
        float c = texture2D(clouds, vUv + vec2(uTime * 0.00025, 0.0)).r;
        float water = texture2D(spec, vUv).r;

        vec3 col = texture2D(day, vUv).rgb * max(l, 0.0) * 1.3;
        vec3 H = normalize(sunDir + V);
        float nh = max(dot(n0, H), 0.0);
        col += (vec3(1.0, 0.93, 0.8) * pow(nh, 600.0) * 0.9 + vec3(0.25, 0.4, 0.6) * pow(nh, 30.0) * 0.18) * water * (1.0 - c) * step(0.0, l0);
        col = mix(col, vec3(max(l0, 0.0) * 1.05 + 0.015), c * 0.9);
        col *= mix(vec3(1.0, 0.62, 0.4), vec3(1.0), smoothstep(0.0, 0.3, l0)); // sunlight reddens near the terminator

        vec3 lights = texture2D(night, vUv).rgb * vec3(1.0, 0.8, 0.55) * 0.95 * (1.0 - c * 0.85);
        col = mix(lights, col, smoothstep(-0.12, 0.12, l0));
        float rim = pow(clamp(1.0 - dot(n0, V), 0.0, 1.0), 3.0);
        col += vec3(0.3, 0.55, 1.0) * rim * smoothstep(-0.3, 0.4, l0) * 0.9;
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
    vertexShader: SPHERE_VERT,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor; uniform float uOpacity; varying vec3 vN; varying vec3 vW;
      void main() {
        // clamp: rounding can push |dot| a hair past 1, and pow() of a negative is NaN on GPUs,
        // which bloom then smears into black squares
        float f = clamp(1.0 - abs(dot(normalize(vN), normalize(cameraPosition - vW))), 0.0, 1.0);
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
  float fbm(vec3 p) { float a = 0.5, s = 0.0; for (int i = 0; i < 4; i++) { s += a * noise(p); p *= 2.03; a *= 0.5; } return s; }`;

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
        float fr = pow(clamp(1.0 - dot(N, V), 0.0, 1.0), 3.0);
        col = col * (max(l, 0.0) * 1.15 + 0.015) + mix(c2, vec3(0.6, 0.8, 1.0), 0.4) * rim * fr * smoothstep(-0.25, 0.5, l);
        gl_FragColor = vec4(col, uOpacity);
      }`,
  });

/**
 * The Sun (or any star, given its granulation colors): churning granulation, limb darkening,
 * pushed past 1.0 so bloom catches it.
 */
export const sunMaterial = (dark: [number, number, number] = [1, 0.42, 0.08], light: [number, number, number] = [1, 0.92, 0.65]) =>
  new ShaderMaterial({
    transparent: true,
    uniforms: { uTime: clock, uOpacity: { value: 1 }, cDark: { value: new Vector3(...dark) }, cLight: { value: new Vector3(...light) } },
    vertexShader: SPHERE_VERT,
    fragmentShader: /* glsl */ `
      uniform float uTime, uOpacity; uniform vec3 cDark, cLight; varying vec3 vP; varying vec3 vN; varying vec3 vW;
      ${NOISE}
      void main() {
        float g = fbm(vP * 7.0 + vec3(0.0, uTime * 0.04, uTime * 0.03));
        float s = fbm(vP * 2.5 - uTime * 0.01);
        vec3 col = mix(cDark, cLight, smoothstep(0.25, 0.75, g));
        col *= 0.75 + 0.5 * s;
        float mu = clamp(dot(normalize(vN), normalize(cameraPosition - vW)), 0.0, 1.0);
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
    uniforms: { uOpacity: { value: 1 } },
    vertexShader: /* glsl */ `
      varying float vR;
      void main() {
        vR = length(position.xy);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: /* glsl */ `
      uniform float uOpacity; varying float vR;
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
