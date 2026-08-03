// Input controller: keyboard + gamepad (Xbox/PlayStation controller via Gamepad API).
// Maps inputs to FlightControls and edge events.
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
  private weatherCycleQueued = false
  private autopilotToggleQueued = false
  enabled = true
  sensitivity = 1

  // gamepad state (edge detection for buttons)
  private gamepadConnected = false
  private prevGamepadButtons: boolean[] = []
  // deadzone for analog sticks
  private readonly DEADZONE = 0.15

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
    // weather cycle (key 1-4 or W)
    if (code === 'Digit1' || code === 'Digit2' || code === 'Digit3' || code === 'Digit4') {
      this.weatherCycleQueued = true
    }
    if (code === 'KeyP' || e.key === 'p' || e.key === 'P') this.autopilotToggleQueued = true
  }

  private onKeyUp = (e: KeyboardEvent) => {
    this.remove(e)
  }

  attach(target: HTMLElement | Window = window) {
    target.addEventListener('keydown', this.onKeyDown as EventListener)
    target.addEventListener('keyup', this.onKeyUp as EventListener)
    window.addEventListener('gamepadconnected', this.onGamepadConnected)
    window.addEventListener('gamepaddisconnected', this.onGamepadDisconnected)
  }

  detach(target: HTMLElement | Window = window) {
    target.removeEventListener('keydown', this.onKeyDown as EventListener)
    target.removeEventListener('keyup', this.onKeyUp as EventListener)
    window.removeEventListener('gamepadconnected', this.onGamepadConnected)
    window.removeEventListener('gamepaddisconnected', this.onGamepadDisconnected)
  }

  private onGamepadConnected = () => {
    this.gamepadConnected = true
  }
  private onGamepadDisconnected = () => {
    this.gamepadConnected = false
  }

  isGamepadConnected() {
    return this.gamepadConnected
  }

  /** Read the first connected gamepad, or null. */
  private pollGamepad(): Gamepad | null {
    const pads = navigator.getGamepads?.()
    if (!pads) return null
    for (const p of pads) {
      if (p && p.connected) return p
    }
    return null
  }

  private applyDeadzone(v: number): number {
    const abs = Math.abs(v)
    if (abs < this.DEADZONE) return 0
    // rescale so movement starts at 0 at the deadzone edge
    const sign = v < 0 ? -1 : 1
    return sign * ((abs - this.DEADZONE) / (1 - this.DEADZONE))
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

    // Gamepad input (overrides keyboard if connected and stick moved)
    const gp = this.pollGamepad()
    let gamepadThrottle = 0
    let gamepadBrake = false
    if (gp) {
      this.gamepadConnected = true
      // Standard gamepad mapping:
      // axes[0] = left stick X, axes[1] = left stick Y
      // axes[2] = right stick X, axes[3] = right stick Y
      // buttons[0]=A, [1]=B, [2]=X, [3]=Y, [4]=LB, [5]=RB, [6]=LT, [7]=RT
      // [8]=Back, [9]=Start, [10]=LS, [11]=RS, [12]=DUp, [13]=DDn, [14]=DL, [15]=DR

      if (gp.axes.length >= 2) {
        const lx = this.applyDeadzone(gp.axes[0])
        const ly = this.applyDeadzone(gp.axes[1])
        // left stick = roll (X) + pitch (Y, inverted)
        if (Math.abs(lx) > 0) roll = lx
        if (Math.abs(ly) > 0) pitch = -ly // push up = nose down
      }
      if (gp.axes.length >= 4) {
        const rx = this.applyDeadzone(gp.axes[2])
        // right stick X = yaw (rudder)
        if (Math.abs(rx) > 0) yaw = rx
      }
      // triggers: LT (button 6) = throttle down, RT (button 7) = throttle up
      // Some browsers report triggers as axes with values 0..1
      const lt = gp.buttons[6]?.value ?? 0
      const rt = gp.buttons[7]?.value ?? 0
      gamepadThrottle = rt - lt // -1..1

      // A button = brake
      gamepadBrake = !!(gp.buttons[0]?.pressed)

      // edge-detected button presses
      this.pollGamepadButtons(gp)
    }

    pitch = Math.max(-1, Math.min(1, pitch * this.sensitivity))
    roll = Math.max(-1, Math.min(1, roll * this.sensitivity))
    yaw = Math.max(-1, Math.min(1, yaw * this.sensitivity))

    const brake = this.has('Space', ' ') || gamepadBrake
    return { pitch, roll, yaw, throttle: 0, brake, gamepadThrottle }
  }

  /** Detect gamepad button presses (rising edge) and queue actions. */
  private pollGamepadButtons(gp: Gamepad) {
    const btns = gp.buttons
    for (let i = 0; i < btns.length; i++) {
      const pressed = !!btns[i]?.pressed
      const wasPressed = !!this.prevGamepadButtons[i]
      if (pressed && !wasPressed) {
        // map buttons to actions
        switch (i) {
          case 1: this.gearToggleQueued = true; break        // B = gear
          case 2: this.cameraSwitchQueued = true; break      // X = camera
          case 3: this.flapsDownQueued = true; break         // Y = flaps extend
          case 4: this.flapsUpQueued = true; break           // LB = flaps retract
          case 5: this.spoilerToggleQueued = true; break     // RB = spoilers
          case 9: this.pauseQueued = true; break             // Start = pause
          case 14: this.reverseToggleQueued = true; break    // DLeft = reverse
        }
      }
      this.prevGamepadButtons[i] = pressed
    }
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
  consumeWeatherCycle() {
    const v = this.weatherCycleQueued
    this.weatherCycleQueued = false
    return v
  }
  consumeAutopilotToggle() {
    const v = this.autopilotToggleQueued
    this.autopilotToggleQueued = false
    return v
  }

  isThrottleUp() {
    return this.has('ShiftLeft', 'ShiftRight', 'shift')
  }
  isThrottleDown() {
    return this.has('ControlLeft', 'ControlRight', 'control')
  }
}
