// Shared types for the flight simulator.
// Coordinate system: Y-up. Airplane forward = -Z, up = +Y, right = +X.

export interface Vec3 {
  x: number
  y: number
  z: number
}

export interface FlightControls {
  pitch: number // -1 (push/nose down) .. +1 (pull/nose up)
  roll: number // -1 (left) .. +1 (right)
  yaw: number // -1 (left) .. +1 (right)
  throttle: number // 0..1 (target throttle set by Shift/Ctrl)
  brake: boolean
}

export interface FlightState {
  position: Vec3
  velocity: Vec3

  // Euler angles in radians, derived from orientation quaternion.
  pitch: number
  yaw: number // heading
  roll: number

  airspeed: number // m/s (forward speed through air)
  groundSpeed: number // m/s
  altitude: number // m
  heading: number // degrees 0..360
  verticalSpeed: number // m/s
  throttle: number // 0..1 actual
  aoa: number // degrees
  gForce: number
  stalled: boolean
  onGround: boolean
  gearDown: boolean
  rpmNorm: number // 0..1 engine rpm normalized
  crashed: boolean
  landed: boolean
  flightTime: number // seconds airborne

  // control surface deflections (for visual + HUD), -1..1
  controlPitch: number
  controlRoll: number
  controlYaw: number
}

export type CameraMode = 'chase' | 'cockpit' | 'tower'

export type GamePhase = 'menu' | 'flying' | 'paused' | 'ended'
