import { describe, it, expect, beforeEach } from 'vitest'
import { loadProgress, recordMissionResult, type PlayerProgress } from '@/lib/flight-sim/achievements'

// Mock localStorage + window for Node environment
const mockStore: Record<string, string> = {}
globalThis.localStorage = {
  getItem: (key: string) => mockStore[key] ?? null,
  setItem: (key: string, val: string) => { mockStore[key] = val },
  removeItem: (key: string) => { delete mockStore[key] },
  clear: () => { Object.keys(mockStore).forEach(k => delete mockStore[k]) },
  key: (i: number) => Object.keys(mockStore)[i] ?? null,
  get length() { return Object.keys(mockStore).length },
} as any
// saveProgress checks typeof window !== 'undefined'
;(globalThis as any).window = globalThis

describe('achievements', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('loadProgress returns defaults on empty storage', () => {
    const p = loadProgress()
    expect(p.totalScore).toBe(0)
    expect(p.missionsCompleted).toBe(0)
    expect(p.achievements.length).toBe(12)
    expect(p.completedMissions).toEqual([])
  })

  it('recordMissionResult updates score and flight time', () => {
    const p = loadProgress()
    recordMissionResult(p, {
      success: true,
      score: 500,
      flightTime: 120,
      maxAltitude: 1000,
      landingVS: -1.5,
      missionType: 'landing',
      missionKey: 'landing',
      weatherCondition: 'clear',
    })
    expect(p.totalScore).toBe(500)
    expect(p.totalFlightTime).toBe(120)
    expect(p.missionsCompleted).toBe(1)
  })

  it('unlocks first_flight achievement on first success', () => {
    const p = loadProgress()
    const newly = recordMissionResult(p, {
      success: true, score: 100, flightTime: 30, maxAltitude: 500,
      landingVS: 0, missionType: 'freeflight', missionKey: 'freeflight',
      weatherCondition: 'clear',
    })
    expect(newly.some(a => a.id === 'first_flight')).toBe(true)
  })

  it('unlocks storm_flyer when weather is storm', () => {
    const p = loadProgress()
    const newly = recordMissionResult(p, {
      success: false, score: 0, flightTime: 10, maxAltitude: 100,
      landingVS: 0, missionType: 'freeflight', missionKey: 'freeflight',
      weatherCondition: 'storm',
    })
    expect(newly.some(a => a.id === 'storm_flyer')).toBe(true)
  })

  it('tracks completed missions for campaign unlocks', () => {
    const p = loadProgress()
    recordMissionResult(p, {
      success: true, score: 0, flightTime: 10, maxAltitude: 100,
      landingVS: 0, missionType: 'freeflight', missionKey: 'freeflight',
      weatherCondition: 'clear',
    })
    expect(p.completedMissions).toContain('freeflight')
  })

  it('persists to localStorage', () => {
    const p = loadProgress()
    recordMissionResult(p, {
      success: true, score: 300, flightTime: 60, maxAltitude: 800,
      landingVS: -0.5, missionType: 'landing', missionKey: 'landing',
      weatherCondition: 'clear',
    })
    const stored = JSON.parse(localStorage.getItem('flight-sim-progress')!)
    expect(stored.totalScore).toBe(300)
  })
})
