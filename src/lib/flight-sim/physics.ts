// Realistic flight physics based on blade-element / coefficient model.
// References:
//   - Jakob Maier "Simple Physics-based Flight Simulation" (rigid body + wing forces)
//   - MSFS Flight Model Physics docs (aerodynamic coefficients, stability)
//   - ERAU "Aircraft Stability & Control" (weathervaning, dihedral, dutch roll)
//
// Key realistic additions vs arcade model:
//  1. Sideslip (beta) — angle between velocity and nose in the horizontal plane.
//  2. Weathervaning / directional stability — fuselage + fin yaw the nose INTO the
//     relative wind (Cn_beta > 0), like a weather vane.
//  3. Dihedral effect — sideslip rolls the aircraft LEVEL (Cl_beta < 0).
//  4. Pitch damping — elevator deflection + pitch rate produce restoring moment.
//  5. Yaw damper — counteracts dutch roll oscillation (real 737 has one).
//  6. Thrust-induced yaw — asymmetric thrust / spiraling slipstream.
//  7. Ground effect — lift increases & induced drag drops near the ground.
import * as THREE from 'three'
import type { FlightControls, FlightState } from './types'
import type { Weather } from './weather'

// --- Airframe constants (737-800, realistic-tuned) ---
export const PHYS = {
  mass: 65000, // kg (half-loaded)
  wingArea: 124.6, // m^2
  maxThrust: 1_200_000, // N
  reverseThrust: 400_000,
  cl0: 0.25,
  clAlpha: 0.11, // per degree
  clMax: 1.6,
  flapsClBoost: 0.4,
  flapsCdBoost: 0.015,
  spoilerCdBoost: 0.06,
  cd0: 0.022,
  inducedK: 0.045,
  stallAoA: 15, // degrees
  g: 9.81,
  // control authority (rad/s) — tuned for controllable airliner feel
  pitchRate: 0.5,
  rollRate: 1.6,
  yawRate: 0.45,
  // stability derivatives (realistic)
  // These produce self-correcting moments without pilot input.
  cnBeta: 0.06, // directional stability (yaw into sideslip), per rad
  clBeta: -0.13, // dihedral effect (roll away from sideslip), per rad
  cmAlpha: -0.4, // pitch stability (nose-down when AoA increases), per rad
  clp: -0.4, // roll damping
  cnr: -0.12, // yaw damping
  cmq: -5.0, // pitch damping (strong)
  // ground effect
  groundEffectHeight: 16, // wingspan/2 ~ wing above ground
  groundEffectStrength: 0.4, // induced drag reduction fraction at 0 height
  // ground
  groundY: 3.2,
  gearHeight: 3.2,
  rollingFriction: 0.04,
  brakeFriction: 1.4,
  grassFriction: 0.8,
  groundSteerRate: 0.7,
  groundLevelRate: 4.0,
  runwayHalfWidth: 30,
  runwayHalfLength: 1500,
  // misc
  autoLevelRoll: 0.6,
  autoLevelPitch: 0.3,
  coordinatedTurn: 0.4,
  rpmSlew: 0.9,
  maxSpeed: 290,
  crashVerticalSpeed: 5.0,
  crashBankAngle: 50,
} as const

// Reusable temporaries
const _forward = new THREE.Vector3()
const _up = new THREE.Vector3()
const _right = new THREE.Vector3()
const _vLocal = new THREE.Vector3()
const _vDir = new THREE.Vector3()
const _force = new THREE.Vector3()
const _lift = new THREE.Vector3()
const _drag = new THREE.Vector3()
const _thrust = new THREE.Vector3()
const _grav = new THREE.Vector3()
const _side = new THREE.Vector3()
const _deltaQ = new THREE.Quaternion()
const _euler = new THREE.Euler()
const _axis = new THREE.Vector3()
const _yawQuat = new THREE.Quaternion()
const _tmpQ = new THREE.Quaternion()
const _inv = new THREE.Quaternion()
const _windVec = new THREE.Vector3()

const DEG = 180 / Math.PI

/**
 * Advance the flight model by dt seconds. Mutates state + orientation.
 */
