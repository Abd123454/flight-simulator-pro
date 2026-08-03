// Environment: procedural sky, sun (directional light w/ shadows), terrain, fog.
import * as THREE from 'three'
import { Sky } from 'three/examples/jsm/objects/Sky.js'
import { makeGrassTexture } from '../textures'

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

  constructor(scene: THREE.Scene, renderer: THREE.WebGLRenderer) {
    this.scene = scene
    this.group = new THREE.Group()
    scene.add(this.group)

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

    // --- Terrain (heightmap with procedural Perlin noise hills) ---
    // Subdivided plane with vertices displaced by layered noise for hills/valleys.
    // Flat near the airport (z within ±1700) so the runway stays level.
    const terrainSize = 20000
    const terrainSegs = 128 // 128x128 = 16K verts, single draw call
    const terrainGeo = new THREE.PlaneGeometry(terrainSize, terrainSize, terrainSegs, terrainSegs)
    terrainGeo.rotateX(-Math.PI / 2)
    // displace vertices with noise
    const pos = terrainGeo.attributes.position
    const flatZone = 1800 // keep flat within this distance of airport center
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i)
      const z = pos.getZ(i)
      const distFromCenter = Math.hypot(x, z)
      // distance from the runway strip (along Z, x near 0)
      const distFromRunway = Math.max(Math.abs(x) - 60, 0) // 60m runway half-width
      const runwayProximity = Math.max(Math.abs(z) - 1600, 0) // flat along runway
      const flatDist = Math.max(distFromRunway, runwayProximity)
      // noise: layered octaves for natural-looking hills
      let h = 0
      h += this.noise2D(x * 0.0008, z * 0.0008) * 120 // large hills
      h += this.noise2D(x * 0.003, z * 0.003) * 40 // medium
      h += this.noise2D(x * 0.01, z * 0.01) * 12 // small detail
      // flatten near airport (smooth transition)
      const flatten = THREE.MathUtils.clamp(flatDist / 500, 0, 1)
      h *= flatten
      pos.setY(i, h)
    }
    terrainGeo.computeVertexNormals()
    const grass = makeGrassTexture()
    grass.wrapS = grass.wrapT = THREE.RepeatWrapping
    grass.repeat.set(100, 100)
    const terrainMat = new THREE.MeshStandardMaterial({
      map: grass,
      roughness: 1,
      metalness: 0,
    })
    const terrain = new THREE.Mesh(terrainGeo, terrainMat)
    terrain.receiveShadow = true
    terrain.position.y = 0
    this.group.add(terrain)

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

  /** Update weather visuals (fog density, rain visibility) based on Weather. */
  updateWeather(weather: { fogDensity: number; rainIntensity: number; visibility: number; condition: string }) {
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
    if (!this.rainPoints || !this.rainPoints.visible) return
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
