// Aircraft configurations — multiple aircraft types inspired by
// Ace Combat (aircraft selection) and War Thunder (varied flight models).
// Each aircraft has distinct physics, role, and visual scale.

export type AircraftType = 'airliner' | 'fighter' | 'stunt' | 'cargo'

export interface AircraftConfig {
  type: AircraftType
  name: string
  role: string
  description: string
  // Physics tuning
  mass: number // kg
  wingArea: number // m^2
  maxThrust: number // N
  reverseThrust: number // N
  cl0: number
  clAlpha: number // per degree
  clMax: number
  cd0: number
  inducedK: number
  stallAoA: number // degrees
  // control authority (rad/s)
  pitchRate: number
  rollRate: number
  yawRate: number
  // performance
  maxSpeed: number // m/s
  rotationSpeed: number // m/s (Vr)
  takeoffSpeed: number // m/s (V2)
  // visuals
  scale: number
  color: number
  hasAfterburner: boolean
  // stats for UI (0-10 scale)
  stats: {
    speed: number
    maneuverability: number
    stability: number
    durability: number
  }
}

export const AIRCRAFT: Record<AircraftType, AircraftConfig> = {
  // Boeing 737-800 — stable airliner, slow but predictable
  airliner: {
    type: 'airliner',
    name: 'Skyliner 737',
    role: 'Commercial Airliner',
    description: 'Stable twin-engine jet. Great for learning — forgiving flight model with gentle controls.',
    mass: 65000,
    wingArea: 124.6,
    maxThrust: 600_000,
    reverseThrust: 200_000,
    cl0: 0.25,
    clAlpha: 0.11,
    clMax: 2.0,
    cd0: 0.022,
    inducedK: 0.045,
    stallAoA: 15,
    pitchRate: 0.15,
    rollRate: 0.6,
    yawRate: 0.12,
    maxSpeed: 250,
    rotationSpeed: 70,
    takeoffSpeed: 78,
    scale: 1.0,
    color: 0xeef1f5,
    hasAfterburner: false,
    stats: { speed: 5, maneuverability: 3, stability: 9, durability: 8 },
  },

  // F-16-style fighter — fast, agile, afterburner
  fighter: {
    type: 'fighter',
    name: 'Falcon F-16',
    role: 'Multirole Fighter',
    description: 'High-performance fighter jet with afterburner. Extremely agile — requires precise inputs.',
    mass: 12000,
    wingArea: 27.87,
    maxThrust: 380_000, // 76kN dry × 2 + afterburner boost
    reverseThrust: 0, // no reverse thrust
    cl0: 0.2,
    clAlpha: 0.12,
    clMax: 1.8,
    cd0: 0.018,
    inducedK: 0.08,
    stallAoA: 25, // high AoA capability
    pitchRate: 0.5,
    rollRate: 2.5,
    yawRate: 0.3,
    maxSpeed: 550,
    rotationSpeed: 60,
    takeoffSpeed: 70,
    scale: 0.45,
    color: 0x6b7280,
    hasAfterburner: true,
    stats: { speed: 10, maneuverability: 10, stability: 4, durability: 5 },
  },

  // Stunt/acro plane — extra maneuverable, low speed
  stunt: {
    type: 'stunt',
    name: 'Acro Extra 300',
    role: 'Aerobatic Stunt Plane',
    description: 'Purpose-built aerobatic aircraft. Insane roll rate — perfect for stunts and racing.',
    mass: 950,
    wingArea: 10.4,
    maxThrust: 40_000,
    reverseThrust: 0,
    cl0: 0.3,
    clAlpha: 0.11,
    clMax: 2.2,
    cd0: 0.03,
    inducedK: 0.05,
    stallAoA: 18,
    pitchRate: 0.8,
    rollRate: 4.0,
    yawRate: 0.5,
    maxSpeed: 120,
    rotationSpeed: 25,
    takeoffSpeed: 30,
    scale: 0.35,
    color: 0xef4444,
    hasAfterburner: false,
    stats: { speed: 4, maneuverability: 10, stability: 6, durability: 4 },
  },

  // Cargo plane — heavy, slow, powerful
  cargo: {
    type: 'cargo',
    name: 'Heavy C-130',
    role: 'Military Cargo',
    description: 'Four-engine turboprop. Heavy and powerful — long takeoff roll, stable cruise.',
    mass: 70000,
    wingArea: 162.0,
    maxThrust: 500_000,
    reverseThrust: 250_000,
    cl0: 0.3,
    clAlpha: 0.1,
    clMax: 2.4,
    cd0: 0.025,
    inducedK: 0.04,
    stallAoA: 16,
    pitchRate: 0.1,
    rollRate: 0.35,
    yawRate: 0.1,
    maxSpeed: 180,
    rotationSpeed: 55,
    takeoffSpeed: 65,
    scale: 1.15,
    color: 0x4a5568,
    hasAfterburner: false,
    stats: { speed: 4, maneuverability: 2, stability: 8, durability: 10 },
  },
}

export const AIRCRAFT_LIST = Object.values(AIRCRAFT)
