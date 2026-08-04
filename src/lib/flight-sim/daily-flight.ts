// Daily Flight system — Wordle-style daily challenge.
// Every day at UTC 00:00, a new flight is generated:
//   - Random airport from LIVE_AIRPORTS
//   - Random aircraft from AIRCRAFT
//   - Real current weather for that airport
//   - Random mission type
// All players worldwide get the same flight. Results saved to a global leaderboard.

export interface DailyFlightConfig {
  date: string // YYYY-MM-DD (UTC)
  airportIcao: string
  aircraftType: string // AircraftType
  missionType: string // MissionType
  weatherSeed: number // deterministic seed for weather (so all players get same weather)
}

export interface DailyFlightResult {
  date: string
  score: number
  flightTime: number
  maxAltitude: number
  landingVS: number
  completed: boolean
  playerHash: string // anonymous hash for leaderboard
}

// Deterministic pseudo-random based on date string (so all players get same flight)
function seededRandom(seed: number): () => number {
  let s = seed
  return () => {
    s = (s * 9301 + 49297) % 233280
    return s / 233280
  }
}

function dateString(date: Date): string {
  return date.toISOString().slice(0, 10) // YYYY-MM-DD
}

const AIRPORT_ICAOS = ['KJFK', 'KLAX', 'EGLL', 'OMDB', 'VHHH']
const AIRCRAFT_TYPES = ['airliner', 'fighter', 'stunt', 'cargo']
const MISSION_TYPES = ['freeflight', 'landing', 'race', 'crosscountry', 'combat', 'storm']

/** Get today's daily flight config. Same for all players worldwide. */
export function getDailyFlight(date = new Date()): DailyFlightConfig {
  const dateStr = dateString(date)
  // hash the date string to a number
  let hash = 0
  for (let i = 0; i < dateStr.length; i++) {
    hash = ((hash << 5) - hash + dateStr.charCodeAt(i)) | 0
  }
  const rand = seededRandom(Math.abs(hash))

  const airportIcao = AIRPORT_ICAOS[Math.floor(rand() * AIRPORT_ICAOS.length)]
  const aircraftType = AIRCRAFT_TYPES[Math.floor(rand() * AIRCRAFT_TYPES.length)]
  const missionType = MISSION_TYPES[Math.floor(rand() * MISSION_TYPES.length)]

  return {
    date: dateStr,
    airportIcao,
    aircraftType,
    missionType,
    weatherSeed: Math.floor(rand() * 1000000),
  }
}

/** Get yesterday's flight (for "you missed it" display). */
export function getYesterdayFlight(): DailyFlightConfig {
  const yesterday = new Date()
  yesterday.setUTCDate(yesterday.getUTCDate() - 1)
  return getDailyFlight(yesterday)
}

/** Check if the player has already completed today's flight. */
export function hasCompletedToday(): boolean {
  if (typeof window === 'undefined') return false
  const today = dateString(new Date())
  const results = JSON.parse(localStorage.getItem('flight-sim-daily-results') || '{}')
  return results[today]?.completed === true
}

/** Save today's flight result. */
export function saveDailyResult(result: DailyFlightResult): void {
  if (typeof window === 'undefined') return
  const results = JSON.parse(localStorage.getItem('flight-sim-daily-results') || '{}')
  // only save if better than existing
  const existing = results[result.date]
  if (!existing || result.score > existing.score) {
    results[result.date] = result
    localStorage.setItem('flight-sim-daily-results', JSON.stringify(results))
  }
}

/** Get the player's best result for today. */
export function getTodayResult(): DailyFlightResult | null {
  if (typeof window === 'undefined') return null
  const today = dateString(new Date())
  const results = JSON.parse(localStorage.getItem('flight-sim-daily-results') || '{}')
  return results[today] || null
}

/** Get streak (consecutive days played). */
export function getStreak(): number {
  if (typeof window === 'undefined') return 0
  const results = JSON.parse(localStorage.getItem('flight-sim-daily-results') || '{}')
  let streak = 0
  const date = new Date()
  while (true) {
    const dateStr = dateString(date)
    if (results[dateStr]?.completed) {
      streak++
      date.setUTCDate(date.getUTCDate() - 1)
    } else {
      break
    }
  }
  return streak
}

/** Generate a Wordle-style share text for the daily flight result. */
export function generateShareText(result: DailyFlightResult, config: DailyFlightConfig): string {
  const score = result.score
  const time = Math.round(result.flightTime)
  const alt = Math.round(result.maxAltitude)

  // Wordle-style colored squares (5 squares based on performance)
  let squares = ''
  if (result.completed) {
    if (score >= 1000) squares = '🟩🟩🟩🟩🟩'
    else if (score >= 500) squares = '🟩🟩🟩🟨⬛'
    else if (score >= 200) squares = '🟩🟩🟨⬛⬛'
    else squares = '🟩🟨⬛⬛⬛'
  } else {
    squares = '⬛⬛⬛⬛⬛'
  }

  return `Flight Simulator Pro — Daily Flight ${config.date}
${config.airportIcao} · ${config.aircraftType} · ${config.missionType}
${squares}
Score: ${score} · Time: ${time}s · Max Alt: ${alt}m
Streak: ${getStreak()} days
Play: github.com/Abd123454/flight-simulator-pro`
}
