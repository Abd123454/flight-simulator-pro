// Main flight engine: owns renderer/scene, runs fixed-timestep physics, drives
// camera/audio, and emits HUD snapshots via onState.
import * as THREE from 'three'
import { Environment } from './Environment'
import { Airport } from './Airport'
import { Airplane } from './Airplane'
import { CameraController } from './CameraController'
import { InputController } from './InputController'
import { AudioEngine } from './AudioEngine'
import { LODCuller } from './LODCuller'
import { stepFlight, createInitialState, PHYS } from '../physics'
import { WeatherSystem } from '../weather'
import { setTextureCompatMode } from '../textures'
import type { AircraftConfig } from '../aircraft-config'
import type { MissionConfig, Waypoint, Target } from '../missions'
import type { CameraMode, FlightState, GamePhase } from '../types'

const STEP = 1 / 60
const SPAWN_QUAT = new THREE.Quaternion() // identity => facing -Z (north)

// Compatibility mode — set BEFORE constructing FlightEngine.
// When true: disables shadows, AA, tone mapping, rain, reduces terrain detail,
// uses simpler texture filtering. Mitigation for Intel HD 6xx iGPU rendering bugs.
let compatMode = false

export function setCompatMode(enabled: boolean) {
  compatMode = enabled
  setTextureCompatMode(enabled)
}

export function isCompatMode() {
  return compatMode
}

export interface HudSnapshot {
  state: FlightState
  fps: number
  drawCalls: number
  triangles: number
  cameraMode: CameraMode
  debug: boolean
  geomMemory: number
  texMemory: number
  windSpeed: number
  windDir: number
  ilsLocalizer: number
  ilsGlideslope: number
  ilsInRange: boolean
  // mission data
  missionType: string
  missionName: string
  missionTime: number
  waypoints: Waypoint[]
  targets: Target[]
  nextWaypoint?: Waypoint
  score: number
  combo: number
  afterburner: boolean
  aircraftName: string
  gamepadConnected: boolean
  autopilot: boolean
  autopilotHeading: number
  autopilotAltitude: number
  weatherCondition: string
  gustActive: boolean
  liveWeatherSource: string
  // GPU diagnostic info (for Intel iGPU debugging)
  compatMode: boolean
  rendererInfo: string
  maxAnisotropy: number
}

export type FlightResult = 'none' | 'flying' | 'success' | 'crash'

export class FlightEngine {
  renderer: THREE.WebGLRenderer
  scene: THREE.Scene
  private env: Environment
  private airport: Airport
  airplane: Airplane
  private cam: CameraController
  input: InputController
  audio: AudioEngine
  weather: WeatherSystem

  private orientation = new THREE.Quaternion()
  state: FlightState
  phase: GamePhase = 'menu'
  result: FlightResult = 'none'
  debug = false
  muted = false

  // aircraft + mission
  aircraftConfig: AircraftConfig
  mission: MissionConfig
  afterburner = false
  score = 0
  combo = 0
  comboTimer = 0
  missionStartTime = 0
  missionElapsed = 0

  liveWeatherSource = ''
  // autopilot
  autopilot = false
  autopilotHeading = 0 // degrees, target heading
  autopilotAltitude = 1000 // meters, target altitude

  // waypoint/target visuals
  private waypointMeshes: { mesh: THREE.Group; wp: Waypoint }[] = []
  private targetMeshes: { mesh: THREE.Group; target: Target }[] = []
  // LOD culler
  private lod: LODCuller | null = null

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

