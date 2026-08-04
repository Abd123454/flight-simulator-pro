// Environment: procedural sky, sun (directional light w/ shadows), terrain, fog.
import * as THREE from 'three'
import { Sky } from 'three/examples/jsm/objects/Sky.js'
import { makeGrassTexture } from '../textures'
import { isCompatMode } from './FlightEngine'

export class Environment {
  group: THREE.Group
  sun: THREE.DirectionalLight
  hemi: THREE.HemisphereLight
  private sky: Sky
  private scene: THREE.Scene
  private fog: THREE.Fog | null = null
  private fogColor: THREE.Color | null = null
  private rainPoints: THREE.Points | null = null
  private rainVelocities: Float32Array | null = null
  // elevation grid used to bias terrain (5×5, settable via setElevationGrid)
  private elevationGrid: number[] = []
  private elevationGridSize = 5
  // terrain mesh reference (so we can rebuild it when elevation grid changes)
  private terrainMesh: THREE.Mesh | null = null
  private terrainSize = 20000
  // Reduced segments in compat mode (128→48) to lower GPU vertex load on Intel iGPUs
  private terrainSegs = isCompatMode() ? 48 : 128

  constructor(scene: THREE.Scene, _renderer: THREE.WebGLRenderer) {
    this.scene = scene
    this.group = new THREE.Group()
    scene.add(this.group)

    // default elevation grid (Denver) — can be overridden by setElevationGrid
    // before buildTerrain() is called, or swapped later to rebuild terrain.
    this.elevationGrid = [
      1635, 1631, 1646, 1630, 1627,
      1619, 1629, 1643, 1626, 1621,
      1606, 1635, 1640, 1627, 1618,
      1600, 1635, 1634, 1627, 1612,
      1612, 1626, 1613, 1619, 1606,
    ]

    // --- Sky ---
    this.sky = new Sky()
    this.sky.scale.setScalar(20000)
    this.group.add(this.sky)

    const sunPhi = 50 * (Math.PI / 180) // elevation
    const sunTheta = 135 * (Math.PI / 180) // azimuth
    const sunPos = new THREE.Vector3()
    sunPos.setFromSphericalCoords(1, sunPhi, sunTheta)
    const skyU = this.sky.material.uniforms
    skyU.turbidity.value = 6
    skyU.rayleigh.value = 1.6
    skyU.mieCoefficient.value = 0.004
    skyU.mieDirectionalG.value = 0.85
    skyU.sunPosition.value.copy(sunPos)

    // --- Sun (directional light, only shadow caster) ---
    this.sun = new THREE.DirectionalLight(0xfff4e0, 1.25)
    this.sun.castShadow = true
    this.sun.shadow.mapSize.set(1024, 1024)
    this.sun.shadow.camera.near = 1
    this.sun.shadow.camera.far = 4000
    const s = 600
    this.sun.shadow.camera.left = -s
    this.sun.shadow.camera.right = s
    this.sun.shadow.camera.top = s
    this.sun.shadow.camera.bottom = -s
    this.sun.shadow.bias = -0.0004
    this.sun.shadow.normalBias = 0.6
    // place far above, shining toward origin
    this.sun.position.set(sunPos.x * 1500, sunPos.y * 1500, sunPos.z * 1500)
    this.sun.target.position.set(0, 0, 0)
    this.group.add(this.sun)
    this.group.add(this.sun.target)

    // --- Hemisphere fill light (cheap ambient) ---
    this.hemi = new THREE.HemisphereLight(0xbfe3ff, 0x4a6a3a, 0.55)
    this.group.add(this.hemi)

    // --- Terrain (heightmap with procedural noise + real elevation profile) ---
    // Built from this.elevationGrid (Denver default, overridable via
    // setElevationGrid before this runs).
    this.buildTerrain()

    // distant ground haze ring (a big dark-green disc below fog) handled by fog color

    // --- Clouds (simple billboard puffs — cheap, no particles) ---
    this.buildClouds()

    // --- Rain particle system (CPU particles, hidden by default) ---
    this.buildRain()

    // --- Environment + fog ---
    this.fogColor = new THREE.Color(0xcfe8f5)
    scene.background = new THREE.Color(0xbfe3ff)
    scene.fog = new THREE.Fog(0xcfe8f5, 2500, 9000)
    this.fog = scene.fog as THREE.Fog

    // keep sun shadow camera following handled externally if needed
  }

  /** Set the elevation grid used for terrain biasing (5×5, row-major).
   * Call before the scene is built, or call rebuildTerrain() after. */
  setElevationGrid(grid: number[], size = 5) {
    this.elevationGrid = grid.length === size * size ? grid : this.elevationGrid
    this.elevationGridSize = size
  }

  /** Rebuild the terrain mesh from the current elevation grid.
   * Used when the player picks a different live-weather airport. */
  rebuildTerrain() {
    if (this.terrainMesh) {
      this.group.remove(this.terrainMesh)
      this.terrainMesh.geometry.dispose()
      ;(this.terrainMesh.material as THREE.Material).dispose()
      this.terrainMesh = null
    }
    this.buildTerrain()
  }

