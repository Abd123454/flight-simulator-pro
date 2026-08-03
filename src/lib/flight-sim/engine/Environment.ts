// Environment: procedural sky, sun (directional light w/ shadows), terrain, fog.
import * as THREE from 'three'
import { Sky } from 'three/examples/jsm/objects/Sky.js'
import { makeGrassTexture } from '../textures'

export class Environment {
  group: THREE.Group
  sun: THREE.DirectionalLight
  hemi: THREE.HemisphereLight
  private sky: Sky

  constructor(scene: THREE.Scene, renderer: THREE.WebGLRenderer) {
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

    // --- Terrain (huge flat plane, grass) ---
    const terrainGeo = new THREE.PlaneGeometry(20000, 20000, 1, 1)
    terrainGeo.rotateX(-Math.PI / 2)
    const grass = makeGrassTexture()
    grass.wrapS = grass.wrapT = THREE.RepeatWrapping
    grass.repeat.set(160, 160)
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

    // --- Environment + fog ---
    scene.background = new THREE.Color(0xbfe3ff)
    scene.fog = new THREE.Fog(0xcfe8f5, 2500, 9000)

    // keep sun shadow camera following handled externally if needed
  }

  /** Move sun shadow camera to follow the airplane so shadows stay crisp. */
  followTarget(pos: THREE.Vector3) {
    this.sun.target.position.copy(pos)
    this.sun.position.set(pos.x + 600, pos.y + 1200, pos.z - 400)
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
