// Live weather integration via Open-Meteo (free, no API key required).
// Fetches real current wind speed/direction/visibility for a real airport
// and feeds it into the WeatherSystem.
// API docs: https://open-meteo.com/en/docs

export interface AirportWeather {
  icao: string
  name: string
  latitude: number
  longitude: number
}

// A small set of real airports players can pick from for live weather.
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

/** Fetch live weather from Open-Meteo for a given airport ICAO.
 * Returns null if the fetch fails (network error, etc). */
export async function fetchLiveWeather(airport: AirportWeather): Promise<LiveWeatherData | null> {
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${airport.latitude}&longitude=${airport.longitude}&current=wind_speed_10m,wind_direction_10m,visibility`
    const res = await fetch(url)
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
