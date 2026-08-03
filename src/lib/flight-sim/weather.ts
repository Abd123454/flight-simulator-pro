// Weather system: dynamic wind that varies smoothly over time, plus
// visibility (fog) and a wind direction used by the windsock + HUD.
export interface Weather {
  windX: number // m/s, world X
  windZ: number // m/s, world Z
  windSpeed: number // m/s (magnitude)
  windDir: number // degrees FROM which wind blows (met convention)
  visibility: number // meters
}

/** Smoothly evolving wind via low-frequency sine components. */
export class WeatherSystem {
  weather: Weather = {
    windX: 0,
    windZ: 0,
    windSpeed: 0,
    windDir: 0,
    visibility: 8000,
  }
  private t = 0
  private baseSpeed = 4 // m/s default light breeze
  private baseDir = 270 // wind from west (met)

  setWind(speed: number, dir: number) {
    this.baseSpeed = speed
    this.baseDir = dir
  }

  update(dt: number) {
    this.t += dt
    // wind speed varies ±30% around base, slowly
    const speedVar = this.baseSpeed * (1 + 0.3 * Math.sin(this.t * 0.05))
    // direction varies ±10°
    const dirVar = this.baseDir + 10 * Math.sin(this.t * 0.03)
    const dirRad = (dirVar * Math.PI) / 180
    // met: wind FROM dir => wind blows TOWARD (dir + 180)
    const towardRad = dirRad + Math.PI
    this.weather.windX = Math.sin(towardRad) * speedVar
    this.weather.windZ = -Math.cos(towardRad) * speedVar
    this.weather.windSpeed = speedVar
    this.weather.windDir = ((dirVar % 360) + 360) % 360
  }
}