  constructor(
    container: HTMLElement,
    aircraftConfig: AircraftConfig,
    mission: MissionConfig
  ) {
    this.container = container
    this.aircraftConfig = aircraftConfig
    this.mission = mission
    this.state = createInitialState()

    const w = container.clientWidth || 1280
    const h = container.clientHeight || 720

    this.renderer = new THREE.WebGLRenderer({
      antialias: !compatMode, // disable AA in compat mode (Intel iGPU driver bug mitigation)
      powerPreference: 'high-performance',
      stencil: false,
    })
    this.renderer.setPixelRatio(1) // always capped at 1.0 for iGPU fill-rate protection
    this.renderer.setSize(w, h)
    this.renderer.shadowMap.enabled = !compatMode // shadows off in compat mode
    this.renderer.shadowMap.type = THREE.PCFShadowMap
    this.renderer.outputColorSpace = THREE.SRGBColorSpace
    // Disable tone mapping in compat mode — ACES shader can expose driver bugs
    this.renderer.toneMapping = compatMode ? THREE.NoToneMapping : THREE.ACESFilmicToneMapping
    this.renderer.toneMappingExposure = 1.05
    container.appendChild(this.renderer.domElement)
    this.renderer.domElement.style.display = 'block'
    this.renderer.domElement.style.width = '100%'
    this.renderer.domElement.style.height = '100%'

    this.scene = new THREE.Scene()
    this.env = new Environment(this.scene, this.renderer)
    this.airport = new Airport()
    this.scene.add(this.airport.group)
    this.airplane = new Airplane(aircraftConfig)
    this.scene.add(this.airplane.group)

    // build mission visuals (waypoints / targets)
    this.buildMissionVisuals()
    this.spawnAtMission()

    this.applyStateToMesh()

    this.cam = new CameraController(w / h)
    this.input = new InputController()
    this.input.attach(window)
    this.audio = new AudioEngine()
    this.weather = new WeatherSystem()
    this.weather.setWind(5, 270)

    // LOD culler: hide distant objects beyond their cull distance
    this.lod = new LODCuller(this.cam.camera)
    if (this.airport.northfieldGroup) {
      this.lod.add(this.airport.northfieldGroup, 4000) // hide Northfield beyond 4km
    }

    this.cam.camera.position.set(0, 20, 1500)
  }

  /** Build 3D visuals for waypoints (racing gates) and targets. */
  private buildMissionVisuals() {
    // clear old
    for (const w of this.waypointMeshes) this.scene.remove(w.mesh)
    for (const t of this.targetMeshes) this.scene.remove(t.mesh)
    this.waypointMeshes = []
    this.targetMeshes = []

    // waypoint gates: floating rings
    if (this.mission.waypoints) {
      for (const wp of this.mission.waypoints) {
        const gate = new THREE.Group()
        const ringGeo = new THREE.TorusGeometry(wp.radius, 3, 8, 24)
        const ringMat = new THREE.MeshStandardMaterial({
          color: 0x00ffff,
          emissive: 0x00ffff,
          emissiveIntensity: 1.5,
          transparent: true,
          opacity: 0.7,
        })
        const ring = new THREE.Mesh(ringGeo, ringMat)
        ring.rotation.y = Math.PI / 2 // face along Z (flight direction)
        gate.add(ring)
        // marker pole up
        const pole = new THREE.Mesh(
          new THREE.CylinderGeometry(0.5, 0.5, 20, 6),
          new THREE.MeshStandardMaterial({ color: 0x00ffff, emissive: 0x008888, emissiveIntensity: 0.5 })
        )
        pole.position.y = -10
        gate.add(pole)
        gate.position.set(wp.position.x, wp.position.y, wp.position.z)
        this.scene.add(gate)
        this.waypointMeshes.push({ mesh: gate, wp })
      }
    }
    // targets: red glowing spheres
    if (this.mission.targets) {
      for (const target of this.mission.targets) {
        const grp = new THREE.Group()
        const core = new THREE.Mesh(
          new THREE.SphereGeometry(15, 10, 8),
          new THREE.MeshStandardMaterial({
            color: 0xff2222,
            emissive: 0xff0000,
            emissiveIntensity: 1.5,
          })
        )
        grp.add(core)
        // ring around it
        const ring = new THREE.Mesh(
          new THREE.TorusGeometry(25, 2, 6, 16),
          new THREE.MeshStandardMaterial({ color: 0xff4400, emissive: 0xff2200, emissiveIntensity: 1 })
        )
        ring.rotation.x = Math.PI / 2
        grp.add(ring)
        grp.position.set(target.position.x, target.position.y, target.position.z)
        this.scene.add(grp)
        this.targetMeshes.push({ mesh: grp, target })
      }
    }
  }

