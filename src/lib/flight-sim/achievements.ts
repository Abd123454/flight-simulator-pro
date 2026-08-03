// Achievements system — persisted to localStorage.
// Tracks player progress across sessions (missions completed, scores, etc).

export interface Achievement {
  id: string
  name: string
  description: string
  icon: string
  unlocked: boolean
  unlockedAt?: number
}

export interface PlayerProgress {
  totalScore: number
  missionsCompleted: number
  bestLandingVS: number // best (gentlest) vertical speed at touchdown, m/s (negative)
  totalFlightTime: number // seconds
  achievements: Achievement[]
}

const STORAGE_KEY = 'flight-sim-progress'

const DEFAULT_ACHIEVEMENTS: Achievement[] = [
  { id: 'first_flight', name: 'First Flight', description: 'Complete your first flight', icon: '✈', unlocked: false },
  { id: 'takeoff', name: 'Wheels Up', description: 'Successfully take off', icon: '🛫', unlocked: false },
  { id: 'soft_landing', name: 'Greaser', description: 'Land with vertical speed under 1 m/s', icon: '🛬', unlocked: false },
  { id: 'race_complete', name: 'Speed Demon', description: 'Complete the Canyon Sprint race', icon: '🏁', unlocked: false },
  { id: 'combat_complete', name: 'Sharpshooter', description: 'Destroy all 5 targets', icon: '🎯', unlocked: false },
  { id: 'landing_complete', name: 'Precision', description: 'Complete the Landing Challenge', icon: '🎖', unlocked: false },
  { id: 'storm_flyer', name: 'Storm Chaser', description: 'Fly in storm conditions', icon: '⛈', unlocked: false },
  { id: 'high_altitude', name: 'Top of the World', description: 'Reach 3000m altitude', icon: '🏔', unlocked: false },
  { id: 'score_1000', name: 'Centurion', description: 'Score 1000+ points in one mission', icon: '💯', unlocked: false },
  { id: 'score_5000', name: 'Ace Pilot', description: 'Score 5000+ points total', icon: '🏆', unlocked: false },
]

const DEFAULT_PROGRESS: PlayerProgress = {
  totalScore: 0,
  missionsCompleted: 0,
  bestLandingVS: 0,
  totalFlightTime: 0,
  achievements: DEFAULT_ACHIEVEMENTS,
}

/** Load progress from localStorage (client-side only). */
export function loadProgress(): PlayerProgress {
  if (typeof window === 'undefined') return DEFAULT_PROGRESS
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return DEFAULT_PROGRESS
    const data = JSON.parse(raw) as PlayerProgress
    // merge with defaults to handle new achievements added later
    return {
      ...DEFAULT_PROGRESS,
      ...data,
      achievements: DEFAULT_ACHIEVEMENTS.map((def) => {
        const saved = data.achievements?.find((a) => a.id === def.id)
        return saved ? { ...def, ...saved } : def
      }),
    }
  } catch {
    return DEFAULT_PROGRESS
  }
}

/** Save progress to localStorage. */
export function saveProgress(p: PlayerProgress): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(p))
  } catch {
    // ignore quota errors
  }
}

/** Record a completed mission and unlock relevant achievements.
 * Returns the list of newly-unlocked achievements. */
export function recordMissionResult(
  progress: PlayerProgress,
  result: {
    success: boolean
    score: number
    flightTime: number
    maxAltitude: number
    landingVS: number
    missionType: string
    weatherCondition: string
  }
): Achievement[] {
  const newlyUnlocked: Achievement[] = []
  const unlock = (id: string) => {
    const a = progress.achievements.find((x) => x.id === id)
    if (a && !a.unlocked) {
      a.unlocked = true
      a.unlockedAt = Date.now()
      newlyUnlocked.push(a)
    }
  }

  progress.totalScore += result.score
  progress.totalFlightTime += result.flightTime

  if (result.success) {
    progress.missionsCompleted += 1
    unlock('first_flight')
    if (result.missionType === 'race') unlock('race_complete')
    if (result.missionType === 'combat') unlock('combat_complete')
    if (result.missionType === 'landing') unlock('landing_complete')
    // soft landing: VS better (less negative) than -1 m/s
    if (result.landingVS > -1 && result.landingVS < 0) {
      unlock('soft_landing')
      if (progress.bestLandingVS === 0 || result.landingVS > progress.bestLandingVS) {
        progress.bestLandingVS = result.landingVS
      }
    }
  }

  if (result.maxAltitude >= 3000) unlock('high_altitude')
  if (result.weatherCondition === 'storm') unlock('storm_flyer')
  if (result.score >= 1000) unlock('score_1000')
  if (progress.totalScore >= 5000) unlock('score_5000')

  saveProgress(progress)
  return newlyUnlocked
}
