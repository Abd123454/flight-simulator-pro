// Mission system — inspired by Ace Combat missions and MSFS challenges.
// Mission types: free flight, waypoint race, landing challenge, target practice.

export type MissionType = 'freeflight' | 'race' | 'landing' | 'combat' | 'crosscountry' | 'storm'

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

  // Cross-country: navigate from main airport to the north airport (5000m away)
  crosscountry: {
    type: 'crosscountry',
    name: 'Cross Country',
    description: 'Navigate 5km north to Northfield Airport and land there.',
    brief: 'Fly north through the navigation waypoints to reach Northfield Airport, then land on its runway. The mission completes when you touch down and slow below 30 km/h on the Northfield runway.',
    waypoints: [
      { id: 1, position: { x: 0, y: 500, z: 0 }, reached: false, radius: 100 },
      { id: 2, position: { x: 0, y: 600, z: -1500 }, reached: false, radius: 100 },
      { id: 3, position: { x: 0, y: 700, z: -3000 }, reached: false, radius: 100 },
      { id: 4, position: { x: 0, y: 500, z: -4500 }, reached: false, radius: 100 },
      { id: 5, position: { x: 0, y: 100, z: -5500 }, reached: false, radius: 80 },
    ],
    timeLimit: 300,
    spawnPosition: { x: 0, y: 200, z: 1200 },
    spawnHeading: 0,
    rewardXP: 500,
  },

  // Storm flight: fly in severe weather conditions
  storm: {
    type: 'storm',
    name: 'Storm Runner',
    description: 'Fly through a severe storm, reach the landing site, and land.',
    brief: 'A severe storm has hit the region. Visibility is dangerously low and gusts are strong. Navigate through the waypoints and land on the main runway. The mission completes on touchdown below 30 km/h. Only for experienced pilots!',
    waypoints: [
      { id: 1, position: { x: 0, y: 300, z: 800 }, reached: false, radius: 80 },
      { id: 2, position: { x: -200, y: 350, z: 0 }, reached: false, radius: 80 },
      { id: 3, position: { x: 200, y: 400, z: -800 }, reached: false, radius: 80 },
      { id: 4, position: { x: 0, y: 200, z: -1400 }, reached: false, radius: 80 },
    ],
    timeLimit: 200,
    spawnPosition: { x: 0, y: 300, z: 1400 },
    spawnHeading: 0,
    rewardXP: 600,
  },
}

export const MISSION_LIST = Object.values(MISSIONS)

/** Campaign structure — missions unlock sequentially as you complete them.
 * Free Flight is always available. */
export interface CampaignNode {
  missionKey: string
  requires: string[] // mission keys that must be completed first
  stars: number // difficulty (1-3)
}

export const CAMPAIGN: CampaignNode[] = [
  { missionKey: 'freeflight', requires: [], stars: 0 },
  { missionKey: 'landing', requires: ['freeflight'], stars: 1 },
  { missionKey: 'race1', requires: ['freeflight'], stars: 1 },
  { missionKey: 'crosscountry', requires: ['landing', 'race1'], stars: 2 },
  { missionKey: 'combat', requires: ['crosscountry'], stars: 2 },
  { missionKey: 'storm', requires: ['combat', 'crosscountry'], stars: 3 },
]

/** Check which campaign missions are unlocked given completed mission keys. */
export function getUnlockedMissions(completed: Set<string>): string[] {
  return CAMPAIGN.filter((node) =>
    node.requires.every((req) => completed.has(req))
  ).map((node) => node.missionKey)
}

export function createMissionState(mission: MissionConfig): MissionConfig {
  return {
    ...mission,
    waypoints: mission.waypoints?.map((w) => ({ ...w, reached: false })),
    targets: mission.targets?.map((t) => ({ ...t, destroyed: false })),
  }
}
