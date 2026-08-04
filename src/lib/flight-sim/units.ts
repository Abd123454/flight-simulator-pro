// Unit converter: knots/feet (aviation standard) ↔ km-h/meters (metric)
// Player can toggle the display unit system from settings.

export type UnitSystem = 'metric' | 'aviation'

export function convertSpeed(ms: number, system: UnitSystem): { value: number; unit: string } {
  if (system === 'aviation') {
    return { value: Math.round(ms * 1.94384), unit: 'kts' } // m/s → knots
  }
  return { value: Math.round(ms * 3.6), unit: 'km/h' } // m/s → km/h
}

export function convertAltitude(m: number, system: UnitSystem): { value: number; unit: string } {
  if (system === 'aviation') {
    return { value: Math.round(m * 3.28084), unit: 'ft' } // meters → feet
  }
  return { value: Math.round(m), unit: 'm' }
}

export function convertVerticalSpeed(ms: number, system: UnitSystem): { value: number; unit: string } {
  if (system === 'aviation') {
    return { value: Math.round(ms * 196.85), unit: 'fpm' } // m/s → feet/min
  }
  return { value: Math.round(ms), unit: 'm/s' }
}

export function convertDistance(m: number, system: UnitSystem): { value: number; unit: string } {
  if (system === 'aviation') {
    return { value: Math.round(m * 0.000539957), unit: 'nm' } // meters → nautical miles
  }
  return { value: Math.round(m / 1000), unit: 'km' }
}
