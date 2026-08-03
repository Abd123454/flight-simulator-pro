# ✈️ Flight Simulator Pro

A lightweight, arcade-style browser flight simulator built with **Next.js 16**, **Three.js**, and **TypeScript**. Runs on integrated graphics. Supports keyboard and Xbox/PlayStation gamepads.

> **Honest scope:** This is an arcade/semi-realistic browser flight sim, NOT a competitor to Microsoft Flight Simulator. It's a single-developer project inspired by Ace Combat (aircraft selection), War Thunder (varied flight models), and browser flight sims like GeoFS.

## Features

### 4 Playable Aircraft
Each with distinct physics, control feel, and 3D model (all procedural geometry):
- **Skyliner 737** — Commercial airliner (stable, forgiving, reverse thrust)
- **Falcon F-16** — Multirole fighter with afterburner
- **Acro Extra 300** — Aerobatic stunt plane (high roll rate, deliberately reduced from the real 400°/s for keyboard playability)
- **Heavy C-130** — Military cargo (4 turboprops, T-tail)

### 6 Mission Types (Campaign with Unlocks)
Missions unlock sequentially as you complete them:
- **Free Flight** — Explore with no objectives (always available)
- **Landing Challenge** — Precision ILS approach & landing (★)
- **Canyon Sprint** — Race through 8 aerial gates (★)
- **Cross Country** — Navigate 5km north to Northfield Airport and land there (★★)
- **Target Practice** — Destroy 5 ground targets by flying through them (★★)
- **Storm Runner** — Fly in forced storm conditions through waypoints, then land (★★★)

### Flight Physics
- Blade-element aerodynamics (CL/CD vs angle of attack)
- Stability derivatives: weathervaning, dihedral, pitch/roll/yaw damping
- Ground effect, sideslip (β), stall modeling
- Flaps, spoilers, reverse thrust, afterburner
- Real aircraft specs sourced from manufacturer/FAA data (see `aircraft-config.ts`)

### Dynamic Weather System
- **4 conditions**: clear, cloudy, rain, storm (keys 1-4 to cycle)
- Variable fog density affecting visibility
- Wind gusts (random sharp spikes, more frequent in storms)
- Rain particle system (800 droplets that drift with wind)
- Sky/sun color and intensity change with weather
- **Live weather mode** (optional): fetches real current wind/visibility for 5 real airports (KJFK, KLAX, EGLL, OMDB, VHHH) via the free Open-Meteo API (no API key required)

### Autopilot
- Heading hold + altitude hold (P key to toggle)
- Captures current heading/altitude on engage
- Auto-disengages on manual pilot input

### Procedural Terrain
- 128×128 heightmap (single draw call)
- Layered value noise for hills/valleys
- **Real elevation profile**: distant terrain is biased by a real fetched elevation grid (Denver Intl area, via Open-Elevation API) — not pure arbitrary noise
- Flat zone near airports so runways stay level

### Two Airports
- **Main airport**: full runway with baked markings, taxiway, terminal, control tower, hangar, PAPI lights, approach lights, windsock
- **Northfield Airport**: simplified second airport 5km north (destination for Cross Country mission)

### Achievements System (12 achievements)
- Persisted to localStorage across sessions
- Stats tracked: total score, missions completed, flight time, best landing
- Achievements screen accessible from main menu
- New achievements shown on mission end screen
- Examples: First Flight, Greaser (soft landing), Storm Chaser, Ace Pilot

### HUD
- Compass tape, altimeter tape, attitude indicator
- ILS indicator (localizer + glidescope) for approach guidance
- Radar minimap with wind direction
- Mission status bar (gates/targets/timer/score/combo)
- Weather indicator (with LIVE badge when using real data)
- Stall warning, G-force, VSI readouts
- Autopilot target display

### 3 Camera Views
- **Chase** — smooth follow with speed-based damping
- **Cockpit** — pilot eye position
- **Tower** — static airport view

