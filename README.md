# Lightyear

A zoomable map of the universe. It opens on Earth and zooms out through the solar system, nearby stars, the Milky Way and the Local Group to the cosmic web at the edge of the observable universe. The solar system is live: planets, the Moon and the Sun sit at their real positions for the current date and time, and you can move time with a slider.

## Setup

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # type-check + production build into dist/
npm test         # coordinate-frame and scale-bar checks (Node 22+)
```

## Controls

| Action | Mouse / trackpad | Touch |
| --- | --- | --- |
| Zoom | Scroll wheel, or pinch on a trackpad | Pinch |
| Rotate | Drag | One-finger drag |
| Select | Click an object or its label | Tap |
| Zoom by keyboard | `+` / `-` | — |
| Close the info card | `Esc` | ✕ button |

Other ways to move around: the layer list jumps to each scale, the search box flies to any named object, and **Fly to** on an info card goes to that object.

## How it works

- **Log-scale zoom.** The camera state is `logD = log10(distance to focus in meters)`, which runs from about 10^6.9 m (Earth) to 10^27 m (the observable universe).
- **Floating origin.** World positions are float64 meters, heliocentric, with the ecliptic lying on the XZ plane. Each layer draws in its own local unit (AU, pc, kpc or Mpc) inside a `Space` group. Every frame that group is re-scaled and shifted so the focused object sits at the origin and the camera stays 10 units away. The numbers sent to the GPU therefore stay small at every scale, and nothing jitters.
- **Layers.** There is one component per layer in `src/layers/`. Each layer has a trapezoid fade window over `logD` (`src/data/layers.ts`), so neighbouring layers cross-fade instead of cutting.
- **Readable vs true scale.** In readable mode a body is drawn no smaller than a fixed fraction of the camera distance. In true scale it is drawn at its real radius.
- **Performance.** Every star, particle and galaxy cloud is a single `THREE.Points` draw call. The asteroid belt orbits in the vertex shader. A layer that has faded out is skipped entirely.

## Project layout

```
src/
  data/        typed object data: layers, solar system, stars (HYG), deep sky
  lib/         coordinate frames, scale/distance formatting, star physics (+ tests)
  scene/       rig (zoom, fly-to, clock), floating-origin Space, labels, shaders
  layers/      one component per zoom layer
  ui/          HUD (search, layer list, scale bar, scale toggle), info card, time bar
  catalog.ts   every searchable object with a live position function
  store.ts     Zustand app state (zoom, focus, sim time, selection)
scripts/build-stars.mjs   trims the HYG CSV into src/data/stars.json
```

## Data sources

- **[astronomy-engine](https://github.com/cosinekitty/astronomy)** (MIT) provides the heliocentric positions of the planets, Pluto and the Moon, the Moon's geocentric orbit, and Greenwich sidereal time for Earth's rotation.
- **[HYG star database v4.1](https://github.com/astronexus/HYG-Database)** (CC BY-SA 4.0) supplies the stars. The bundled file holds the 1,000 nearest stars plus bright named stars out to Deneb. To regenerate it: `node scripts/build-stars.mjs hygdata_v41.csv > src/data/stars.json`.
- **Earth and Moon textures** come from the [three.js examples](https://github.com/mrdoob/three.js/tree/dev/examples/textures/planets) (MIT).
- **Galaxy positions** (Andromeda, Triangulum, the Magellanic Clouds), cluster positions and other figures are rounded published values, with references on Wikipedia. Voyager positions are extrapolated linearly from their 2024 distances.
- **Planet surfaces** (other than Earth and the Moon), the Sun's granulation and Saturn's rings are procedural shaders tinted to each body's real colors.
- **Procedural parts.** The Milky Way's spiral, the galaxy particle clouds, the Oort cloud and the cosmic-web filaments are generated procedurally. They are representative structures, not real maps.

## Deploying

`npm run build` outputs a static site in `dist/` with relative paths, so it works from any subpath. The included workflow (`.github/workflows/deploy.yml`) builds and publishes to GitHub Pages. Under **Settings → Pages → Source**, choose **GitHub Actions**. Don't serve the repository root directly: the source `index.html` loads TypeScript that browsers can't run, so the page stays blank.
