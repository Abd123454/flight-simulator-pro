import { describe, it, expect } from 'vitest'
import { convertSpeed, convertAltitude, convertVerticalSpeed, convertDistance } from '@/lib/flight-sim/units'

describe('unit converter', () => {
  it('converts speed to knots (aviation)', () => {
    const r = convertSpeed(100, 'aviation')
    expect(r.value).toBe(194) // 100 m/s ≈ 194 kts
    expect(r.unit).toBe('kts')
  })

  it('converts speed to km/h (metric)', () => {
    const r = convertSpeed(100, 'metric')
    expect(r.value).toBe(360) // 100 m/s = 360 km/h
    expect(r.unit).toBe('km/h')
  })

  it('converts altitude to feet (aviation)', () => {
    const r = convertAltitude(1000, 'aviation')
    expect(r.value).toBe(3281) // 1000 m ≈ 3281 ft
    expect(r.unit).toBe('ft')
  })

  it('converts altitude to meters (metric)', () => {
    const r = convertAltitude(1000, 'metric')
    expect(r.value).toBe(1000)
    expect(r.unit).toBe('m')
  })

  it('converts vertical speed to fpm (aviation)', () => {
    const r = convertVerticalSpeed(5, 'aviation')
    expect(r.value).toBe(984) // 5 m/s ≈ 984 fpm
    expect(r.unit).toBe('fpm')
  })

  it('converts distance to nautical miles (aviation)', () => {
    const r = convertDistance(5500, 'aviation')
    expect(r.value).toBe(3) // 5500 m ≈ 3 nm
    expect(r.unit).toBe('nm')
  })
})
