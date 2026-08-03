// Mission system — inspired by Ace Combat missions and MSFS challenges.
// Mission types: free flight, waypoint race, landing challenge, target practice.

export type MissionType = 'freeflight' | 'race' | 'landing' | 'combat'

export interface Waypoint {
  id: number
  position: { x: number; y: number; z: number }
  reached: boolean
  radius: number // meters — how close you must be to "reach" it
}

export interface Target {
  id: number
  position: { x: number; y: number; z: number }
  destroyed: boolean
  health: number
}

export interface MissionConfig {
  type: MissionType
  name: string
  description: string
  brief: string
  // objectives
  waypoints?: Waypoint[]
  targets?: Target[]
  // success criteria
  timeLimit?: number // seconds
  requiredAltitude?: number // must stay above this
  // scoring
  parTime?: number // target time for 3 stars
  // spawn
  spawnPosition: { x: number; y: number; z: number }
  spawnHeading: number // radians
  // rewards
  rewardXP: number
}

export const MISSIONS: Record<string, MissionConfig> = {
  freeflight: {
    type: 'freeflight',
    name: 'Free Flight',
    description: 'Explore the skies freely. No objectives — just fly.',
    brief: 'Welcome, pilot. Take off and enjoy the freedom of the sky. Practice maneuvers, test your aircraft, and return safely when ready.',
    spawnPosition: { x: 0, y: 3.2, z: 1400 },
    spawnHeading: 0,
    rewardXP: 100,
  },

  race1: {
    type: 'race',
    name: 'Canyon Sprint',
    description: 'Race through 8 aerial gates as fast as possible.',
    brief: 'Navigate through the floating gates in order. Each gate turns green when passed. Fastest time wins 3 stars!',
    waypoints: [
      { id: 1, position: { x: 0, y: 200, z: 800 }, reached: false, radius: 60 },
      { id: 2, position: { x: 300, y: 250, z: 200 }, reached: false, radius: 60 },
      { id: 3, position: { x: 500, y: 300, z: -500 }, reached: false, radius: 60 },
      { id: 4, position: { x: 300, y: 350, z: -1100 }, reached: false, radius: 60 },
      { id: 5, position: { x: -100, y: 400, z: -1400 }, reached: false, radius: 60 },
      { id: 6, position: { x: -500, y: 350, z: -1000 }, reached: false, radius: 60 },
      { id: 7, position: { x: -600, y: 300, z: -300 }, reached: false, radius: 60 },
      { id: 8, position: { x: -300, y: 250, z: 500 }, reached: false, radius: 60 },
    ],
    parTime: 90,
    spawnPosition: { x: 0, y: 200, z: 1100 },
    spawnHeading: 0,
    rewardXP: 300,
  },

  landing: {
    type: 'landing',
    name: 'Landing Challenge',
    description: 'Approach and land smoothly on runway 36.',
    brief: 'You are on final approach to runway 36. Align with the centerline, maintain 3° glideslope (~75 m/s), and touch down gently. Vertical speed must be under 2 m/s for a perfect landing.',
    waypoints: [
      { id: 1, position: { x: 0, y: 300, z: 1000 }, reached: false, radius: 100 },
      { id: 2, position: { x: 0, y: 150, z: 500 }, reached: false, radius: 80 },
      { id: 3, position: { x: 0, y: 50, z: 0 }, reached: false, radius: 60 },
    ],
    timeLimit: 120,
    spawnPosition: { x: 0, y: 300, z: 1500 },
    spawnHeading: 0,
    rewardXP: 250,
  },

  combat: {
    type: 'combat',
    name: 'Target Practice',
    description: 'Destroy 5 ground targets by flying through them.',
    brief: 'Five enemy targets are scattered around the airport. Fly through each target to destroy it. Destroy all 5 to complete the mission!',
    targets: [
      { id: 1, position: { x: 200, y: 30, z: -200 }, destroyed: false, health: 1 },
      { id: 2, position: { x: -300, y: 30, z: -600 }, destroyed: false, health: 1 },
      { id: 3, position: { x: 500, y: 30, z: 300 }, destroyed: false, health: 1 },
      { id: 4, position: { x: -500, y: 30, z: 500 }, destroyed: false, health: 1 },
      { id: 5, position: { x: 0, y: 30, z: -1000 }, destroyed: false, health: 1 },
    ],
    timeLimit: 180,
    spawnPosition: { x: 0, y: 300, z: 1200 },
    spawnHeading: 0,
    rewardXP: 400,
  },
}

export const MISSION_LIST = Object.values(MISSIONS)

export function createMissionState(mission: MissionConfig): MissionConfig {
  // deep clone with fresh reached/destroyed flags
  return {
    ...mission,
    waypoints: mission.waypoints?.map((w) => ({ ...w, reached: false })),
    targets: mission.targets?.map((t) => ({ ...t, destroyed: false })),
  }
}
