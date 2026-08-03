// Realistic flight physics based on blade-element / coefficient model.
// References:
//   - Jakob Maier "Simple Physics-based Flight Simulation"
//   - MSFS Flight Model Physics docs
//   - ERAU "Aircraft Stability & Control"
//
// Key design principles:
//  1. ON GROUND: wheels constrain the aircraft — no sideways aerodynamic
//     drift, no weathervaning (nose wheel steering + brakes dominate).
//     Sideslip = 0 on the ground. Only forward speed + friction matter.
//  2. IN AIR: full aerodynamic model with stability derivatives.
//  3. Realistic acceleration: thrust >> low-speed drag, so takeoff roll
//     accelerates linearly to Vr (~75 m/s) over ~15-20s at full throttle.
import * as THREE from 'three'
import type { FlightControls, FlightState } from './types'
import type { Weather } from './weather'

export const PHYS = {
  mass: 65000, // kg
  wingArea: 124.6, // m^2
  maxThrust: 600_000, // N (realistic for 737-800: ~240kN × 2 engines, slightly boosted for arcade)
  reverseThrust: 200_000,
  cl0: 0.25,
  clAlpha: 0.11, // per degree
  clMax: 2.0, // with flaps, 737 CL_max ~ 2.0-2.5
  flapsClBoost: 0.3, // extra CL per flap stage (also raises effective CL_max)
  flapsCdBoost: 0.015,
  spoilerCdBoost: 0.06,
  cd0: 0.022,
  inducedK: 0.045,
  stallAoA: 15, // degrees
  g: 9.81,
  // control authority (rad/s) — realistic for a transport aircraft
  // 737 pitch rate ~3°/s, roll ~5°/s. Boosted slightly for playability.
  pitchRate: 0.15, // ~8.6°/s
  rollRate: 0.6, // ~34°/s (arcade-friendly; real is ~5°/s)
  yawRate: 0.12, // ~7°/s
  // stability derivatives (only active IN AIR)
  cnBeta: 0.06, // directional stability
  clBeta: -0.13, // dihedral effect
  cmAlpha: -0.4, // pitch stability
  clp: -0.4, // roll damping
  cnr: -0.12, // yaw damping
  cmq: -5.0, // pitch damping
  // ground effect
  groundEffectHeight: 16,
  groundEffectStrength: 0.4,
  // ground
  groundY: 3.2,
  rollingFriction: 0.015, // very low — wheels roll freely
  brakeFriction: 1.2,
  grassFriction: 0.25,
  groundSteerRate: 0.8,
  groundLevelRate: 5.0,
  runwayHalfWidth: 30,
  runwayHalfLength: 1500,
  // misc
  autoLevelRoll: 0.5,
  autoLevelPitch: 0.2,
  coordinatedTurn: 0.3,
  rpmSlew: 0.8,
  maxSpeed: 290,
  crashVerticalSpeed: 5.0,
  crashBankAngle: 50,
  // realistic speeds
  rotationSpeed: 70, // m/s — Vr for 737 ~ 250 km/h
  takeoffSpeed: 78, // m/s — V2
  approachSpeed: 75, // m/s — Vref
} as const

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

  // --- Orientation basis ---
  _forward.set(0, 0, -1).applyQuaternion(orientation)
  _up.set(0, 1, 0).applyQuaternion(orientation)
  _right.set(1, 0, 0).applyQuaternion(orientation)

  // --- Determine ground contact BEFORE aerodynamics ---
  const wasAirborne = !state.onGround
  const nowOnGround = state.position.y <= PHYS.groundY + 0.01

  // --- Air velocity (airspeed = velocity - wind) ---
  _windVec.set(0, 0, 0)
  if (weather) {
    _windVec.set(weather.windX, 0, weather.windZ)
  }
  // ON GROUND: the wheels hold the aircraft on the runway. Crosswind creates
  // a small yaw tendency (nose tries to follow wind) but does NOT push the
  // plane sideways — tires have lateral grip. So we use ground velocity for
  // drag/aero on the ground, ignoring wind for forward motion.
  let airVx: number, airVy: number, airVz: number
  if (nowOnGround) {
    // On the ground, only the forward component of motion matters; the
    // wheels kill sideways drift. Use ground velocity directly (no wind).
    airVx = 0
    airVy = state.velocity.y
    airVz = state.velocity.z
  } else {
    airVx = state.velocity.x - _windVec.x
    airVy = state.velocity.y - _windVec.y
    airVz = state.velocity.z - _windVec.z
  }

  // --- Airspeed & angles ---
  const speed = Math.hypot(airVx, airVy, airVz)
  _inv.copy(orientation).invert()
  _vLocal.set(airVx, airVy, airVz).applyQuaternion(_inv)
  let forwardSpeed = -_vLocal.z
  const sideSpeed = _vLocal.x

  // AoA: only meaningful with forward airspeed. On the ground at low speed,
  // AoA is just the pitch angle (fuselage angle), not aerodynamic AoA.
  let aoaRad: number
  if (forwardSpeed > 2) {
    aoaRad = Math.atan2(-_vLocal.y, forwardSpeed)
  } else {
    aoaRad = 0 // negligible airspeed → no meaningful AoA
  }
  const aoaDeg = aoaRad * DEG
  const aoaAbs = Math.abs(aoaDeg)

  // Sideslip: only meaningful IN AIR with forward airspeed. On the ground,
  // wheels hold the aircraft on the runway heading — sideslip = 0.
  let betaRad = 0
  let betaDeg = 0
  if (!nowOnGround && forwardSpeed > 5) {
    betaRad = Math.atan2(sideSpeed, forwardSpeed)
    betaDeg = betaRad * DEG
  }

  // --- Air density ---
  const rho = 1.225 * Math.exp(-state.altitude / 10000)

  // --- Flaps & spoilers ---
  const flapsStage = state.flaps
  const clFlaps = flapsStage * PHYS.flapsClBoost
  const cdFlaps = flapsStage * PHYS.flapsCdBoost
  const cdSpoiler = state.spoilers ? PHYS.spoilerCdBoost : 0

  // --- Ground effect ---
  const agl = Math.max(0, state.altitude)
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

  // --- Forces ---
  _lift.copy(_up).multiplyScalar(liftMag)
  _vDir.set(airVx, airVy, airVz)
  if (_vDir.lengthSq() < 1e-4) _vDir.set(0, 0, -1)
  _vDir.normalize()
  _drag.copy(_vDir).multiplyScalar(-dragMag)
  // Side force from sideslip (only in air)
  const sideForceMag = !nowOnGround ? q * PHYS.wingArea * 0.3 * betaRad : 0
  _side.copy(_right).multiplyScalar(-sideForceMag)

  // --- Thrust ---
  let thrustMag: number
  if (state.reverseThrust && nowOnGround) {
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

  // --- Angular dynamics ---
  // Authority scales with airspeed (need airflow over control surfaces).
  const aeroAuth = THREE.MathUtils.clamp((forwardSpeed - 5) / 50, 0, 1)
  const steerAuth = 0.35 + 0.65 * aeroAuth

  let pitchRate = controls.pitch * PHYS.pitchRate * aeroAuth
  let rollRate = controls.roll * PHYS.rollRate * aeroAuth
  let yawRate = controls.yaw * PHYS.yawRate * steerAuth

  // Stability moments — ONLY IN AIR (wheels hold heading on ground)
  if (!nowOnGround) {
    // Weathervaning: yaw nose into relative wind (gentle)
    yawRate += PHYS.cnBeta * betaRad * aeroAuth * 1.5
    // Dihedral: sideslip rolls level (gentle)
    rollRate += PHYS.clBeta * betaRad * aeroAuth * 1.0
    // Pitch stability: nose-down with increasing AoA (gentle restoring)
    pitchRate += -PHYS.cmAlpha * aoaRad * aeroAuth * 0.3
    // Roll damping
    rollRate += PHYS.clp * state.roll * aeroAuth
    // Yaw damping (yaw damper)
    yawRate += PHYS.cnr * state.yaw * aeroAuth * 1.5
    // Pitch damping
    pitchRate += PHYS.cmq * state.pitch * aeroAuth * 0.02
    // Mild auto-level when no input
    if (Math.abs(controls.roll) < 0.01) rollRate += -state.roll * PHYS.autoLevelRoll * aeroAuth
    if (Math.abs(controls.pitch) < 0.01) pitchRate += -state.pitch * PHYS.autoLevelPitch * aeroAuth
    // Coordinated turn assist (gentle — just enough to keep nose following bank)
    yawRate += Math.sin(state.roll) * PHYS.coordinatedTurn * aeroAuth
  }

  _deltaQ.identity()
  // pitch (nose up = +rotation about local X)
  _axis.set(1, 0, 0)
  _tmpQ.setFromAxisAngle(_axis, pitchRate * dt)
  _deltaQ.multiply(_tmpQ)
  // yaw (nose right => rotation about +Y is CCW from above = nose LEFT,
  // so nose RIGHT = negative about +Y)
  _axis.set(0, 1, 0)
  _tmpQ.setFromAxisAngle(_axis, -yawRate * dt)
  _deltaQ.multiply(_tmpQ)
  // roll: aviation convention — positive roll = right wing down (bank right).
  // In Three.js Euler YXZ, positive z = CCW about +Z = left wing down (bank left).
  // So bank right = NEGATIVE rotation about +Z.
  _axis.set(0, 0, 1)
  _tmpQ.setFromAxisAngle(_axis, -rollRate * dt)
  _deltaQ.multiply(_tmpQ)

  orientation.multiply(_deltaQ)
  orientation.normalize()

  // --- Ground handling ---
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

    // On the ground: wheels hold the aircraft on its heading. Kill ONLY the
    // sideways (local X) velocity component — preserve forward (Z) and
    // vertical (Y) exactly. This prevents crosswind drift without losing
    // forward speed when the nose is raised for takeoff.
    _inv.copy(orientation).invert()
    _vLocal.set(state.velocity.x, state.velocity.y, state.velocity.z).applyQuaternion(_inv)
    _vLocal.x = 0 // kill sideways drift (tire lateral grip)
    // rebuild world velocity from the corrected local (0, vy, vz_local)
    _vLocal.applyQuaternion(orientation)
    state.velocity.x = _vLocal.x
    state.velocity.y = _vLocal.y
    state.velocity.z = _vLocal.z

    // On the ground: keep yaw, clamp pitch to rotation range, zero roll.
    // Use direct setFromEuler (not slerp) for a HARD clamp — the pilot can
    // pull back, but the tail/wheels prevent exceeding ~12.5° on the ground.
    _euler.setFromQuaternion(orientation, 'YXZ')
    const ty = _euler.y
    const tp = THREE.MathUtils.clamp(_euler.x, -0.02, 0.22) // hard clamp ~12.5°
    _euler.set(tp, ty, 0, 'YXZ')
    orientation.setFromEuler(_euler)

    _forward.set(0, 0, -1).applyQuaternion(orientation)

    // Friction (very low rolling resistance on runway)
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

    // Nose wheel steering (rudder on ground)
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
  // Convert roll to aviation convention: positive = bank right.
  // Three.js Euler YXZ z is positive for CCW about +Z = bank left, so flip.
  state.roll = -_euler.z

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
    // Start at the SOUTH end of the runway (z=+1400), facing NORTH (-Z),
    // so the aircraft has the full 2900m runway ahead of it.
    position: { x: 0, y: PHYS.groundY, z: 1400 },
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
