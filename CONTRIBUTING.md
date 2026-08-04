# Contributing to Flight Simulator Pro

## Development Setup
```bash
bun install
bun run dev
```

## Code Quality
- `bun run lint` — ESLint must pass with 0 errors
- `npx tsc --noEmit` — TypeScript must pass with 0 errors
- `bun run build` — Production build must succeed

## Architecture
- `src/lib/flight-sim/` — Game logic (physics, missions, weather, audio)
- `src/lib/flight-sim/engine/` — Three.js engine (renderer, scene, camera)
- `src/components/flight-sim/` — React UI components (HUD, menus, instruments)
- `public/models/` — GLB aircraft models (CC0/CC-BY from Poly Pizza)

## License
MIT — contributions must be MIT-compatible.
