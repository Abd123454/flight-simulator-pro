import { describe, it, expect } from 'vitest'
import { WeatherSystem } from '@/lib/flight-sim/weather'

describe('WeatherSystem', () => {
  it('starts with clear conditions', () => {
    const ws = new WeatherSystem()
    expect(ws.weather.condition).toBe('clear')
    expect(ws.weather.windSpeed).toBe(0)
  })

  it('setWind changes base speed and direction', () => {
    const ws = new WeatherSystem()
    ws.setWind(15, 90)
    ws.update(0.1)
    expect(ws.weather.windSpeed).toBeGreaterThan(10)
  })

  it('storm condition increases wind speed', () => {
    const ws = new WeatherSystem()
    ws.setWind(10, 270)
    ws.setCondition('storm')
    ws.update(0.1)
    // storm multiplies wind by 2.5x: 10 * ~1.0 * 2.5 ≈ 25
    expect(ws.weather.windSpeed).toBeGreaterThan(20)
  })

  it('setLiveWeather locks visibility', () => {
    const ws = new WeatherSystem()
    ws.setLiveWeather(5, 180, 3000)
    expect(ws.weather.visibility).toBe(3000)
    ws.update(1) // update should NOT overwrite live visibility
    expect(ws.weather.visibility).toBe(3000)
  })

  it('setCondition unlocks visibility (procedural resumes)', () => {
    const ws = new WeatherSystem()
    ws.setLiveWeather(5, 180, 3000)
    ws.setCondition('clear')
    ws.update(1)
    // after setCondition, update() should have changed visibility from 3000
    expect(ws.weather.visibility).not.toBe(3000)
  })

  it('gust detection works', () => {
    const ws = new WeatherSystem()
    expect(ws.isGustActive()).toBe(false)
  })
})
