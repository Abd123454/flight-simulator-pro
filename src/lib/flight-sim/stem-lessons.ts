// STEM Education Mode — 6 ready-to-teach aviation lessons.
// Each lesson: 2-min theory + 5-min practical flight.
// Teachers use a class code; students don't need accounts.
// Aligns with NGSS (Next Generation Science Standards).

export interface StemLesson {
  id: number
  title: string
  subject: string
  ngssStandard: string
  theoryText: string
  flightInstructions: string
  missionKey: string
  aircraftType: string
  duration: number // minutes
}

export const STEM_LESSONS: StemLesson[] = [
  {
    id: 1,
    title: 'How Wings Generate Lift',
    subject: 'Physics — Aerodynamics',
    ngssStandard: 'HS-PS2-1: Forces and Motion',
    theoryText: `An airplane wing is shaped so air moves faster over the top than the bottom.
Faster air = lower pressure (Bernoulli's Principle).
The pressure difference creates an upward force called LIFT.

Formula: Lift = ½ × ρ × V² × S × CL
  ρ = air density (1.225 kg/m³ at sea level)
  V = airspeed (m/s)
  S = wing area (m²)
  CL = coefficient of lift (depends on angle of attack)

When Lift > Weight, the plane flies. When Lift < Weight, it falls.
Angle of Attack (AoA) is the angle between the wing and the airflow.
More AoA = more lift, until the wing STALLS (air separates from wing).`,
    flightInstructions: 'Take off with the 737. Climb to 1000m. Try different AoA by pulling back on the stick (S key). Watch the AoA indicator in the HUD. When AoA exceeds 15°, you will see "STALL" — the wing loses lift. Recover by pushing forward (W key) to reduce AoA.',
    missionKey: 'freeflight',
    aircraftType: 'airliner',
    duration: 7,
  },
  {
    id: 2,
    title: 'Reading Flight Instruments',
    subject: 'Aviation — Navigation',
    ngssStandard: 'HS-ETS1-2: Engineering Design',
    theoryText: `Pilots use 6 basic instruments (the "6-pack"):
1. Airspeed Indicator — how fast through the air
2. Attitude Indicator — roll and pitch (artificial horizon)
3. Altimeter — altitude above sea level
4. Turn Coordinator — rate of turn
5. Heading Indicator — compass direction
6. Vertical Speed Indicator — climbing or descending

In this simulator, the HUD shows:
- SPEED (top-left): airspeed in km/h or knots
- ATTITUDE (center): artificial horizon with roll and pitch
- ALTITUDE (right side): vertical tape
- HEADING (top): compass tape
- VSI: vertical speed readout

Learn to scan all instruments at once — this is called "instrument scan."`,
    flightInstructions: 'Start a Free Flight. Practice reading each instrument: identify your speed, altitude, heading, and attitude. Try a coordinated turn (bank right with D, then level with A). Notice how the heading changes as you turn.',
    missionKey: 'freeflight',
    aircraftType: 'airliner',
    duration: 5,
  },
  {
    id: 3,
    title: 'Weather and Flight Safety',
    subject: 'Earth Science — Meteorology',
    ngssStandard: 'HS-ESS2-4: Weather and Climate',
    theoryText: `Weather affects every flight. Key hazards:
- CROSSWIND: wind blowing across the runway makes landing difficult
- VISIBILITY: fog, rain, and snow reduce how far you can see
- ICING: below 0°C, moisture freezes on wings (increases weight, reduces lift)
- THUNDERSTORMS: turbulence, hail, lightning — avoid entirely

Wind direction uses the "FROM" convention:
- Wind 270° means wind blows FROM the west, TOWARD the east
- If runway heading is 360° (north) and wind is 270° (west), it's a crosswind

Pilots always land INTO the wind for slower ground speed and shorter landing distance.

In this simulator, you can toggle weather (keys 1-4) and see real weather
from live airports worldwide (Open-Meteo API).`,
    flightInstructions: 'Toggle weather to STORM (key 4). Notice how visibility drops, wind increases, and gusts appear. Try to land in these conditions. Then switch to CLEAR (key 1) and compare. Try the live weather feature to see real conditions at JFK or Heathrow.',
    missionKey: 'landing',
    aircraftType: 'airliner',
    duration: 8,
  },
  {
    id: 4,
    title: 'Takeoff Physics',
    subject: 'Physics — Newton\'s Laws',
    ngssStandard: 'HS-PS2-1: Newton\'s Second Law (F=ma)',
    theoryText: `Takeoff is Newton's Second Law in action: F = ma
  F = Thrust (from engines) − Drag (air resistance) − Friction (wheels)
  m = aircraft mass
  a = acceleration

The 737-800:
- Mass: 65,000 kg (half-loaded)
- Max Thrust: 240 kN (two CFM56 engines)
- Takeoff Speed (Vr): ~70 m/s (250 km/h)

Acceleration = (240,000 N − 20,000 N drag) / 65,000 kg ≈ 3.4 m/s²
Time to reach 70 m/s ≈ 20 seconds
Distance ≈ 700 meters (less than the 3000m runway)

Why do flaps help? Flaps increase CL (coefficient of lift), so the wing
generates more lift at lower speeds. This means the plane can take off
at a lower speed — shorter runway needed.`,
    flightInstructions: 'Take off in the 737. Press F to deploy flaps (stage 1). Hold Shift for full throttle. Watch the speed build up. At 250 km/h, pull back gently (S key) to rotate. The plane lifts off. Compare takeoff distance with and without flaps.',
    missionKey: 'freeflight',
    aircraftType: 'airliner',
    duration: 6,
  },
  {
    id: 5,
    title: 'Landing Approach and Glideslope',
    subject: 'Aviation — Precision Flying',
    ngssStandard: 'HS-ETS1-3: System Optimization',
    theoryText: `A stable approach is the key to a safe landing.

The GLIDESLOPE is a 3° descent angle to the runway:
- At 1 km from runway: altitude should be ~52m
- At 5 km: altitude should be ~260m
- Descent rate: ~3 m/s at approach speed (75 m/s)

PAPI lights help pilots see if they're on the correct glideslope:
- 2 red + 2 white = ON SLOPE (perfect)
- 3 red + 1 white = slightly LOW
- 4 red = TOO LOW (dangerous)
- 4 white = TOO HIGH

The ILS (Instrument Landing System) provides electronic guidance:
- Localizer: left/right alignment with runway centerline
- Glideslope: vertical path guidance
Both are shown in the HUD when on approach.

Vertical speed at touchdown should be < 2 m/s for a "greaser" (smooth landing).
Above 5 m/s = hard landing (may damage aircraft).`,
    flightInstructions: 'Select the Landing Challenge mission. You start on final approach. Use the ILS indicator (center cross) to stay aligned. Keep the localizer dot (yellow) centered horizontally and the glideslope dot (green) centered vertically. Touch down gently — target vertical speed < 2 m/s.',
    missionKey: 'landing',
    aircraftType: 'airliner',
    duration: 7,
  },
  {
    id: 6,
    title: 'Navigation and Waypoints',
    subject: 'Geography — Coordinates',
    ngssStandard: 'HS-ESS3-5: Geographic Systems',
    theoryText: `Pilots navigate using waypoints — fixed geographic positions.
A flight plan connects waypoints in sequence: A → B → C → D

Each waypoint has:
- Position (latitude/longitude or local coordinates)
- Altitude constraint (minimum/maximum)
- Speed constraint

In this simulator:
- The radar minimap (bottom-right) shows your position and the runway
- The compass tape (top) shows your heading (0° = North)
- Heading is the direction the nose points
- Track is the actual path over the ground (different in crosswind)

To fly to a waypoint:
1. Note its position on the minimap
2. Turn to the heading that points toward it
3. In crosswind, crab into the wind to maintain track

The Cross Country mission flies through 5 waypoints to a second airport 5km away.`,
    flightInstructions: 'Select the Cross Country mission. Fly through each waypoint gate in order. Each gate turns green when passed. Use the minimap to navigate. Try to maintain a constant altitude and speed throughout.',
    missionKey: 'crosscountry',
    aircraftType: 'airliner',
    duration: 10,
  },
]

export function getLessonById(id: number): StemLesson | undefined {
  return STEM_LESSONS.find((l) => l.id === id)
}
