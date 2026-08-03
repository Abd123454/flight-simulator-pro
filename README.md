# ✈️ Flight Simulator Pro

A browser-based, multi-aircraft flight simulator built with **Next.js 16**, **Three.js**, and **TypeScript** — inspired by Ace Combat, War Thunder, and Microsoft Flight Simulator. Runs entirely in the browser via WebGL, optimized for integrated graphics.

![Tech](https://img.shields.io/badge/Next.js-16-black) ![Tech](https://img.shields.io/badge/Three.js-0.185-white) ![Tech](https://img.shields.io/badge/TypeScript-5-blue)

## Features

### 4 Playable Aircraft
Each with distinct physics, control feel, and 3D model:
- **Skyliner 737** — Commercial airliner (stable, forgiving)
- **Falcon F-16** — Multirole fighter with afterburner
- **Acro Extra 300** — Aerobatic stunt plane (extreme roll rate)
- **Heavy C-130** — Military cargo (4 turboprops, T-tail)

### 4 Mission Types
- **Free Flight** — Explore the skies with no objectives
- **Canyon Sprint** — Race through 8 aerial gates against the clock
- **Landing Challenge** — Precision approach & landing on runway 36
- **Target Practice** — Destroy 5 ground targets by flying through them

### Realistic Flight Physics
- Blade-element aerodynamics (lift, drag, thrust, gravity)
- **Stability derivatives**: weathervaning, dihedral effect, pitch/roll/yaw damping
- **Ground effect** near the runway
- **Sideslip (β)** modeling with yaw damper
- **Flaps, spoilers, reverse thrust, afterburner**
- Dynamic weather with variable wind affecting flight

### Professional HUD
- Compass tape, altimeter tape, attitude indicator
- ILS indicator (localizer + glidescope) for approach guidance
- Mission status bar (gates, targets, timer, score, combo)
- Radar minimap with wind direction
- Stall warning, G-force, VSI readouts

### 3 Camera Views
- **Chase** — smooth follow with speed-based damping
- **Cockpit** — pilot eye position
- **Tower** — static airport view

### Full Airport
3km runway with baked markings, taxiways, terminal, control tower, hangar, PAPI lights, approach lights, animated windsock, and static gate aircraft.

## Controls

| Key | Action |
|-----|--------|
| `W` / `S` | Pitch (nose down / up) |
| `A` / `D` | Roll (left / right) |
| `Q` / `E` | Rudder (yaw) |
| `Shift` / `Ctrl` | Throttle up / down |
| `Space` | Brake |
| `G` | Toggle landing gear |
| `F` / `V` | Flaps extend / retract |
| `B` | Toggle spoilers |
| `X` | Toggle reverse thrust |
| `C` | Cycle camera |
| `Esc` | Pause |
| `F3` | Debug overlay |

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript 5
- **3D**: Three.js + custom procedural geometry (zero external assets)
- **Audio**: Web Audio API (procedural engine/wind, no sound files)
- **Styling**: Tailwind CSS 4 + shadcn/ui
- **Textures**: Canvas2D procedural (grass, runway markings, concrete)

## Getting Started

```bash
# Install dependencies
bun install

# Run dev server
bun run dev

# Open http://localhost:3000
```

## Architecture

```
src/lib/flight-sim/
├── physics.ts              # Blade-element flight model + stability derivatives
├── types.ts                # Shared FlightState / FlightControls types
├── aircraft-config.ts      # 4 aircraft configurations
├── missions.ts             # Mission definitions (waypoints, targets)
├── weather.ts              # Dynamic wind system
├── textures.ts             # Procedural Canvas2D textures
└── engine/
    ├── FlightEngine.ts     # Main loop: renderer, physics, HUD snapshots
    ├── Airplane.ts         # Procedural multi-type aircraft model
    ├── Airport.ts          # Runway, terminal, lights, PAPI
    ├── Environment.ts      # Sky, sun, terrain, clouds, fog
    ├── CameraController.ts # Chase/cockpit/tower cameras
    ├── InputController.ts  # Keyboard input
    └── AudioEngine.ts      # Procedural Web Audio

src/components/flight-sim/
├── FlightSimulator.tsx     # Root component + screen state
├── Hud.tsx                 # In-flight HUD overlay
├── AircraftSelect.tsx      # Aircraft + mission selection screen
├── Menus.tsx               # Main menu, pause, end screens
├── AttitudeIndicator.tsx   # Artificial horizon (canvas)
├── CompassTape.tsx         # Heading tape (canvas)
├── AltimeterTape.tsx       # Altitude tape (canvas)
└── Minimap.tsx             # Radar minimap (canvas)
```

## Performance

Optimized for integrated graphics (Intel HD 630 class):
- Pixel ratio capped at 1.0
- Single shadow-casting light (sun, 1024 map)
- Instanced runway/approach lights (1 draw call per color)
- Procedural textures ≤ 1024px
- No MSAA/post-processing/SSAO/SSR
- Fixed-timestep physics with carry-over for low-FPS stability

## License

MIT
