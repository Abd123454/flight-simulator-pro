# ✈️ Flight Simulator Pro

A lightweight, arcade-style browser flight simulator built with **Next.js 16**, **Three.js**, and **TypeScript**. 100% procedural — zero external assets, runs on integrated graphics. Supports keyboard and Xbox/PlayStation gamepads.

> **Honest scope:** This is an arcade/semi-realistic browser flight sim, NOT a competitor to Microsoft Flight Simulator. It's a single-developer project inspired by Ace Combat (aircraft selection), War Thunder (varied flight models), and browser flight sims like GeoFS.

## Features

### 4 Playable Aircraft
Each with distinct physics, control feel, and 3D model:
- **Skyliner 737** — Commercial airliner (stable, forgiving, reverse thrust)
- **Falcon F-16** — Multirole fighter with afterburner
- **Acro Extra 300** — Aerobatic stunt plane (extreme roll rate)
- **Heavy C-130** — Military cargo (4 turboprops, T-tail)

### 4 Mission Types
- **Free Flight** — Explore with no objectives
- **Canyon Sprint** — Race through 8 aerial gates
- **Landing Challenge** — Precision ILS approach & landing
- **Target Practice** — Destroy 5 ground targets

### Flight Physics
- Blade-element aerodynamics (CL/CD vs angle of attack)
- Stability derivatives: weathervaning, dihedral, pitch/roll/yaw damping
- Ground effect, sideslip (β), stall modeling
- Flaps, spoilers, reverse thrust, afterburner
- Dynamic wind affecting flight

### Controls
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
| Pause | Esc | Start |

### HUD
Compass tape, altimeter tape, attitude indicator, ILS indicator, radar minimap, mission status (gates/targets/score/combo), wind direction, stall warning, G-force.

## Tech Stack

- **Framework**: Next.js 16 (App Router, Turbopack)
- **3D**: Three.js + procedural geometry (no external models/textures)
- **Audio**: Web Audio API (procedural engine/wind)
- **Styling**: Tailwind CSS 4 + 2 shadcn/ui components (button, slider)

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
├── missions.ts             # Mission definitions
├── weather.ts              # Dynamic wind
├── textures.ts             # Procedural Canvas2D textures
└── engine/
    ├── FlightEngine.ts     # Main loop
    ├── Airplane.ts         # Multi-type aircraft models
    ├── Airport.ts          # Runway, terminal, lights, PAPI
    ├── Environment.ts      # Sky, sun, terrain, clouds
    ├── CameraController.ts # Chase/cockpit/tower
    ├── InputController.ts  # Keyboard + Gamepad
    └── AudioEngine.ts      # Procedural audio

src/components/flight-sim/
├── FlightSimulator.tsx     # Root component
├── Hud.tsx                 # In-flight HUD
├── AircraftSelect.tsx      # Aircraft + mission selection
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

## License

MIT
