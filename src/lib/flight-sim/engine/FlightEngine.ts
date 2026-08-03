// Main flight engine: owns renderer/scene, runs fixed-timestep physics, drives
// camera/audio, and emits HUD snapshots via onState.
import * as THREE from 'three'
import { Environment } from './Environment'
import { Airport } from './Airport'
import { Airplane } from './Airplane'
import { CameraController } from './CameraController'
import { InputController } from './InputController'
import { AudioEngine } from './AudioEngine'
import { stepFlight, createInitialState, PHYS } from '../physics'
import type { CameraMode, FlightState, GamePhase } from '../types'

const STEP = 1 / 60
const SPAWN_QUAT = new THREE.Quaternion() // identity => facing -Z (north)

export interface HudSnapshot {
  state: FlightState
  fps: number
  drawCalls: number
  triangles: number
  cameraMode: CameraMode
  debug: boolean
  geomMemory: number
  texMemory: number
}

export type FlightResult = 'none' | 'flying' | 'success' | 'crash'

export class FlightEngine {
  renderer: THREE.WebGLRenderer
  scene: THREE.Scene
  private env: Environment
  private airport: Airport
  private airplane: Airplane
  private cam: CameraController
  input: InputController
  audio: AudioEngine

  private orientation = new THREE.Quaternion()
  state: FlightState
  phase: GamePhase = 'menu'
  result: FlightResult = 'none'
  debug = false
  muted = false

  private container: HTMLElement
  private raf = 0
  private lastTime = 0
  private accumulator = 0
  private fps = 60
  private fpsSmooth = 60
  private prevOnGround = true
  private touchdownCooldown = 0

  onState: ((s: HudSnapshot) => void) | null = null
  onPhaseChange: ((phase: GamePhase, result: FlightResult) => void) | null = null
  onCameraModeChange: ((mode: CameraMode) => void) | null = null

