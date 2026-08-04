import { describe, it, expect } from 'vitest'
import { buildAircraftPhysics, PHYS } from '@/lib/flight-sim/physics'
import { AIRCRAFT } from '@/lib/flight-sim/aircraft-config'

describe('physics: buildAircraftPhysics', () => {
  it('merges per-aircraft values with shared PHYS defaults', () => {
    const phys = buildAircraftPhysics(AIRCRAFT.fighter)
    expect(phys.mass).toBe(AIRCRAFT.fighter.mass) // 12000
    expect(phys.maxThrust).toBe(AIRCRAFT.fighter.maxThrust) // 380000
    expect(phys.wingArea).toBe(AIRCRAFT.fighter.wingArea) // 27.87
  })

  it('uses shared ground constants from PHYS', () => {
    const phys = buildAircraftPhysics(AIRCRAFT.airliner)
    expect(phys.groundY).toBe(PHYS.groundY)
    expect(phys.rollingFriction).toBe(PHYS.rollingFriction)
    expect(phys.runwayHalfWidth).toBe(PHYS.runwayHalfWidth)
  })

  it('gives different physics for different aircraft', () => {
    const fighterPhys = buildAircraftPhysics(AIRCRAFT.fighter)
    const airlinerPhys = buildAircraftPhysics(AIRCRAFT.airliner)
    expect(fighterPhys.mass).not.toBe(airlinerPhys.mass)
    expect(fighterPhys.maxThrust).not.toBe(airlinerPhys.maxThrust)
    expect(fighterPhys.rollRate).not.toBe(airlinerPhys.rollRate)
  })

  it('F-16 has higher roll rate than 737', () => {
    const fighterPhys = buildAircraftPhysics(AIRCRAFT.fighter)
    const airlinerPhys = buildAircraftPhysics(AIRCRAFT.airliner)
    expect(fighterPhys.rollRate).toBeGreaterThan(airlinerPhys.rollRate)
  })

  it('Extra 300 has highest roll rate of all', () => {
    const stuntPhys = buildAircraftPhysics(AIRCRAFT.stunt)
    const fighterPhys = buildAircraftPhysics(AIRCRAFT.fighter)
    expect(stuntPhys.rollRate).toBeGreaterThan(fighterPhys.rollRate)
  })
})
