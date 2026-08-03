// Flight physics: simplified Newtonian aerodynamics tuned for a Boeing 737-800
// arcade feel. Operates on a mutable FlightState + a THREE.Quaternion orientation.
import * as THREE from 'three'
import type { FlightControls, FlightState } from './types'

// --- Airframe constants (737-800, arcade-tuned) ---
export const PHYS = {
  mass: 65000, // kg (half-loaded)
  wingArea: 124.6, // m^2
  maxThrust: 1_200_000, // N (arcade-boosted for snappy acceleration)
  reverseThrust: 400_000, // N (reverse thrust for braking after landing)
  cl0: 0.25,
  clAlpha: 0.11, // per degree
  clMax: 1.6,
  // flaps: multiply CL and add drag
  flapsClBoost: 0.4, // extra CL per flap stage
  flapsCdBoost: 0.015, // extra CD per flap stage
  flapsMaxStages: 3, // 0..3
  // spoilers/airbrake
  spoilerCdBoost: 0.06, // extra CD when spoilers deployed
  cd0: 0.022,
  inducedK: 0.045,
  stallAoA: 15, // degrees
  g: 9.81,
  // control authority (rad/s) — tuned for controllable airliner feel
  pitchRate: 0.5, // rad/s
  rollRate: 1.6, // rad/s
  yawRate: 0.45, // rad/s
  // ground
  groundY: 3.2, // airplane center height when on gear
  gearHeight: 3.2,
  rollingFriction: 0.04, // per-second fractional decay (gentle coast)
  brakeFriction: 1.4, // per-second decay when braking
  grassFriction: 0.8,
  groundSteerRate: 0.7, // rad/s yaw steering on ground
  groundLevelRate: 4.0, // how fast orientation levels on ground
  // runway bounds (centered on origin, along Z)
  runwayHalfWidth: 30,
  runwayHalfLength: 1500,
  // misc
  autoLevelRoll: 1.2, // arcade auto-level roll rate
  autoLevelPitch: 0.6, // mild pitch return
  coordinatedTurn: 0.8, // yaw toward bank for coordinated turns
  rpmSlew: 0.9, // engine spool rate
  maxSpeed: 290, // m/s soft cap
  // crash thresholds
  crashVerticalSpeed: 5.0, // m/s — hard landing
  crashBankAngle: 50, // degrees — excessive bank on ground
} as const

// Reusable temporaries (avoid per-frame allocations).
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
const _deltaQ = new THREE.Quaternion()
const _euler = new THREE.Euler()
const _axis = new THREE.Vector3()
const _yawQuat = new THREE.Quaternion()
const _tmpQ = new THREE.Quaternion()
const _inv = new THREE.Quaternion()

const DEG = 180 / Math.PI

/**
 * Advance the flight model by dt seconds.
 * Mutates `state` (position/velocity/derived fields) and `orientation`.
 */