  /** Spawn the aircraft at the mission's start position/heading. */
  private spawnAtMission() {
    const m = this.mission
    this.state.position = { ...m.spawnPosition }
    this.state.velocity = { x: 0, y: 0, z: 0 }
    this.orientation.identity()
    // set heading by rotating about Y
    if (m.spawnHeading !== 0) {
      const q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), -m.spawnHeading)
      this.orientation.copy(q)
    }
    this.state.onGround = m.spawnPosition.y <= PHYS.groundY + 1
    this.state.throttle = 0
    this.state.gearDown = true
    this.state.flaps = 0
    this.state.spoilers = false
    this.state.reverseThrust = false
    this.state.flightTime = 0
    this.state.crashed = false
    this.state.landed = false
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
    this.score = 0
    this.combo = 0
    this.missionStartTime = performance.now()
    this.missionElapsed = 0
    this.lastTime = performance.now()
    // storm mission: force storm weather
    if (this.mission.type === 'storm') {
      this.weather.setCondition('storm')
    } else {
      this.weather.setCondition('clear')
    }
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
      // throttle (keyboard: Shift/Ctrl, or gamepad triggers)
      const controls = this.input.getControls()
      if (controls.gamepadThrottle !== undefined && controls.gamepadThrottle !== 0) {
        // gamepad triggers: RT=up, LT=down, analog
        this.state.throttle = Math.max(0, Math.min(1, this.state.throttle + controls.gamepadThrottle * dt * 0.5))
      } else {
        if (this.input.isThrottleUp()) this.state.throttle = Math.min(1, this.state.throttle + dt * 0.35)
        if (this.input.isThrottleDown()) this.state.throttle = Math.max(0, this.state.throttle - dt * 0.5)
      }
      // afterburner for fighter (toggle with Shift double-tap or hold Tab)
      if (this.aircraftConfig.hasAfterburner) {
        this.afterburner = this.input.isThrottleUp() && this.state.throttle > 0.9
      }
      // gear
      if (this.input.consumeGearToggle()) {
        this.state.gearDown = !this.state.gearDown
        this.audio.gearSound()
      }
      // flaps
      if (this.input.consumeFlapsDown()) {
        this.state.flaps = Math.min(3, this.state.flaps + 1)
        this.audio.gearSound()
      }
      if (this.input.consumeFlapsUp()) {
        this.state.flaps = Math.max(0, this.state.flaps - 1)
        this.audio.gearSound()
      }
      // spoilers
      if (this.input.consumeSpoilerToggle()) {
        this.state.spoilers = !this.state.spoilers
      }
      // reverse thrust
      if (this.input.consumeReverseToggle()) {
        this.state.reverseThrust = !this.state.reverseThrust
      }
      if (!this.state.onGround) this.state.reverseThrust = false

      // weather cycle (keys 1-4)
      if (this.input.consumeWeatherCycle()) {
        const conds = ['clear', 'cloudy', 'rain', 'storm'] as const
        const idx = conds.indexOf(this.weather.weather.condition as any)
        const next = conds[(idx + 1) % conds.length]
        this.weather.setCondition(next)
      }
      // autopilot toggle (P)
      if (this.input.consumeAutopilotToggle()) {
        if (!this.autopilot && !this.state.onGround) {
          // engage: capture current heading + altitude
          this.autopilot = true
          this.autopilotHeading = this.state.heading
          this.autopilotAltitude = Math.max(100, this.state.altitude)
        } else {
          this.autopilot = false
        }
      }

      // physics
      this.accumulator += dt
      if (this.accumulator > 0.5) this.accumulator = 0.5
      let steps = 0
      const wasCrashed = this.state.crashed

      // Autopilot: override controls to hold heading + altitude.
      // Disables if the pilot provides manual input.
      let apControls = controls
      if (this.autopilot && !this.state.onGround) {
        const pilotInput = Math.abs(controls.pitch) > 0.1 || Math.abs(controls.roll) > 0.1
        if (pilotInput) {
          // pilot override → disengage autopilot
          this.autopilot = false
        } else {
          // heading hold: bank toward target heading
          let hdgErr = this.autopilotHeading - this.state.heading
          if (hdgErr > 180) hdgErr -= 360
          if (hdgErr < -180) hdgErr += 360
          const targetRoll = THREE.MathUtils.clamp(hdgErr * 0.02, -0.4, 0.4) // bank up to ~23°
          // altitude hold: pitch toward target altitude
          const altErr = this.autopilotAltitude - this.state.altitude
          const targetPitch = THREE.MathUtils.clamp(-altErr * 0.005, -0.3, 0.3) // pitch up if below
          apControls = {
            ...controls,
            roll: targetRoll,
            pitch: targetPitch,
          }
        }
      }

      while (this.accumulator >= STEP && steps < 30) {
        try {
          stepFlight(this.state, this.orientation, apControls, STEP, this.weather.weather)
        } catch (err) {
          console.error('[FlightSim] physics error:', err)
          this.accumulator = 0
          break
        }
        this.accumulator -= STEP
        steps++
      }

      // mission time
      this.missionElapsed = (performance.now() - this.missionStartTime) / 1000

      // check waypoint / target hits
      this.checkMissionObjectives()

      this.applyStateToMesh()
      this.airplane.update(this.state, dt, this.afterburner)
      this.airport.update(dt, this.weather.weather)
      this.weather.update(dt)
      // update weather visuals (fog, rain)
      this.env.updateWeather(this.weather.weather)
      this.env.updateRain(dt, this.weather.weather.windX, this.weather.weather.windZ)

      // combo decay
      if (this.combo > 0) {
        this.comboTimer -= dt
        if (this.comboTimer <= 0) this.combo = 0
      }

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
    // LOD cull: hide distant objects (perf on integrated GPUs)
    this.lod?.update()
    // keep sun shadow centered on the plane
    this.env.followTarget(this.airplane.group.position)
    this.renderer.render(this.scene, this.cam.camera)

    // HUD snapshot
    if (this.onState) {
      const info = this.renderer.info
      const s = this.state
      // ILS for the northbound runway. Aircraft starts at z=+1400 (south end)
      // and flies north (-Z) toward the far threshold at z=-1500.
      // Localizer: lateral deviation from runway centerline (x=0).
      // Glideslope: vertical deviation from 3° descent path to the north threshold.
      const rwyThresholdZ = -1500 // north end
      // Approach range: aircraft is northbound, approaching the north threshold
      const onApproach = s.position.z > rwyThresholdZ - 500 && s.position.z < rwyThresholdZ + 9000
      // ideal altitude at this distance for a 3° glideslope to the threshold
      const distToThreshold = s.position.z - rwyThresholdZ // positive when south of threshold
      const idealAlt = Math.max(0, distToThreshold * Math.tan(3 * Math.PI / 180)) + PHYS.groundY
      const gsDev = (s.altitude - idealAlt) / 100
      const locDev = -s.position.x / 100
      // next waypoint (first unreached)
      const nextWp = this.mission.waypoints?.find((w) => !w.reached)
      this.onState({
        state: s,
        fps: this.fps,
        drawCalls: info.render.calls,
        triangles: info.render.triangles,
        cameraMode: this.cam.mode,
        debug: this.debug,
        geomMemory: info.memory.geometries,
        texMemory: info.memory.textures,
        windSpeed: this.weather.weather.windSpeed,
        windDir: this.weather.weather.windDir,
        ilsLocalizer: THREE.MathUtils.clamp(locDev, -1, 1),
        ilsGlideslope: THREE.MathUtils.clamp(gsDev, -1, 1),
        ilsInRange: onApproach,
        missionType: this.mission.type,
        missionName: this.mission.name,
        missionTime: this.missionElapsed,
        waypoints: this.mission.waypoints ?? [],
        targets: this.mission.targets ?? [],
        nextWaypoint: nextWp,
        score: this.score,
        combo: this.combo,
        afterburner: this.afterburner,
        aircraftName: this.aircraftConfig.name,
        gamepadConnected: this.input.isGamepadConnected(),
        autopilot: this.autopilot,
        autopilotHeading: this.autopilotHeading,
        autopilotAltitude: this.autopilotAltitude,
        weatherCondition: this.weather.weather.condition,
        gustActive: this.weather.isGustActive(),
        liveWeatherSource: this.liveWeatherSource,
        compatMode: compatMode,
        rendererInfo: (() => {
          try {
            const gl = this.renderer.getContext() as WebGLRenderingContext
            const dbg = gl.getExtension('WEBGL_debug_renderer_info')
            const vendor = dbg ? gl.getParameter(dbg.UNMASKED_VENDOR_WEBGL) : gl.getParameter(gl.VENDOR)
            const renderer = dbg ? gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER)
            const isWebGL2 = !!(gl as any).getParameter && (gl as WebGL2RenderingContext).MAX_3D_TEXTURE_SIZE !== undefined
            return `${vendor} / ${renderer} / WebGL ${isWebGL2 ? '2' : '1'}`
          } catch {
            return 'unknown'
          }
        })(),
        maxAnisotropy: this.renderer.capabilities?.getMaxAnisotropy?.() ?? 1,
      })
    }
  }

  /** Check if the player reached waypoints or hit targets. */
  private checkMissionObjectives() {
    const pos = this.state.position
    // waypoints
    if (this.mission.waypoints) {
      for (const wp of this.mission.waypoints) {
        if (wp.reached) continue
        const dx = pos.x - wp.position.x
        const dy = pos.y - wp.position.y
        const dz = pos.z - wp.position.z
        const dist = Math.hypot(dx, dy, dz)
        if (dist < wp.radius) {
          wp.reached = true
          this.score += 100 * (1 + this.combo)
          this.combo += 1
          this.comboTimer = 5
          this.audio.gearSound()
          // turn gate green
          const meshEntry = this.waypointMeshes.find((w) => w.wp.id === wp.id)
          if (meshEntry) {
            meshEntry.mesh.traverse((o) => {
              const m = o as THREE.Mesh
              if (m.material) {
                const mat = m.material as THREE.MeshStandardMaterial
                mat.color.setHex(0x00ff00)
                mat.emissive.setHex(0x00ff00)
              }
            })
          }
          // check if all reached → mission success
          // For crosscountry/storm: also require a landing (onGround, slow)
          // to match the "land safely" objective.
          if (this.mission.waypoints.every((w) => w.reached)) {
            const needsLanding =
              this.mission.type === 'crosscountry' || this.mission.type === 'storm'
            if (!needsLanding || (this.state.onGround && this.state.airspeed < 8)) {
              this.result = 'success'
              this.phase = 'ended'
              this.score += this.mission.rewardXP
              this.onPhaseChange?.(this.phase, this.result)
            }
          }
        }
      }
    }
    // targets
    if (this.mission.targets) {
      for (const target of this.mission.targets) {
        if (target.destroyed) continue
        const dx = pos.x - target.position.x
        const dy = pos.y - target.position.y
        const dz = pos.z - target.position.z
        const dist = Math.hypot(dx, dy, dz)
        if (dist < 20) {
          target.destroyed = true
          this.score += 200 * (1 + this.combo)
          this.combo += 1
          this.comboTimer = 5
          this.audio.touchdown()
          // hide target mesh
          const meshEntry = this.targetMeshes.find((t) => t.target.id === target.id)
          if (meshEntry) meshEntry.mesh.visible = false
          // check if all destroyed → mission success
          if (this.mission.targets.every((t) => t.destroyed)) {
            this.result = 'success'
            this.phase = 'ended'
            this.score += this.mission.rewardXP
            this.onPhaseChange?.(this.phase, this.result)
          }
        }
      }
    }
    // time limit
    if (this.mission.timeLimit && this.missionElapsed > this.mission.timeLimit) {
      this.result = 'crash'
      this.phase = 'ended'
      this.onPhaseChange?.(this.phase, this.result)
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

  /** Apply fetched live weather to the WeatherSystem. Called after
   * fetchLiveWeather() resolves, before/at mission start. */
  applyLiveWeather(windSpeed: number, windDir: number, visibility: number, source = 'live') {
    this.weather.setLiveWeather(windSpeed, windDir, visibility)
    this.liveWeatherSource = source
  }

  /** Apply a fetched live elevation grid to the terrain (rebuilds terrain).
   * Called after fetchLiveElevation() resolves, before mission start. */
  applyLiveElevation(grid: number[], size = 5) {
    this.env.setElevationGrid(grid, size)
    this.env.rebuildTerrain()
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