  constructor(container: HTMLElement) {
    this.container = container
    this.state = createInitialState()

    const w = container.clientWidth || 1280
    const h = container.clientHeight || 720

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance',
      stencil: false,
    })
    // Cap pixel ratio at 1.0 to protect iGPU fill rate (the single biggest
    // performance lever on Intel HD 630).
    this.renderer.setPixelRatio(1)
    this.renderer.setSize(w, h)
    this.renderer.shadowMap.enabled = true
    this.renderer.shadowMap.type = THREE.PCFShadowMap
    this.renderer.outputColorSpace = THREE.SRGBColorSpace
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping
    this.renderer.toneMappingExposure = 1.05
    container.appendChild(this.renderer.domElement)
    this.renderer.domElement.style.display = 'block'
    this.renderer.domElement.style.width = '100%'
    this.renderer.domElement.style.height = '100%'

    this.scene = new THREE.Scene()
    this.env = new Environment(this.scene, this.renderer)
    this.airport = new Airport()
    this.scene.add(this.airport.group)
    this.airplane = new Airplane()
    this.scene.add(this.airplane.group)
    this.applyStateToMesh()

    this.cam = new CameraController(w / h)
    this.input = new InputController()
    this.input.attach(window)
    this.audio = new AudioEngine()

    // initial camera placement (chase)
    this.cam.camera.position.set(0, 20, -1300)
  }

  /** Start the render loop only (scene visible behind menus). Physics idle. */
  boot() {
    this.lastTime = performance.now()
    this.loop()
  }

  /** Begin an actual flight: init audio, switch to flying phase. */
  startFlight() {
    this.audio.init()
    this.phase = 'flying'
    this.result = 'flying'
    this.prevOnGround = true
    this.lastTime = performance.now()
    this.onPhaseChange?.(this.phase, this.result)
  }

  /** Return to the main menu: reset state, idle physics. */
  quitToMenu() {
    this.state = createInitialState()
    this.orientation.copy(SPAWN_QUAT)
    this.accumulator = 0
    this.prevOnGround = true
    this.result = 'none'
    this.phase = 'menu'
    this.applyStateToMesh()
    this.cam.setMode('chase')
    this.audio.suspend()
    this.onCameraModeChange?.('chase')
    this.onPhaseChange?.(this.phase, this.result)
  }

  private loop = () => {
    this.raf = requestAnimationFrame(this.loop)
    const now = performance.now()
    let dt = (now - this.lastTime) / 1000
    this.lastTime = now
    if (dt > 0.5) dt = 0.5 // clamp only pathological pauses (tab switches)

    // fps smoothing
    const instFps = 1 / Math.max(dt, 0.0001)
    this.fpsSmooth += (instFps - this.fpsSmooth) * 0.1
    this.fps = this.fpsSmooth

    // edge events (always active)
    if (this.input.consumeCameraSwitch()) {
      const m = this.cam.cycle()
      this.onCameraModeChange?.(m)
    }
    if (this.input.consumeDebug()) this.debug = !this.debug
    if (this.input.consumeReset()) this.reset()
    if (this.input.consumePause()) {
      if (this.phase === 'flying') this.pause()
      else if (this.phase === 'paused') this.resume()
    }

    if (this.phase === 'flying') {
      // throttle
      if (this.input.isThrottleUp()) this.state.throttle = Math.min(1, this.state.throttle + dt * 0.35)
      if (this.input.isThrottleDown()) this.state.throttle = Math.max(0, this.state.throttle - dt * 0.5)
      // gear
      if (this.input.consumeGearToggle()) {
        this.state.gearDown = !this.state.gearDown
        this.audio.gearSound()
      }
      // flaps (F = extend, V = retract), 0..3 stages
      if (this.input.consumeFlapsDown()) {
        this.state.flaps = Math.min(3, this.state.flaps + 1)
        this.audio.gearSound()
      }
      if (this.input.consumeFlapsUp()) {
        this.state.flaps = Math.max(0, this.state.flaps - 1)
        this.audio.gearSound()
      }
      // spoilers / airbrake (B)
      if (this.input.consumeSpoilerToggle()) {
        this.state.spoilers = !this.state.spoilers
      }
      // reverse thrust (X) — only effective on ground
      if (this.input.consumeReverseToggle()) {
        this.state.reverseThrust = !this.state.reverseThrust
      }
      // auto-disengage reverse when airborne
      if (!this.state.onGround) this.state.reverseThrust = false

      // fixed-timestep physics — carry over accumulated time (cap to avoid
      // spiral of death), so the sim stays real-time even at low FPS.
      const controls = this.input.getControls()
      this.accumulator += dt
      if (this.accumulator > 0.5) this.accumulator = 0.5
      let steps = 0
      const wasCrashed = this.state.crashed
      while (this.accumulator >= STEP && steps < 30) {
        try {
          stepFlight(this.state, this.orientation, controls, STEP)
        } catch (err) {
          // never let a physics error kill the render loop silently
          console.error('[FlightSim] physics error:', err)
          this.accumulator = 0
          break
        }
        this.accumulator -= STEP
        steps++
      }

      this.applyStateToMesh()
      this.airplane.update(this.state, dt)
      this.airport.update(dt)

      // trigger crash smoke effect on new crash
      if (!wasCrashed && this.state.crashed) {
        this.airplane.crash()
      }

      // touchdown audio
      this.touchdownCooldown -= dt
      if (!this.prevOnGround && this.state.onGround && this.state.flightTime > 3 && this.touchdownCooldown <= 0) {
        this.audio.touchdown()
        this.touchdownCooldown = 2
      }
      this.prevOnGround = this.state.onGround

      // phase transitions
      if (this.state.crashed) {
        this.result = 'crash'
        this.phase = 'ended'
        this.onPhaseChange?.(this.phase, this.result)
      } else if (this.state.landed) {
        this.result = 'success'
        this.phase = 'ended'
        this.onPhaseChange?.(this.phase, this.result)
      }

      this.audio.update(this.state)
    }

    // camera follows even when paused/ended for a nice view
    this.cam.update(this.state, this.orientation, dt)
    // keep sun shadow centered on the plane
    this.env.followTarget(this.airplane.group.position)
    this.renderer.render(this.scene, this.cam.camera)

    // HUD snapshot
    if (this.onState) {
      const info = this.renderer.info
      this.onState({
        state: this.state,
        fps: this.fps,
        drawCalls: info.render.calls,
        triangles: info.render.triangles,
        cameraMode: this.cam.mode,
        debug: this.debug,
        geomMemory: info.memory.geometries,
        texMemory: info.memory.textures,
      })
    }
  }

  private applyStateToMesh() {
    this.airplane.group.position.set(this.state.position.x, this.state.position.y, this.state.position.z)
    this.airplane.group.quaternion.copy(this.orientation)
  }

  pause() {
    if (this.phase !== 'flying') return
    this.phase = 'paused'
    this.audio.suspend()
    this.onPhaseChange?.(this.phase, this.result)
  }

  resume() {
    if (this.phase !== 'paused') return
    this.phase = 'flying'
    this.audio.resume()
    this.lastTime = performance.now()
    this.onPhaseChange?.(this.phase, this.result)
  }

  reset() {
    this.state = createInitialState()
    this.orientation.copy(SPAWN_QUAT)
    this.accumulator = 0
    this.prevOnGround = true
    this.result = 'flying'
    this.phase = 'flying'
    this.applyStateToMesh()
    this.cam.setMode('chase')
    this.onCameraModeChange?.('chase')
    this.onPhaseChange?.(this.phase, this.result)
    this.lastTime = performance.now()
    this.audio.resume()
  }

  setCameraMode(m: CameraMode) {
    this.cam.setMode(m)
    this.onCameraModeChange?.(m)
  }

  setMuted(m: boolean) {
    this.muted = m
    this.audio.setMuted(m)
  }

  setSensitivity(s: number) {
    this.input.sensitivity = s
  }

  setVolume(v: number) {
    this.audio.setVolume(v)
  }

  resize() {
    const w = this.container.clientWidth || 1280
    const h = this.container.clientHeight || 720
    this.renderer.setSize(w, h)
    this.cam.resize(w / h)
  }

  dispose() {
    cancelAnimationFrame(this.raf)
    this.input.detach(window)
    this.audio.dispose()
    this.env.dispose()
    this.renderer.dispose()
    this.renderer.domElement.remove()
  }
}
