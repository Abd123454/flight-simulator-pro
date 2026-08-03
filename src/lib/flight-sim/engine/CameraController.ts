// Camera controller: chase / cockpit / tower modes with frame-rate-independent
// exponential damping for the chase cam.
import * as THREE from 'three'
import type { CameraMode, FlightState } from '../types'

const _desired = new THREE.Vector3()
const _lookTarget = new THREE.Vector3()
const _eye = new THREE.Vector3()
const _fwd = new THREE.Vector3()
const _up = new THREE.Vector3()

export class CameraController {
  camera: THREE.PerspectiveCamera
  mode: CameraMode = 'chase'
  private towerPos = new THREE.Vector3(-120, 45, -500)

  constructor(aspect: number) {
    this.camera = new THREE.PerspectiveCamera(60, aspect, 0.5, 12000)
  }

  cycle(): CameraMode {
    this.mode = this.mode === 'chase' ? 'cockpit' : this.mode === 'cockpit' ? 'tower' : 'chase'
    return this.mode
  }

  setMode(m: CameraMode) {
    this.mode = m
  }

  resize(aspect: number) {
    this.camera.aspect = aspect
    this.camera.updateProjectionMatrix()
  }

  update(state: FlightState, orientation: THREE.Quaternion, dt: number) {
    switch (this.mode) {
      case 'chase':
        this.updateChase(state, orientation, dt)
        break
      case 'cockpit':
        this.updateCockpit(state, orientation)
        break
      case 'tower':
        this.updateTower(state)
        break
    }
  }

  private updateChase(state: FlightState, orientation: THREE.Quaternion, dt: number) {
    // offset in airplane local space: behind (+Z) and above (+Y)
    _eye.set(0, 13, 48)
    _desired.copy(_eye).applyQuaternion(orientation)
    _desired.x += state.position.x
    _desired.y += state.position.y
    _desired.z += state.position.z

    const k = 1 - Math.exp(-dt * 4.5)
    this.camera.position.lerp(_desired, k)

    // look at a point ahead of the airplane
    _fwd.set(0, 0, -1).applyQuaternion(orientation)
    _lookTarget.set(
      state.position.x + _fwd.x * 40,
      state.position.y + _fwd.y * 40 + 2,
      state.position.z + _fwd.z * 40
    )
    this.camera.up.set(0, 1, 0)
    this.camera.lookAt(_lookTarget)
  }

  private updateCockpit(state: FlightState, orientation: THREE.Quaternion) {
    // pilot eye position (local)
    _eye.set(0, 1.7, -13)
    _desired.copy(_eye).applyQuaternion(orientation)
    this.camera.position.set(
      state.position.x + _desired.x,
      state.position.y + _desired.y,
      state.position.z + _desired.z
    )
    // look forward along nose, slightly down
    _fwd.set(0, -0.06, -1).applyQuaternion(orientation).normalize()
    _up.set(0, 1, 0).applyQuaternion(orientation)
    _lookTarget.copy(this.camera.position).add(_fwd.multiplyScalar(50))
    this.camera.up.copy(_up)
    this.camera.lookAt(_lookTarget)
  }

  private updateTower(state: FlightState) {
    this.camera.position.copy(this.towerPos)
    _lookTarget.set(state.position.x, state.position.y, state.position.z)
    this.camera.up.set(0, 1, 0)
    this.camera.lookAt(_lookTarget)
  }
}