  /** Build (or rebuild) the terrain mesh from this.elevationGrid. */
  private buildTerrain() {
    const terrainGeo = new THREE.PlaneGeometry(this.terrainSize, this.terrainSize, this.terrainSegs, this.terrainSegs)
    terrainGeo.rotateX(-Math.PI / 2)
    // sample the elevation grid bilinearly by world position
    const grid = this.elevationGrid
    const gs = this.elevationGridSize
    const meanElev = grid.length > 0 ? grid.reduce((a, b) => a + b, 0) / grid.length : 0
    const sampleElevation = (wx: number, wz: number): number => {
      if (grid.length === 0) return 0
      const u = THREE.MathUtils.clamp((wx / this.terrainSize) + 0.5, 0, 0.999)
      const v = THREE.MathUtils.clamp((wz / this.terrainSize) + 0.5, 0, 0.999)
      const fx = u * (gs - 1)
      const fy = v * (gs - 1)
      const ix = Math.floor(fx)
      const iy = Math.floor(fy)
      const tx = fx - ix
      const ty = fy - iy
      const a = grid[iy * gs + ix]
      const b = grid[iy * gs + (ix + 1)]
      const c = grid[(iy + 1) * gs + ix]
      const d = grid[(iy + 1) * gs + (ix + 1)]
      const elev = (a * (1 - tx) + b * tx) * (1 - ty) + (c * (1 - tx) + d * tx) * ty
      return elev - meanElev
    }
    const pos = terrainGeo.attributes.position
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i)
      const z = pos.getZ(i)
      const distFromRunway = Math.max(Math.abs(x) - 60, 0)
      const runwayProximity = Math.max(Math.abs(z) - 1600, 0)
      const flatDist = Math.max(distFromRunway, runwayProximity)
      let h = 0
      h += this.noise2D(x * 0.0008, z * 0.0008) * 120
      h += this.noise2D(x * 0.003, z * 0.003) * 40
      h += this.noise2D(x * 0.01, z * 0.01) * 12
      h += sampleElevation(x, z) * 6
      const flatten = THREE.MathUtils.clamp(flatDist / 500, 0, 1)
      h *= flatten
      pos.setY(i, h)
    }
    terrainGeo.computeVertexNormals()
    // In compat mode: flat-color ground (no texture) to isolate texture-driver bugs
    let terrainMat: THREE.MeshStandardMaterial
    if (isCompatMode()) {
      terrainMat = new THREE.MeshStandardMaterial({ color: 0x4a6a3a, roughness: 1, metalness: 0 })
    } else {
      const grass = makeGrassTexture()
      grass.wrapS = grass.wrapT = THREE.RepeatWrapping
      grass.repeat.set(100, 100)
      terrainMat = new THREE.MeshStandardMaterial({ map: grass, roughness: 1, metalness: 0 })
    }
    const terrain = new THREE.Mesh(terrainGeo, terrainMat)
    terrain.receiveShadow = !isCompatMode()
    terrain.position.y = 0
    this.terrainMesh = terrain
    this.group.add(terrain)
  }

  /** Update weather visuals (fog density, rain visibility) based on Weather. */
  updateWeather(weather: { fogDensity: number; rainIntensity: number; visibility: number; condition: string }) {
    // rain particles disabled in compat mode (Intel iGPU mitigation)
    if (isCompatMode() && this.rainPoints) {
      this.rainPoints.visible = false
      return
    }
    // adjust fog near/far based on visibility
    if (this.fog) {
      this.fog.near = weather.visibility * 0.3
      this.fog.far = weather.visibility
      // darken fog color in storms
      const targetColor = weather.condition === 'storm' ? 0x6b7785
        : weather.condition === 'rain' ? 0x9aa5b0
        : weather.condition === 'cloudy' ? 0xb8c5d0
        : 0xcfe8f5
      this.fog.color.setHex(targetColor)
      ;(this.scene.background as THREE.Color).setHex(
        weather.condition === 'storm' ? 0x4a5560
        : weather.condition === 'rain' ? 0x8a95a0
        : weather.condition === 'cloudy' ? 0xa8b8c8
        : 0xbfe3ff
      )
      // dim the sun in bad weather
      this.sun.intensity = weather.condition === 'storm' ? 0.4
        : weather.condition === 'rain' ? 0.6
        : weather.condition === 'cloudy' ? 0.8
        : 1.25
    }
    // rain particles visibility
    if (this.rainPoints) {
      this.rainPoints.visible = weather.rainIntensity > 0.01
      const mat = this.rainPoints.material as THREE.PointsMaterial
      mat.opacity = weather.rainIntensity * 0.6
    }
  }

  /** Move sun shadow camera to follow the airplane so shadows stay crisp. */
  followTarget(pos: THREE.Vector3) {
    this.sun.target.position.copy(pos)
    this.sun.position.set(pos.x + 600, pos.y + 1200, pos.z - 400)
    // move rain to follow the airplane so it's always visible around the plane
    if (this.rainPoints) {
      this.rainPoints.position.set(pos.x, 0, pos.z)
    }
  }

  private buildRain() {
    // CPU-friendly rain: a Points cloud of ~800 droplets around the plane.
    const count = 800
    const geo = new THREE.BufferGeometry()
    const positions = new Float32Array(count * 3)
    const velocities = new Float32Array(count)
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 400 // x
      positions[i * 3 + 1] = Math.random() * 300 // y (0..300)
      positions[i * 3 + 2] = (Math.random() - 0.5) * 400 // z
      velocities[i] = 60 + Math.random() * 40 // fall speed m/s
    }
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    this.rainVelocities = velocities
    const mat = new THREE.PointsMaterial({
      color: 0xaaccee,
      size: 1.5,
      transparent: true,
      opacity: 0,
      sizeAttenuation: true,
    })
    this.rainPoints = new THREE.Points(geo, mat)
    this.rainPoints.visible = false
    this.rainPoints.frustumCulled = false // always render (follows plane)
    this.group.add(this.rainPoints)
  }

  /** Animate rain droplets (call each frame). */
  updateRain(dt: number, windX: number, windZ: number) {
    if (!this.rainPoints || !this.rainPoints.visible || !this.rainVelocities) return
    const pos = this.rainPoints.geometry.attributes.position as THREE.BufferAttribute
    const arr = pos.array as Float32Array
    const windOffsetX = windX * dt * 0.3
    const windOffsetZ = windZ * dt * 0.3
    for (let i = 0; i < this.rainVelocities.length; i++) {
      // fall down
      arr[i * 3 + 1] -= this.rainVelocities[i] * dt
      // drift with wind
      arr[i * 3] += windOffsetX
      arr[i * 3 + 2] += windOffsetZ
      // recycle when below ground
      if (arr[i * 3 + 1] < 0) {
        arr[i * 3 + 1] = 300
        arr[i * 3] = (Math.random() - 0.5) * 400
        arr[i * 3 + 2] = (Math.random() - 0.5) * 400
      }
    }
    pos.needsUpdate = true
  }

  /** Simple value noise (Perlin-like) for procedural terrain. Deterministic. */
  private noise2D(x: number, y: number): number {
    // hash-based value noise with smooth interpolation
    const xi = Math.floor(x)
    const yi = Math.floor(y)
    const xf = x - xi
    const yf = y - yi
    // smoothstep for interpolation
    const u = xf * xf * (3 - 2 * xf)
    const v = yf * yf * (3 - 2 * yf)
    // hash function (deterministic pseudo-random)
    const hash = (a: number, b: number) => {
      const s = Math.sin(a * 127.1 + b * 311.7) * 43758.5453
      return s - Math.floor(s) // 0..1
    }
    const a = hash(xi, yi)
    const b = hash(xi + 1, yi)
    const c = hash(xi, yi + 1)
    const d = hash(xi + 1, yi + 1)
    // bilinear interpolation
    return (a * (1 - u) + b * u) * (1 - v) + (c * (1 - u) + d * u) * v - 0.5 // -0.5..0.5
  }

  private buildClouds() {
    // Simple flat billboard clouds: a few flattened spheres grouped into puffs.
    // They don't cast shadows (cheap) and sit at high altitude.
    const cloudMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.85,
      roughness: 1,
      metalness: 0,
    })
    for (let i = 0; i < 18; i++) {
      const cloud = new THREE.Group()
      const puffCount = 3 + Math.floor(Math.random() * 4)
      for (let p = 0; p < puffCount; p++) {
        const r = 40 + Math.random() * 50
        const puff = new THREE.Mesh(new THREE.SphereGeometry(r, 6, 5), cloudMat)
        puff.position.set(
          (Math.random() - 0.5) * 120,
          (Math.random() - 0.5) * 15,
          (Math.random() - 0.5) * 120
        )
        puff.scale.y = 0.4 // flatten
        cloud.add(puff)
      }
      // scatter around the airport area at 600-900m altitude
      const angle = Math.random() * Math.PI * 2
      const dist = 800 + Math.random() * 4000
      cloud.position.set(
        Math.cos(angle) * dist,
        600 + Math.random() * 300,
        Math.sin(angle) * dist
      )
      this.group.add(cloud)
    }
  }

  dispose() {
    this.group.traverse((o) => {
      const m = o as THREE.Mesh
      if (m.geometry) m.geometry.dispose()
      if (m.material) {
        const mat = m.material as THREE.Material | THREE.Material[]
        if (Array.isArray(mat)) mat.forEach((x) => x.dispose())
        else mat.dispose()
      }
    })
    this.group.parent?.remove(this.group)
  }
}