### Performance Optimizations
- **LOD culling**: distant objects (e.g. Northfield) hidden beyond 4km
- Pixel ratio capped at 1.0
- Single shadow-casting light (1024 map)
- Instanced runway/approach lights (1 draw call per color)
- Procedural textures ≤ 1024px
- No MSAA/post-processing/SSAO/SSR
- Two-layer procedural engine audio (rumble + turbine whine via Web Audio API)

## Controls

**Keyboard** and **Gamepad** (Xbox/PlayStation via Gamepad API):

| Input | Keyboard | Gamepad |
|-------|----------|---------|
| Pitch | W/S | Left stick Y |
| Roll | A/D | Left stick X |
| Yaw | Q/E | Right stick X |
| Throttle | Shift/Ctrl | RT/LT triggers |
| Brake | Space | A button |
| Gear | G | B button |
| Camera | C | X button |
| Flaps | F/V | Y / LB |
| Spoilers | B | RB |
| Weather cycle | 1-4 | — |
| Autopilot | P | — |
| Pause | Esc | Start |

## Tech Stack

- **Framework**: Next.js 16 (App Router, Turbopack)
- **3D**: Three.js + procedural geometry
- **Audio**: Web Audio API (two-layer procedural engine sound)
- **Styling**: Tailwind CSS 4 + 2 shadcn/ui components (button, slider)
- **Live data**: Open-Meteo (weather, free, no API key), Open-Elevation (terrain, free)

## Design Decision: 100% Procedural Assets

This project uses **only procedural geometry and textures** — no external 3D model files (`.glb`/`.gltf`) or image textures are bundled. This was a deliberate choice:

1. **Licensing verification problem**: The audit attempted to integrate CC0/CC-BY models from Sketchfab, but the site's scraped HTML gave inconsistent license metadata (CC0 in the page title vs "CC Attribution" in structured data for the same model). Reliable license verification required manual browser inspection, which wasn't possible in the development environment.
2. **Performance**: Procedural geometry keeps the bundle tiny and loads instantly — important for a browser game targeting integrated graphics.
3. **Simplicity**: No build-time asset pipeline, no asset loading wait, no model format conversion.

All aircraft, airports, terrain, and textures are generated from code at runtime. Real-world *data* (aircraft specs, elevation profiles, live weather) is sourced from APIs and embedded as numbers, but no binary art assets are used.

## Getting Started

```bash
bun install
bun run dev
# Open http://localhost:3000
```

## Architecture

```
src/lib/flight-sim/
├── physics.ts              # Blade-element flight model + stability
├── aircraft-config.ts      # 4 aircraft configurations
├── missions.ts             # 6 missions + campaign unlock structure
├── weather.ts              # Dynamic weather (4 conditions + gusts + live mode)
├── live-weather.ts         # Open-Meteo integration (real wind/visibility)
├── achievements.ts         # 12 achievements + localStorage progress
├── textures.ts             # Procedural Canvas2D textures
└── engine/
    ├── FlightEngine.ts     # Main loop
    ├── Airplane.ts         # Multi-type aircraft models (procedural)
    ├── Airport.ts          # Main airport + Northfield
    ├── Environment.ts      # Sky, sun, terrain (real elevation), clouds, rain
    ├── CameraController.ts # Chase/cockpit/tower
    ├── InputController.ts  # Keyboard + Gamepad
    ├── AudioEngine.ts      # Two-layer procedural engine audio
    └── LODCuller.ts        # Distance-based visibility culling

src/components/flight-sim/
├── FlightSimulator.tsx     # Root component
├── Hud.tsx                 # In-flight HUD
├── AircraftSelect.tsx      # Aircraft + mission + live-weather selection
├── AchievementsScreen.tsx  # Achievements + stats
├── Menus.tsx               # Main/pause/end screens
└── *.tsx                   # Canvas-based instruments
```

## Performance

Optimized for integrated graphics (Intel HD 630 class):
- Pixel ratio capped at 1.0
- Single shadow-casting light
- Instanced runway lights
- Procedural textures ≤ 1024px
- No MSAA/post-processing
- LOD culling for distant objects

## License

MIT