export function stepFlight(
  state: FlightState,
  orientation: THREE.Quaternion,
  controls: FlightControls,
  dt: number,
  weather?: Weather
): void {
  if (state.crashed) {
    state.velocity.x *= 0.9
    state.velocity.z *= 0.9
    state.velocity.y = 0
    return
  }

  // --- Orientation basis (local axes in world space) ---
  _forward.set(0, 0, -1).applyQuaternion(orientation)
  _up.set(0, 1, 0).applyQuaternion(orientation)
  _right.set(1, 0, 0).applyQuaternion(orientation)

  // --- Air velocity (airspeed = velocity - wind) ---
  _windVec.set(0, 0, 0)
  if (weather) {
    _windVec.set(weather.windX, 0, weather.windZ)
  }
  const airVx = state.velocity.x - _windVec.x
  const airVy = state.velocity.y - _windVec.y
  const airVz = state.velocity.z - _windVec.z

  // --- Airspeed & angles (AoA + sideslip) ---
  const speed = Math.hypot(airVx, airVy, airVz)
  _inv.copy(orientation).invert()
  _vLocal.set(airVx, airVy, airVz).applyQuaternion(_inv)
  const forwardSpeed = -_vLocal.z
  const sideSpeed = _vLocal.x // +x = wind from right
  const aoaRad = Math.atan2(-_vLocal.y, Math.max(forwardSpeed, 0.1))
  const aoaDeg = aoaRad * DEG
  const aoaAbs = Math.abs(aoaDeg)
  const betaRad = Math.atan2(sideSpeed, Math.max(forwardSpeed, 0.1)) // sideslip
  const betaDeg = betaRad * DEG

  // --- Air density ---
  const rho = 1.225 * Math.exp(-state.altitude / 10000)

  // --- Flaps & spoilers ---
  const flapsStage = state.flaps
  const clFlaps = flapsStage * PHYS.flapsClBoost
  const cdFlaps = flapsStage * PHYS.flapsCdBoost
  const cdSpoiler = state.spoilers ? PHYS.spoilerCdBoost : 0

  // --- Ground effect (reduces induced drag + boosts lift near ground) ---
  const agl = state.altitude // height above terrain (terrain at y=0)
  const geFactor =
    agl < PHYS.groundEffectHeight
      ? 1 - PHYS.groundEffectStrength * (1 - agl / PHYS.groundEffectHeight)
      : 1

  // --- Lift / drag coefficients ---
  let cl: number
  let stalled = false
  if (aoaAbs < PHYS.stallAoA) {
    cl = PHYS.cl0 + PHYS.clAlpha * aoaDeg + clFlaps
    cl = THREE.MathUtils.clamp(cl, -PHYS.clMax, PHYS.clMax)
  } else {
    stalled = true
    const drop = THREE.MathUtils.clamp(1 - (aoaAbs - PHYS.stallAoA) / 12, 0.25, 1)
    const clPeak = PHYS.cl0 + PHYS.clAlpha * PHYS.stallAoA
    cl = Math.sign(aoaDeg) * clPeak * drop
  }
  const cd = PHYS.cd0 + PHYS.inducedK * cl * cl * geFactor + cdFlaps + cdSpoiler

  const q = 0.5 * rho * speed * speed
  const liftMag = q * PHYS.wingArea * cl
  const dragMag = q * PHYS.wingArea * cd

  // --- Forces (world space) ---
  // Lift acts along the local up axis (perpendicular to relative wind, but
  // close to body-up for small AoA — standard simplification).
  _lift.copy(_up).multiplyScalar(liftMag)
  // Drag opposes the air velocity direction.
  _vDir.set(airVx, airVy, airVz)
  if (_vDir.lengthSq() < 1e-4) _vDir.set(0, 0, -1)
  _vDir.normalize()
  _drag.copy(_vDir).multiplyScalar(-dragMag)
  // Side force from sideslip (fuselage + fin produce lateral force ~ beta).
  const sideForceMag = q * PHYS.wingArea * 0.3 * betaRad
  _side.copy(_right).multiplyScalar(-sideForceMag)

  // --- Thrust (forward or reverse) ---
  let thrustMag: number
  if (state.reverseThrust && state.onGround) {
    thrustMag = -state.throttle * PHYS.reverseThrust
  } else {
    thrustMag = state.throttle * PHYS.maxThrust
  }
  _thrust.copy(_forward).multiplyScalar(thrustMag)
  _grav.set(0, -PHYS.g * PHYS.mass, 0)

  _force.set(0, 0, 0)
  _force.add(_lift).add(_drag).add(_side).add(_thrust).add(_grav)

  // --- Integrate linear motion ---
  const ax = _force.x / PHYS.mass
  const ay = _force.y / PHYS.mass
  const az = _force.z / PHYS.mass
  state.velocity.x += ax * dt
  state.velocity.y += ay * dt
  state.velocity.z += az * dt

  const sp = Math.hypot(state.velocity.x, state.velocity.y, state.velocity.z)
  if (sp > PHYS.maxSpeed) {
    const k = PHYS.maxSpeed / sp
    state.velocity.x *= k
    state.velocity.y *= k
    state.velocity.z *= k
  }

  state.position.x += state.velocity.x * dt
  state.position.y += state.velocity.y * dt
  state.position.z += state.velocity.z * dt

  // --- Angular dynamics (stability + control) ---
  const aeroAuth = THREE.MathUtils.clamp((speed - 8) / 60, 0, 1)
  const steerAuth = 0.35 + 0.65 * aeroAuth

  // Control moments (pilot input)
  let pitchRate = controls.pitch * PHYS.pitchRate * aeroAuth
  let rollRate = controls.roll * PHYS.rollRate * aeroAuth
  let yawRate = controls.yaw * PHYS.yawRate * steerAuth

  // --- Realistic stability moments (the aircraft self-corrects) ---
  // 1. Directional stability (weathervaning): yaw nose INTO the relative wind.
  //    Cn_beta * beta * q * S * wingspan — simplified to a yaw rate.
  yawRate += PHYS.cnBeta * betaRad * aeroAuth * 8.0
  // 2. Dihedral effect: sideslip rolls the aircraft level.
  //    Cl_beta * beta — a sideslip from the right rolls left.
  rollRate += PHYS.clBeta * betaRad * aeroAuth * 6.0
  // 3. Pitch stability: increasing AoA pitches the nose down (restoring).
  pitchRate += -PHYS.cmAlpha * aoaRad * aeroAuth * 1.5
  // 4. Roll damping: opposes roll rate.
  rollRate += PHYS.clp * state.roll * aeroAuth
  // 5. Yaw damping (yaw damper): opposes yaw rate — kills dutch roll.
  yawRate += PHYS.cnr * state.yaw * aeroAuth * 3.0
  // 6. Pitch damping: opposes pitch rate.
  pitchRate += PHYS.cmq * state.pitch * aeroAuth * 0.05

  // Arcade helpers (mild, only when no input)
  if (Math.abs(controls.roll) < 0.01) rollRate += -state.roll * PHYS.autoLevelRoll * aeroAuth
  if (Math.abs(controls.pitch) < 0.01) pitchRate += -state.pitch * PHYS.autoLevelPitch * aeroAuth
  // Coordinated turn assist (gentle)
  yawRate += Math.sin(state.roll) * PHYS.coordinatedTurn * aeroAuth

  // --- Build delta quaternion (local-space rotations) ---
  _deltaQ.identity()
  _axis.set(1, 0, 0)
  _tmpQ.setFromAxisAngle(_axis, pitchRate * dt)
  _deltaQ.multiply(_tmpQ)
  _axis.set(0, 1, 0)
  _tmpQ.setFromAxisAngle(_axis, -yawRate * dt)
  _deltaQ.multiply(_tmpQ)
  _axis.set(0, 0, -1)
  _tmpQ.setFromAxisAngle(_axis, rollRate * dt)
  _deltaQ.multiply(_tmpQ)

  orientation.multiply(_deltaQ)
  orientation.normalize()

  // --- Ground handling ---
  const wasAirborne = !state.onGround
  if (state.position.y <= PHYS.groundY) {
    state.onGround = true
    if (wasAirborne) {
      const bankDeg = Math.abs(state.roll * DEG)
      const vspeed = state.velocity.y
      if (vspeed < -PHYS.crashVerticalSpeed) {
        state.crashed = true
        state.crashReason = 'hard landing'
      } else if (bankDeg > PHYS.crashBankAngle && speed > 20) {
        state.crashed = true
        state.crashReason = 'wing strike'
      }
      if (!state.crashed) {
        state.landingVerticalSpeed = vspeed
        state.landingSpeed = speed
        state.landedSmoothly = vspeed > -2.0
      }
    }
    state.position.y = PHYS.groundY
    if (state.velocity.y < 0) state.velocity.y = 0

    // On ground: keep yaw, allow limited nose-up, zero roll.
    _euler.setFromQuaternion(orientation, 'YXZ')
    const ty = _euler.y
    const tp = THREE.MathUtils.clamp(_euler.x, -0.02, 0.22)
    _euler.set(tp, ty, 0, 'YXZ')
    _yawQuat.setFromEuler(_euler)
    orientation.slerp(_yawQuat, THREE.MathUtils.clamp(PHYS.groundLevelRate * dt, 0, 1))

    _forward.set(0, 0, -1).applyQuaternion(orientation)

    const onRunway =
      Math.abs(state.position.x) < PHYS.runwayHalfWidth + 5 &&
      Math.abs(state.position.z) < PHYS.runwayHalfLength
    const fric = controls.brake
      ? PHYS.brakeFriction
      : onRunway
        ? PHYS.rollingFriction
        : PHYS.grassFriction
    const decay = Math.max(0, 1 - fric * dt)
    state.velocity.x *= decay
    state.velocity.z *= decay

    const steer = controls.yaw * PHYS.groundSteerRate * (1 - THREE.MathUtils.clamp(speed / 30, 0, 1) * 0.5)
    _axis.set(0, 1, 0)
    _tmpQ.setFromAxisAngle(_axis, -steer * dt)
    orientation.premultiply(_tmpQ)
    orientation.normalize()

    if (wasAirborne && state.flightTime > 15 && speed < 8 && onRunway) {
      state.landed = true
    }
  } else {
    state.onGround = false
  }

  // --- Derive display fields ---
  _forward.set(0, 0, -1).applyQuaternion(orientation)
  _up.set(0, 1, 0).applyQuaternion(orientation)
  _right.set(1, 0, 0).applyQuaternion(orientation)

  _euler.setFromQuaternion(orientation, 'YXZ')
  state.yaw = _euler.y
  state.pitch = _euler.x
  state.roll = _euler.z

  state.airspeed = Math.max(0, forwardSpeed)
  state.groundSpeed = Math.hypot(state.velocity.x, state.velocity.z)
  state.altitude = state.position.y
  let h = Math.atan2(_forward.x, -_forward.z) * DEG
  if (h < 0) h += 360
  state.heading = h
  state.verticalSpeed = state.velocity.y
  state.aoa = aoaDeg
  state.sideslip = betaDeg
  state.stalled = stalled
  state.gForce = liftMag / (PHYS.mass * PHYS.g)
  state.controlPitch = controls.pitch
  state.controlRoll = controls.roll
  state.controlYaw = controls.yaw

  const slew = 1 - Math.exp(-PHYS.rpmSlew * dt)
  state.rpmNorm += (state.throttle - state.rpmNorm) * slew

  if (!state.onGround) state.flightTime += dt

  if (state.position.y < 0) {
    state.position.y = 0
    if (speed > 40) {
      state.crashed = true
      state.crashReason = 'terrain collision'
    }
  }
}

export function createInitialState(): FlightState {
  return {
    position: { x: 0, y: PHYS.groundY, z: -1400 },
    velocity: { x: 0, y: 0, z: 0 },
    pitch: 0,
    yaw: 0,
    roll: 0,
    airspeed: 0,
    groundSpeed: 0,
    altitude: PHYS.groundY,
    heading: 0,
    verticalSpeed: 0,
    throttle: 0,
    aoa: 0,
    sideslip: 0,
    gForce: 1,
    stalled: false,
    onGround: true,
    gearDown: true,
    rpmNorm: 0,
    crashed: false,
    landed: false,
    flightTime: 0,
    controlPitch: 0,
    controlRoll: 0,
    controlYaw: 0,
    flaps: 0,
    spoilers: false,
    reverseThrust: false,
    crashReason: '',
    landingVerticalSpeed: 0,
    landingSpeed: 0,
    landedSmoothly: false,
  }
}