export function stepFlight(
  state: FlightState,
  orientation: THREE.Quaternion,
  controls: FlightControls,
  dt: number
): void {
  if (state.crashed) {
    // crashed: decay velocity & let it sit
    state.velocity.x *= 0.9
    state.velocity.z *= 0.9
    state.velocity.y = 0
    return
  }

  // --- Orientation basis vectors (local axes in world space) ---
  _forward.set(0, 0, -1).applyQuaternion(orientation) // nose direction
  _up.set(0, 1, 0).applyQuaternion(orientation)
  _right.set(1, 0, 0).applyQuaternion(orientation)

  // --- Airspeed & AoA ---
  const speed = Math.hypot(state.velocity.x, state.velocity.y, state.velocity.z)
  _inv.copy(orientation).invert()
  _vLocal.copy(state.velocity as unknown as THREE.Vector3).applyQuaternion(_inv)
  const forwardSpeed = -_vLocal.z // along nose
  const aoaRad = Math.atan2(-_vLocal.y, Math.max(forwardSpeed, 0.1))
  const aoaDeg = aoaRad * DEG
  const aoaAbs = Math.abs(aoaDeg)

  // --- Air density (exponential atmosphere) ---
  const rho = 1.225 * Math.exp(-state.altitude / 10000)

  // --- Flaps & spoilers effect on coefficients ---
  const flapsStage = state.flaps // 0..3
  const clFlaps = flapsStage * PHYS.flapsClBoost
  const cdFlaps = flapsStage * PHYS.flapsCdBoost
  const cdSpoiler = state.spoilers ? PHYS.spoilerCdBoost : 0

  // --- Lift / drag coefficients ---
  let cl: number
  let stalled = false
  if (aoaAbs < PHYS.stallAoA) {
    cl = PHYS.cl0 + PHYS.clAlpha * aoaDeg + clFlaps
    cl = THREE.MathUtils.clamp(cl, -PHYS.clMax, PHYS.clMax)
  } else {
    // post-stall: lift drops sharply
    stalled = true
    const drop = THREE.MathUtils.clamp(1 - (aoaAbs - PHYS.stallAoA) / 12, 0.25, 1)
    const clPeak = PHYS.cl0 + PHYS.clAlpha * PHYS.stallAoA
    cl = Math.sign(aoaDeg) * clPeak * drop
  }
  const cd = PHYS.cd0 + PHYS.inducedK * cl * cl + cdFlaps + cdSpoiler

  const q = 0.5 * rho * speed * speed // dynamic pressure
  const liftMag = q * PHYS.wingArea * cl
  const dragMag = q * PHYS.wingArea * cd

  // --- Forces (world space) ---
  _lift.copy(_up).multiplyScalar(liftMag)
  _vDir.copy(state.velocity as unknown as THREE.Vector3)
  if (_vDir.lengthSq() < 1e-4) _vDir.set(0, 0, -1)
  _vDir.normalize()
  _drag.copy(_vDir).multiplyScalar(-dragMag)

  // --- Thrust (forward or reverse) ---
  let thrustMag: number
  if (state.reverseThrust && state.onGround) {
    // reverse thrust opposes forward motion
    thrustMag = -state.throttle * PHYS.reverseThrust
  } else {
    thrustMag = state.throttle * PHYS.maxThrust
  }
  _thrust.copy(_forward).multiplyScalar(thrustMag)
  _grav.set(0, -PHYS.g * PHYS.mass, 0)

  _force.set(0, 0, 0)
  _force.add(_lift).add(_drag).add(_thrust).add(_grav)

  // --- Integrate linear motion ---
  const ax = _force.x / PHYS.mass
  const ay = _force.y / PHYS.mass
  const az = _force.z / PHYS.mass
  state.velocity.x += ax * dt
  state.velocity.y += ay * dt
  state.velocity.z += az * dt

  // soft speed cap
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

  // --- Angular control ---
  const aeroAuth = THREE.MathUtils.clamp((speed - 8) / 60, 0, 1)
  const steerAuth = 0.35 + 0.65 * aeroAuth

  let pitchRate = controls.pitch * PHYS.pitchRate * aeroAuth
  let rollRate = controls.roll * PHYS.rollRate * aeroAuth
  let yawRate = controls.yaw * PHYS.yawRate * steerAuth

  // arcade auto-level when no input
  if (Math.abs(controls.roll) < 0.01) rollRate += -state.roll * PHYS.autoLevelRoll * aeroAuth
  if (Math.abs(controls.pitch) < 0.01) pitchRate += -state.pitch * PHYS.autoLevelPitch * aeroAuth
  // coordinated turn: yaw toward bank so nose follows the turn
  yawRate += Math.sin(state.roll) * PHYS.coordinatedTurn * aeroAuth

  // Build local-space delta quaternion via explicit axes.
  _deltaQ.identity()
  // pitch (nose up = +rotation about local X)
  _axis.set(1, 0, 0)
  _tmpQ.setFromAxisAngle(_axis, pitchRate * dt)
  _deltaQ.multiply(_tmpQ)
  // yaw (nose right => negative about +Y)
  _axis.set(0, 1, 0)
  _tmpQ.setFromAxisAngle(_axis, -yawRate * dt)
  _deltaQ.multiply(_tmpQ)
  // roll (right => positive about forward -Z => axis (0,0,-1))
  _axis.set(0, 0, -1)
  _tmpQ.setFromAxisAngle(_axis, rollRate * dt)
  _deltaQ.multiply(_tmpQ)

  orientation.multiply(_deltaQ)
  orientation.normalize()

  // --- Ground handling ---
  const wasAirborne = !state.onGround
  // Determine ground contact: at or below gear height. Once lift pushes the
  // plane above groundY, it is airborne (so it can actually take off).
  if (state.position.y <= PHYS.groundY) {
    state.onGround = true
    // touchdown detection
    if (wasAirborne) {
      const bankDeg = Math.abs(state.roll * DEG)
      const vspeed = state.velocity.y
      // crash on: hard vertical impact, or excessive bank, or off-runway at speed
      if (vspeed < -PHYS.crashVerticalSpeed) {
        state.crashed = true
        state.crashReason = 'hard landing'
      } else if (bankDeg > PHYS.crashBankAngle && speed > 20) {
        state.crashed = true
        state.crashReason = 'wing strike'
      }
      // record landing metrics for scoring
      if (!state.crashed) {
        state.landingVerticalSpeed = vspeed
        state.landingSpeed = speed
        state.landedSmoothly = vspeed > -2.0
      }
    }
    // rest on the gear; kill only downward velocity (let future lift raise it)
    state.position.y = PHYS.groundY
    if (state.velocity.y < 0) state.velocity.y = 0

    // On the ground: keep yaw, allow nose-up rotation (clamped, so the
    // player can rotate for takeoff), prevent nose-down into the runway,
    // and zero out roll. This lets the airplane lift its nose wheel.
    _euler.setFromQuaternion(orientation, 'YXZ')
    const ty = _euler.y
    const tp = THREE.MathUtils.clamp(_euler.x, -0.02, 0.22) // up to ~12.5° (below stall)
    _euler.set(tp, ty, 0, 'YXZ')
    _yawQuat.setFromEuler(_euler)
    orientation.slerp(_yawQuat, THREE.MathUtils.clamp(PHYS.groundLevelRate * dt, 0, 1))

    // recompute forward after slerp for steering
    _forward.set(0, 0, -1).applyQuaternion(orientation)

    // friction
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

    // ground steering (rudder) — stronger at low speed
    const steer = controls.yaw * PHYS.groundSteerRate * (1 - THREE.MathUtils.clamp(speed / 30, 0, 1) * 0.5)
    _axis.set(0, 1, 0)
    _tmpQ.setFromAxisAngle(_axis, -steer * dt)
    orientation.premultiply(_tmpQ)
    orientation.normalize()

    // landing success: was airborne a while, now slow & on runway
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
  state.stalled = stalled
  state.gForce = liftMag / (PHYS.mass * PHYS.g)
  state.controlPitch = controls.pitch
  state.controlRoll = controls.roll
  state.controlYaw = controls.yaw

  // engine rpm slews toward throttle
  const slew = 1 - Math.exp(-PHYS.rpmSlew * dt)
  state.rpmNorm += (state.throttle - state.rpmNorm) * slew

  if (!state.onGround) state.flightTime += dt

  // crash if flew into terrain at high speed off-runway (safety)
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
