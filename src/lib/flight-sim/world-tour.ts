// World Tour — 28 airports across 28 countries.
// Each day features a different country's airport.
// Complete all 28 to earn the "Around The World" badge.

export interface WorldTourAirport {
  day: number // 1-28
  icao: string
  country: string
  flag: string
  latitude: number
  longitude: number
  fact: string
}

export const WORLD_TOUR_AIRPORTS: WorldTourAirport[] = [
  { day: 1, icao: 'KJFK', country: 'USA', flag: '🇺🇸', latitude: 40.6413, longitude: -73.7781, fact: 'JFK handles 60M+ passengers annually' },
  { day: 2, icao: 'CYYZ', country: 'Canada', flag: '🇨🇦', latitude: 43.6777, longitude: -79.6248, fact: 'Largest airport in Canada' },
  { day: 3, icao: 'MMMX', country: 'Mexico', flag: '🇲🇽', latitude: 19.4363, longitude: -99.0721, fact: 'Named after Benito Juárez' },
  { day: 4, icao: 'EGLL', country: 'UK', flag: '🇬🇧', latitude: 51.4700, longitude: -0.4543, fact: 'World\'s 2nd busiest airport by international traffic' },
  { day: 5, icao: 'LFPG', country: 'France', flag: '🇫🇷', latitude: 49.0097, longitude: 2.5479, fact: 'Europe\'s largest airport' },
  { day: 6, icao: 'EDDF', country: 'Germany', flag: '🇩🇪', latitude: 50.0379, longitude: 8.5622, fact: 'Frankfurt Airport — Germany\'s busiest' },
  { day: 7, icao: 'EHAM', country: 'Netherlands', flag: '🇳🇱', latitude: 52.3105, longitude: 4.7683, fact: 'Schiphol sits 4m below sea level' },
  { day: 8, icao: 'LEMD', country: 'Spain', flag: '🇪🇸', latitude: 40.4719, longitude: -3.5626, fact: 'Madrid Barajas — named after the nearby town' },
  { day: 9, icao: 'LIRF', country: 'Italy', flag: '🇮🇹', latitude: 41.8003, longitude: 12.2389, fact: 'Leonardo da Vinci Airport, Rome' },
  { day: 10, icao: 'LSGG', country: 'Switzerland', flag: '🇨🇭', latitude: 46.2381, longitude: 6.1090, fact: 'Geneva Airport borders France' },
  { day: 11, icao: 'ENGM', country: 'Norway', flag: '🇳🇴', latitude: 60.1939, longitude: 11.1004, fact: 'Oslo Airport uses snow-melting technology' },
  { day: 12, icao: 'ESSA', country: 'Sweden', flag: '🇸🇪', latitude: 59.6519, longitude: 17.9186, fact: 'Stockholm Arlanda — largest in Sweden' },
  { day: 13, icao: 'UUEE', country: 'Russia', flag: '🇷🇺', latitude: 55.9728, longitude: 37.4146, fact: 'Sheremetyevo — Moscow\'s busiest' },
  { day: 14, icao: 'OMDB', country: 'UAE', flag: '🇦🇪', latitude: 25.2532, longitude: 55.3657, fact: 'Dubai — world\'s busiest for A380' },
  { day: 15, icao: 'OTHH', country: 'Qatar', flag: '🇶🇦', latitude: 25.2731, longitude: 51.6080, fact: 'Hamad Airport — 5-star rated' },
  { day: 16, icao: 'VTBS', country: 'Thailand', flag: '🇹🇭', latitude: 13.6900, longitude: 100.7501, fact: 'Suvarnabhumi — "Golden Land"' },
  { day: 17, icao: 'WSSS', country: 'Singapore', flag: '🇸🇬', latitude: 1.3644, longitude: 103.9915, fact: 'Changi — world\'s best airport 2024' },
  { day: 18, icao: 'VHHH', country: 'Hong Kong', flag: '🇭🇰', latitude: 22.3080, longitude: 113.9185, fact: 'Built on reclaimed land' },
  { day: 19, icao: 'ZBAA', country: 'China', flag: '🇨🇳', latitude: 40.0801, longitude: 116.5846, fact: 'Beijing Capital — 2nd busiest worldwide' },
  { day: 20, icao: 'RKSI', country: 'South Korea', flag: '🇰🇷', latitude: 37.4602, longitude: 126.4407, fact: 'Incheon — built on islands' },
  { day: 21, icao: 'RJTT', country: 'Japan', flag: '🇯🇵', latitude: 35.5494, longitude: 139.7798, fact: 'Tokyo Haneda — built on reclaimed land' },
  { day: 22, icao: 'YSSY', country: 'Australia', flag: '🇦🇺', latitude: -33.9399, longitude: 151.1753, fact: 'Sydney — oldest continually operating airport' },
  { day: 23, icao: 'NZAA', country: 'New Zealand', flag: '🇳🇿', latitude: -37.0082, longitude: 174.7850, fact: 'Auckland — built on a volcano field' },
  { day: 24, icao: 'FAOR', country: 'South Africa', flag: '🇿🇦', latitude: -26.1392, longitude: 28.2460, fact: 'OR Tambo — Africa\'s busiest' },
  { day: 25, icao: 'SBGR', country: 'Brazil', flag: '🇧🇷', latitude: -23.4356, longitude: -46.4731, fact: 'São Paulo Guarulhos — Latin America\'s busiest' },
  { day: 26, icao: 'SAEZ', country: 'Argentina', flag: '🇦🇷', latitude: -34.8222, longitude: -58.5358, fact: 'Ezeiza — named after the town' },
  { day: 27, icao: 'FAOR', country: 'Egypt', flag: '🇪🇬', latitude: 30.1219, longitude: 31.4056, fact: 'Cairo International — Africa\'s 2nd busiest' },
  { day: 28, icao: 'KJFK', country: 'USA (Return)', flag: '🇺🇸', latitude: 40.6413, longitude: -73.7781, fact: 'Welcome home! Around the World complete!' },
]

/** Get today's World Tour airport (cycles every 28 days). */
export function getTodayWorldTourAirport(): WorldTourAirport {
  const start = new Date('2026-01-01T00:00:00Z')
  const today = new Date()
  const daysSinceStart = Math.floor((today.getTime() - start.getTime()) / 86400000)
  const day = (daysSinceStart % 28) + 1
  return WORLD_TOUR_AIRPORTS.find((a) => a.day === day) || WORLD_TOUR_AIRPORTS[0]
}

/** Get World Tour progress (how many completed). */
export function getWorldTourProgress(): number[] {
  if (typeof window === 'undefined') return []
  const data = JSON.parse(localStorage.getItem('flight-sim-world-tour') || '[]') as number[]
  return data
}

/** Mark a day as completed. */
export function completeWorldTourDay(day: number): void {
  if (typeof window === 'undefined') return
  const progress = getWorldTourProgress()
  if (!progress.includes(day)) {
    progress.push(day)
    localStorage.setItem('flight-sim-world-tour', JSON.stringify(progress))
  }
}

/** Check if World Tour is complete (all 28 days). */
export function isWorldTourComplete(): boolean {
  return getWorldTourProgress().length >= 28
}
