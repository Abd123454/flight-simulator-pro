// Live data integration: weather (Open-Meteo) + elevation (Open-Elevation).
// Both are free, no-API-key APIs. Elevation is fetched as a small grid
// around the airport and used to bias procedural terrain.
// API docs: https://open-meteo.com/en/docs (weather), https://open-elevation.com (elevation)

export interface AirportWeather {
  icao: string
  name: string
  latitude: number
  longitude: number
}

// A small set of real airports players can pick from for live weather + terrain.
export const LIVE_AIRPORTS: AirportWeather[] = [
  { icao: 'KJFK', name: 'New York JFK', latitude: 40.6413, longitude: -73.7781 },
  { icao: 'KLAX', name: 'Los Angeles Intl', latitude: 33.9416, longitude: -118.4085 },
  { icao: 'EGLL', name: 'London Heathrow', latitude: 51.4700, longitude: -0.4543 },
  { icao: 'OMDB', name: 'Dubai Intl', latitude: 25.2532, longitude: 55.3657 },
  { icao: 'VHHH', name: 'Hong Kong Intl', latitude: 22.3080, longitude: 113.9185 },
]

export interface LiveWeatherData {
  windSpeed: number // m/s
  windDirection: number // degrees (meteorological: direction wind comes FROM)
  visibility: number // meters
  fetchedAt: number // Date.now()
  source: string
}

export interface LiveElevationData {
  // 5×5 grid of real elevations (meters), row-major (lat increases first)
  grid: number[]
  gridSize: number // 5
  icao: string
  fetchedAt: number
  source: string
}

/** Fetch live weather from Open-Meteo for a given airport.
 * Returns null if the fetch fails (network error, rate limit, timeout, etc).
 * Uses AbortController with a 5-second timeout to prevent infinite hangs. */
export async function fetchLiveWeather(airport: AirportWeather): Promise<LiveWeatherData | null> {
  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 5000)
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${airport.latitude}&longitude=${airport.longitude}&current=wind_speed_10m,wind_direction_10m,visibility`
    const res = await fetch(url, { signal: controller.signal })
    clearTimeout(timeoutId)
    if (!res.ok) return null
    const data = await res.json()
    const current = data.current
    if (!current) return null
    // Open-Meteo returns wind_speed in km/h — convert to m/s
    return {
      windSpeed: (current.wind_speed_10m ?? 0) / 3.6,
      windDirection: current.wind_direction_10m ?? 0,
      visibility: current.visibility ?? 10000,
      fetchedAt: Date.now(),
      source: `Open-Meteo @ ${airport.icao}`,
    }
  } catch {
    return null
  }
}

// --- Elevation fetching (Open-Elevation API) ---
// Free, no API key. Rate limit: the public endpoint is shared and can be
// slow/rate-limited under heavy load; we cache per-icao to avoid refetching.

// Per-session cache: icao → LiveElevationData. Avoids refetching the same
// airport within one session (stays well within rate limits).
const elevationCache = new Map<string, LiveElevationData>()

/** Fetch a 5×5 elevation grid around an airport from Open-Elevation.
 * Grid spacing is ~0.02° (~2.2km). Returns null on failure.
 * Cached per-icao for the session. */
export async function fetchLiveElevation(airport: AirportWeather): Promise<LiveElevationData | null> {
  // check cache first
  const cached = elevationCache.get(airport.icao)
  if (cached) return cached

  try {
    const gridSize = 5
    const spacing = 0.02 // degrees, ~2.2km
    // build a pipe-separated list of "lat,lon" for the 5×5 grid
    const locations: string[] = []
    for (let iy = 0; iy < gridSize; iy++) {
      for (let ix = 0; ix < gridSize; ix++) {
        const lat = airport.latitude - 0.04 + iy * spacing
        const lon = airport.longitude - 0.04 + ix * spacing
        locations.push(`${lat.toFixed(4)},${lon.toFixed(4)}`)
      }
    }
    const url = `https://api.open-elevation.com/api/v1/lookup?locations=${locations.join('|')}`
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 8000) // elevation API can be slow
    const res = await fetch(url, { signal: controller.signal })
    clearTimeout(timeoutId)
    if (!res.ok) return null
    const data = await res.json()
    const results = data.results
    if (!results || results.length !== gridSize * gridSize) return null
    const grid = results.map((r: { elevation: number }) => r.elevation)
    const elevData: LiveElevationData = {
      grid,
      gridSize,
      icao: airport.icao,
      fetchedAt: Date.now(),
      source: `Open-Elevation @ ${airport.icao}`,
    }
    elevationCache.set(airport.icao, elevData)
    return elevData
  } catch {
    return null
  }
}
