// Friend Challenge — ghost multiplayer (async, non-PVP).
// Player flies a challenge, generates a shareable challenge link.
// Friend opens the link, flies the same challenge, sees the original as a ghost.

export interface ChallengeData {
  id: string
  missionKey: string
  aircraftType: string
  score: number
  flightTime: number
  maxAltitude: number
  landingVS: number
  playerHash: string
  createdAt: number
}

const STORAGE_KEY = 'flight-sim-challenges'

/** Save a challenge result locally (acts as the "ghost" data). */
export function saveChallenge(challenge: ChallengeData): void {
  if (typeof window === 'undefined') return
  const challenges = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]') as ChallengeData[]
  challenges.push(challenge)
  // keep only last 50
  if (challenges.length > 50) challenges.shift()
  localStorage.setItem(STORAGE_KEY, JSON.stringify(challenges))
}

/** Get all saved challenges (ghosts to compete against). */
export function getChallenges(): ChallengeData[] {
  if (typeof window === 'undefined') return []
  return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]') as ChallengeData[]
}

/** Get the best challenge for a specific mission. */
export function getBestChallenge(missionKey: string): ChallengeData | null {
  const challenges = getChallenges().filter((c) => c.missionKey === missionKey)
  if (challenges.length === 0) return null
  return challenges.reduce((best, c) => (c.score > best.score ? c : best))
}

/** Generate a shareable challenge link with embedded data. */
export function generateChallengeLink(challenge: ChallengeData): string {
  const encoded = btoa(JSON.stringify(challenge))
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://github.com/Abd123454/flight-simulator-pro'
  return `${baseUrl}/?challenge=${encoded}`
}

/** Parse a challenge from a URL parameter. */
export function parseChallengeFromUrl(): ChallengeData | null {
  if (typeof window === 'undefined') return null
  const params = new URLSearchParams(window.location.search)
  const encoded = params.get('challenge')
  if (!encoded) return null
  try {
    return JSON.parse(atob(encoded)) as ChallengeData
  } catch {
    return null
  }
}

/** Generate a simple anonymous player hash (no PII). */
export function generatePlayerHash(): string {
  if (typeof window === 'undefined') return 'anon'
  let hash = localStorage.getItem('flight-sim-player-hash')
  if (!hash) {
    hash = 'p_' + Math.random().toString(36).substring(2, 10)
    localStorage.setItem('flight-sim-player-hash', hash)
  }
  return hash
}

/** Generate a shareable text for friend challenge. */
export function generateChallengeShareText(challenge: ChallengeData): string {
  return `Flight Simulator Pro — Challenge!
Mission: ${challenge.missionKey} · Aircraft: ${challenge.aircraftType}
My score: ${challenge.score} (time: ${Math.round(challenge.flightTime)}s, alt: ${Math.round(challenge.maxAltitude)}m)
Can you beat me?
${generateChallengeLink(challenge)}`
}
