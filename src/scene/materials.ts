import { AdditiveBlending, BackSide, Color, ShaderMaterial, type Texture } from 'three';

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
      varying vec3 vColor;
      void main() {
        float a = aSpeed * uDays; float c = cos(a), s = sin(a);
        vec3 p = vec3(c * position.x + s * position.z, position.y, -s * position.x + c * position.z);
        vColor = color;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
        gl_PointSize = size * uPx;
      }`,
    fragmentShader: /* glsl */ `
      uniform float uOpacity; varying vec3 vColor;
      void main() {
        float r = length(gl_PointCoord - 0.5) * 2.0;
        float a = exp(-r * r * 5.0) * (1.0 - smoothstep(0.85, 1.0, r));
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
