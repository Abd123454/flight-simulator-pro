// Keyboard input controller. Maps keys to FlightControls and edge events.
// Tracks BOTH e.code and e.key (lowercased) so it works on real keyboards
// (code="ShiftLeft") and with synthetic/test events (key="shift").
import type { FlightControls } from '../types'

export class InputController {
  private down = new Set<string>()
  private gearToggleQueued = false
  private cameraSwitchQueued = false
  private pauseQueued = false
  private debugQueued = false
  private resetQueued = false
  private flapsUpQueued = false
  private flapsDownQueued = false
  private spoilerToggleQueued = false
  private reverseToggleQueued = false
  enabled = true
  sensitivity = 1

  private add(e: KeyboardEvent) {
    if (e.code) this.down.add(e.code)
    if (e.key) this.down.add(e.key.toLowerCase())
  }
  private remove(e: KeyboardEvent) {
    if (e.code) this.down.delete(e.code)
    if (e.key) {
      this.down.delete(e.key.toLowerCase())
      if (e.key === 'Shift') this.down.delete('shift')
    }
  }
  private has(...names: string[]): boolean {
    for (const n of names) if (this.down.has(n)) return true
    return false
  }

  private onKeyDown = (e: KeyboardEvent) => {
    const code = e.code
    if (
      [
        'ArrowUp',
        'ArrowDown',
        'ArrowLeft',
        'ArrowRight',
        'Space',
        'ShiftLeft',
        'ShiftRight',
        'ControlLeft',
        'ControlRight',
      ].includes(code)
    ) {
      e.preventDefault()
    }
    const already = this.has(code, e.key?.toLowerCase() ?? '')
    this.add(e)
    if (already) return // ignore repeats for edge events
    if (code === 'KeyG' || e.key === 'g' || e.key === 'G') this.gearToggleQueued = true
    if (code === 'KeyC' || e.key === 'c' || e.key === 'C') this.cameraSwitchQueued = true
    if (code === 'Escape' || e.key === 'Escape') this.pauseQueued = true
    if (code === 'F3' || e.key === 'F3') {
      e.preventDefault()
      this.debugQueued = true
    }
    if (code === 'KeyR' || e.key === 'r' || e.key === 'R') this.resetQueued = true
    // flaps: F = extend, V = retract (V near F, avoids browser conflict)
    if (code === 'KeyF' || e.key === 'f' || e.key === 'F') this.flapsDownQueued = true
    if (code === 'KeyV' || e.key === 'v' || e.key === 'V') this.flapsUpQueued = true
    // spoilers / airbrake
    if (code === 'KeyB' || e.key === 'b' || e.key === 'B') this.spoilerToggleQueued = true
    // reverse thrust
    if (code === 'KeyX' || e.key === 'x' || e.key === 'X') this.reverseToggleQueued = true
  }

  private onKeyUp = (e: KeyboardEvent) => {
    this.remove(e)
  }

  attach(target: HTMLElement | Window = window) {
    target.addEventListener('keydown', this.onKeyDown as EventListener)
    target.addEventListener('keyup', this.onKeyUp as EventListener)
  }

  detach(target: HTMLElement | Window = window) {
    target.removeEventListener('keydown', this.onKeyDown as EventListener)
    target.removeEventListener('keyup', this.onKeyUp as EventListener)
  }

  getControls(): FlightControls {
    let pitch = 0
    if (this.has('KeyS', 's', 'ArrowDown', 'arrowdown')) pitch += 1
    if (this.has('KeyW', 'w', 'ArrowUp', 'arrowup')) pitch -= 1
    let roll = 0
    if (this.has('KeyD', 'd', 'ArrowRight', 'arrowright')) roll += 1
    if (this.has('KeyA', 'a', 'ArrowLeft', 'arrowleft')) roll -= 1
    let yaw = 0
    if (this.has('KeyE', 'e')) yaw += 1
    if (this.has('KeyQ', 'q')) yaw -= 1

    pitch = Math.max(-1, Math.min(1, pitch * this.sensitivity))
    roll = Math.max(-1, Math.min(1, roll * this.sensitivity))
    yaw = Math.max(-1, Math.min(1, yaw * this.sensitivity))

    const brake = this.has('Space', ' ')
    return { pitch, roll, yaw, throttle: 0, brake }
  }

  consumeGearToggle() {
    const v = this.gearToggleQueued
    this.gearToggleQueued = false
    return v
  }
  consumeCameraSwitch() {
    const v = this.cameraSwitchQueued
    this.cameraSwitchQueued = false
    return v
  }
  consumePause() {
    const v = this.pauseQueued
    this.pauseQueued = false
    return v
  }
  consumeDebug() {
    const v = this.debugQueued
    this.debugQueued = false
    return v
  }
  consumeReset() {
    const v = this.resetQueued
    this.resetQueued = false
    return v
  }
  consumeFlapsDown() {
    const v = this.flapsDownQueued
    this.flapsDownQueued = false
    return v
  }
  consumeFlapsUp() {
    const v = this.flapsUpQueued
    this.flapsUpQueued = false
    return v
  }
  consumeSpoilerToggle() {
    const v = this.spoilerToggleQueued
    this.spoilerToggleQueued = false
    return v
  }
  consumeReverseToggle() {
    const v = this.reverseToggleQueued
    this.reverseToggleQueued = false
    return v
  }

  isThrottleUp() {
    return this.has('ShiftLeft', 'ShiftRight', 'shift')
  }
  isThrottleDown() {
    return this.has('ControlLeft', 'ControlRight', 'control')
  }
}
