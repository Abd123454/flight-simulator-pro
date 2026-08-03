// Weather system: dynamic wind, variable fog, gusts, and rain.
// Inspired by MSFS live weather — but procedural (no external data).
export type WeatherCondition = 'clear' | 'cloudy' | 'rain' | 'storm'

export interface Weather {
  windX: number // m/s, world X
  windZ: number // m/s, world Z
  windSpeed: number // m/s (magnitude, includes gusts)
  windDir: number // degrees FROM which wind blows (met convention)
  visibility: number // meters
  condition: WeatherCondition
  rainIntensity: number // 0..1
  fogDensity: number // 0..1 (affects fog color/visibility)
}

/** Smoothly evolving weather with gusts, fog, and rain. */
export class WeatherSystem {
  weather: Weather = {
    windX: 0,
    windZ: 0,
    windSpeed: 0,
    windDir: 0,
    visibility: 8000,
    condition: 'clear',
    rainIntensity: 0,
    fogDensity: 0,
  }
  private t = 0
  private baseSpeed = 4 // m/s default light breeze
  private baseDir = 270 // wind from west (met)
  private gustTimer = 0
  private gustStrength = 0 // current gust impulse 0..1
  private gustActive = false

  setWind(speed: number, dir: number) {
    this.baseSpeed = speed
    this.baseDir = dir
  }

  setCondition(c: WeatherCondition) {
    this.weather.condition = c
    switch (c) {
      case 'clear':
        this.weather.fogDensity = 0
        this.weather.rainIntensity = 0
        this.weather.visibility = 8000
        break
      case 'cloudy':
        this.weather.fogDensity = 0.15
        this.weather.rainIntensity = 0
        this.weather.visibility = 5000
        break
      case 'rain':
        this.weather.fogDensity = 0.35
        this.weather.rainIntensity = 0.6
        this.weather.visibility = 3000
        break
      case 'storm':
        this.weather.fogDensity = 0.6
        this.weather.rainIntensity = 1.0
        this.weather.visibility = 1500
        break
    }
  }

  update(dt: number) {
    this.t += dt
    // wind speed varies ±30% around base, slowly
    let speedVar = this.baseSpeed * (1 + 0.3 * Math.sin(this.t * 0.05))
    // storm increases base wind
    if (this.weather.condition === 'storm') speedVar *= 2.5
    else if (this.weather.condition === 'rain') speedVar *= 1.5

    // gusts: random sharp wind spikes every 8-20s, last 1-3s
    this.gustTimer -= dt
    if (!this.gustActive && this.gustTimer <= 0) {
      // chance to start a gust (higher in storms)
      const gustChance = this.weather.condition === 'storm' ? 0.5 : this.weather.condition === 'rain' ? 0.2 : 0.05
      if (Math.random() < gustChance * dt * 2) {
        this.gustActive = true
        this.gustStrength = 0.5 + Math.random() * 0.5
        this.gustTimer = 1 + Math.random() * 2 // gust duration
      } else {
        this.gustTimer = 1 // check again in 1s
      }
    } else if (this.gustActive) {
      if (this.gustTimer <= 0) {
        this.gustActive = false
        this.gustStrength = 0
        this.gustTimer = 5 + Math.random() * 15 // wait for next gust
      }
    }
    // apply gust to wind speed
    speedVar += this.gustStrength * speedVar * 1.5

    // direction varies ±10° (more in storms)
    const dirVarAmt = this.weather.condition === 'storm' ? 25 : 10
    const dirVar = this.baseDir + dirVarAmt * Math.sin(this.t * 0.03)
    const dirRad = (dirVar * Math.PI) / 180
    // met: wind FROM dir => wind blows TOWARD (dir + 180)
    const towardRad = dirRad + Math.PI
    this.weather.windX = Math.sin(towardRad) * speedVar
    this.weather.windZ = -Math.cos(towardRad) * speedVar
    this.weather.windSpeed = speedVar
    this.weather.windDir = ((dirVar % 360) + 360) % 360

    // visibility fluctuates slightly with fog
    const baseVis = this.weather.condition === 'clear' ? 8000
      : this.weather.condition === 'cloudy' ? 5000
      : this.weather.condition === 'rain' ? 3000
      : 1500
    this.weather.visibility = baseVis * (0.8 + 0.2 * Math.sin(this.t * 0.1))
  }

  /** Is a gust currently active? (for HUD indicator + audio) */
  isGustActive(): boolean {
    return this.gustActive
  }
}
