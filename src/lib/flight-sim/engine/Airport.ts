// Airport: runway (baked markings), taxiway, apron, terminal, control tower,
// hangar, instanced runway/approach lights, windsock, static gate aircraft.
import * as THREE from 'three'
import {
  makeRunwayTexture,
  makeConcreteTexture,
  makeTaxiwayTexture,
} from '../textures'

function instancedSpheres(
  positions: THREE.Vector3[],
  color: number,
  emissive: number,
  r = 0.6
): THREE.InstancedMesh {
  const geo = new THREE.SphereGeometry(r, 6, 6)
  const mat = new THREE.MeshStandardMaterial({
    color,
    emissive,
    emissiveIntensity: 2.0,
    roughness: 0.4,
  })
  const mesh = new THREE.InstancedMesh(geo, mat, positions.length)
  const m = new THREE.Matrix4()
  positions.forEach((p, i) => {
    m.makeTranslation(p.x, p.y, p.z)
    mesh.setMatrixAt(i, m)
  })
  mesh.instanceMatrix.needsUpdate = true
  return mesh
}

export class Airport {
  group: THREE.Group
  windsock: THREE.Group
  /** Reference to the Northfield airport sub-group (for LOD culling). */
  northfieldGroup: THREE.Group | null = null
  private windsockPhase = 0

  constructor() {
    this.group = new THREE.Group()
    this.windsock = new THREE.Group()

    // ---------- Runway ----------
    const runwayTex = makeRunwayTexture()
    const runwayGeo = new THREE.PlaneGeometry(60, 3000)
    runwayGeo.rotateX(-Math.PI / 2)
    const runwayMat = new THREE.MeshStandardMaterial({
      map: runwayTex,
      roughness: 0.95,
      metalness: 0,
    })
    const runway = new THREE.Mesh(runwayGeo, runwayMat)
    runway.receiveShadow = true
    this.group.add(runway)

    // ---------- Taxiway (parallel, offset west) ----------
    const taxiTex = makeTaxiwayTexture()
    taxiTex.wrapS = taxiTex.wrapT = THREE.RepeatWrapping
    taxiTex.repeat.set(1, 30)
    const taxiGeo = new THREE.PlaneGeometry(25, 2800)
    taxiGeo.rotateX(-Math.PI / 2)
    const taxi = new THREE.Mesh(
      taxiGeo,
      new THREE.MeshStandardMaterial({ map: taxiTex, roughness: 0.95 })
    )
    taxi.position.set(-200, 0.02, 0)
    taxi.receiveShadow = true
    this.group.add(taxi)

    // connector taxiways linking runway to apron
    const connMat = new THREE.MeshStandardMaterial({ map: makeConcreteTexture(), roughness: 0.95 })
    const connTex = connMat.map
    if (connTex) {
      connTex.wrapS = connTex.wrapT = THREE.RepeatWrapping
    }
    const connectors = [-1100, 0, 1100]
    for (const cz of connectors) {
      const cg = new THREE.PlaneGeometry(170, 25)
      cg.rotateX(-Math.PI / 2)
      const c = new THREE.Mesh(cg, connMat)
      c.position.set(-115, 0.02, cz)
      c.receiveShadow = true
      this.group.add(c)
    }

    // ---------- Apron (in front of terminal) ----------
    const apronGeo = new THREE.PlaneGeometry(260, 600)
    apronGeo.rotateX(-Math.PI / 2)
    const apron = new THREE.Mesh(
      apronGeo,
      new THREE.MeshStandardMaterial({ map: makeConcreteTexture(), roughness: 0.95 })
    )
    apron.position.set(220, 0.03, 0)
    apron.receiveShadow = true
    this.group.add(apron)

    // ---------- Terminal ----------
    this.buildTerminal()

    // ---------- Control Tower ----------
    this.buildControlTower(-120, 0, -500)

    // ---------- Hangar ----------
    this.buildHangar(220, 0, 700)

    // ---------- Runway lights (instanced) ----------
    this.buildLights()

    // ---------- Static gate aircraft ----------
    this.buildStaticAircraft()

    // ---------- Windsock ----------
    this.buildWindsock(34, 0, -1450)

    // ---------- PAPI lights (glide slope guidance) ----------
    // 4 lights per side, near each threshold. Red = too low, White = too high,
    // 2 red + 2 white = on glideslope (~3°).
    this.buildPAPI(20, 0, -1440, -1) // approach from south (facing north threshold)
    this.buildPAPI(20, 0, 1440, 1) // approach from north (facing south threshold)

    // ---------- Second airport: Northfield (5km north, for cross-country) ----------
    this.buildNorthfield()

    this.group.add(this.windsock)
  }

  /** Simplified second airport at z=-5500 (Northfield). */
  private buildNorthfield() {
    const offsetX = 0
    const offsetZ = -5500
    // wrap everything in a sub-group for LOD culling
    const nf = new THREE.Group()
    nf.position.set(offsetX, 0, offsetZ)
    this.northfieldGroup = nf
    this.group.add(nf)
    // runway (shorter, 2000m) — positions are relative to the nf group
    const runwayTex = makeRunwayTexture()
    const rwyGeo = new THREE.PlaneGeometry(45, 2000)
    rwyGeo.rotateX(-Math.PI / 2)
    const rwy = new THREE.Mesh(
      rwyGeo,
      new THREE.MeshStandardMaterial({ map: runwayTex, roughness: 0.95 })
    )
    rwy.position.set(0, 0.02, 0)
    rwy.receiveShadow = true
    nf.add(rwy)
    // small terminal
    const term = new THREE.Mesh(
      new THREE.BoxGeometry(30, 12, 80),
      new THREE.MeshStandardMaterial({ color: 0xc0c4c8, roughness: 0.7 })
    )
    term.position.set(80, 6, 0)
    term.castShadow = true
    nf.add(term)
    // control tower (small)
    const shaft = new THREE.Mesh(
      new THREE.CylinderGeometry(2, 2.5, 20, 8),
      new THREE.MeshStandardMaterial({ color: 0xc8ccd0, roughness: 0.7 })
    )
    shaft.position.set(-60, 10, 200)
    shaft.castShadow = true
    nf.add(shaft)
    const cab = new THREE.Mesh(
      new THREE.CylinderGeometry(4, 3, 4, 8),
      new THREE.MeshStandardMaterial({ color: 0x1f2a33, roughness: 0.2, metalness: 0.5 })
    )
    cab.position.set(-60, 22, 200)
    nf.add(cab)
    // runway edge lights (instanced, simplified)
    const edgeLights: THREE.Vector3[] = []
    for (let z = -1000; z <= 1000; z += 100) {
      edgeLights.push(new THREE.Vector3(-23, 0.5, z))
      edgeLights.push(new THREE.Vector3(23, 0.5, z))
    }
    nf.add(instancedSpheres(edgeLights, 0xffffff, 0xffffcc, 0.4))
    // threshold lights (green)
    const thrLights: THREE.Vector3[] = []
    for (let i = -3; i <= 3; i++) {
      thrLights.push(new THREE.Vector3(i * 6, 0.5, -1000))
      thrLights.push(new THREE.Vector3(i * 6, 0.5, 1000))
    }
    nf.add(instancedSpheres(thrLights, 0x20ff40, 0x10aa20, 0.4))
  }

  private buildPAPI(x: number, y: number, z: number, dir: number) {
    const papiGroup = new THREE.Group()
    for (let i = 0; i < 4; i++) {
      const isRed = i < 2
      const mat = new THREE.MeshStandardMaterial({
        color: isRed ? 0xff2020 : 0xffffff,
        emissive: isRed ? 0xff1010 : 0xffffcc,
        emissiveIntensity: 2.5,
      })
      // Shape distinction for colorblind accessibility:
      // Red lights = cones (pointing up), White lights = spheres
      const geo = isRed ? new THREE.ConeGeometry(0.8, 1.2, 6) : new THREE.SphereGeometry(0.8, 8, 8)
      const light = new THREE.Mesh(geo, mat)
      light.position.set(i * 5 - 7.5, 1.5, 0)
      papiGroup.add(light)
    }
    papiGroup.position.set(x, y, z)
    papiGroup.rotation.y = dir > 0 ? Math.PI : 0
    this.group.add(papiGroup)
  }

  private buildTerminal() {
    const matWall = new THREE.MeshStandardMaterial({ color: 0xd9dde2, roughness: 0.7 })
    const matGlass = new THREE.MeshStandardMaterial({
      color: 0x2a3540,
      roughness: 0.25,
      metalness: 0.5,
    })
    const matRoof = new THREE.MeshStandardMaterial({ color: 0x9aa0a8, roughness: 0.7 })

    // main concourse
    const main = new THREE.Mesh(new THREE.BoxGeometry(45, 26, 460), matWall)
    main.position.set(330, 13, 0)
    main.castShadow = true
    main.receiveShadow = true
    this.group.add(main)
    // glass facade front (toward apron, -X side)
    const facade = new THREE.Mesh(new THREE.BoxGeometry(2, 16, 440), matGlass)
    facade.position.set(308, 11, 0)
    this.group.add(facade)
    // roof
    const roof = new THREE.Mesh(new THREE.BoxGeometry(50, 2, 466), matRoof)
    roof.position.set(330, 27, 0)
    this.group.add(roof)

    // finger piers (perpendicular, toward apron)
    for (const z of [-180, -60, 60, 180]) {
      const pier = new THREE.Mesh(new THREE.BoxGeometry(70, 8, 16), matWall)
      pier.position.set(295, 6, z)
      pier.castShadow = true
      this.group.add(pier)
    }
  }

  private buildControlTower(x: number, y: number, z: number) {
    const shaft = new THREE.Mesh(
      new THREE.CylinderGeometry(3.2, 4.2, 35, 10),
      new THREE.MeshStandardMaterial({ color: 0xc8ccd0, roughness: 0.7 })
    )
    shaft.position.set(x, y + 17.5, z)
    shaft.castShadow = true
    this.group.add(shaft)
    const cab = new THREE.Mesh(
      new THREE.CylinderGeometry(6, 5, 6, 10),
      new THREE.MeshStandardMaterial({ color: 0x1f2a33, roughness: 0.2, metalness: 0.5 })
    )
    cab.position.set(x, y + 38, z)
    cab.castShadow = true
    this.group.add(cab)
    const cap = new THREE.Mesh(
      new THREE.ConeGeometry(6.5, 3, 10),
      new THREE.MeshStandardMaterial({ color: 0x9aa0a8, roughness: 0.7 })
    )
    cap.position.set(x, y + 42.5, z)
    this.group.add(cap)
  }

  private buildHangar(x: number, y: number, z: number) {
    const body = new THREE.Mesh(
      new THREE.BoxGeometry(80, 22, 60),
      new THREE.MeshStandardMaterial({ color: 0xb8bdc4, roughness: 0.7 })
    )
    body.position.set(x, y + 11, z)
    body.castShadow = true
    this.group.add(body)
    // half-cylinder roof
    const roof = new THREE.Mesh(
      new THREE.CylinderGeometry(30, 30, 80, 12, 1, false, 0, Math.PI),
      new THREE.MeshStandardMaterial({ color: 0x8a9098, roughness: 0.7, side: THREE.DoubleSide })
    )
    roof.rotation.z = Math.PI / 2
    roof.position.set(x, y + 22, z)
    roof.castShadow = true
    this.group.add(roof)
  }

  private buildLights() {
    const white: THREE.Vector3[] = []
    const green: THREE.Vector3[] = []
    const red: THREE.Vector3[] = []

    // edge lights along both sides every 150m
    for (let z = -1500; z <= 1500; z += 150) {
      white.push(new THREE.Vector3(-30, 0.5, z))
      white.push(new THREE.Vector3(30, 0.5, z))
    }
    // threshold green bars at both ends
    for (let i = -4; i <= 4; i++) {
      green.push(new THREE.Vector3(i * 6, 0.5, -1490))
      green.push(new THREE.Vector3(i * 6, 0.5, 1490))
    }
    // runway end red lights
    for (let i = -4; i <= 4; i++) {
      red.push(new THREE.Vector3(i * 6, 0.5, -1500))
      red.push(new THREE.Vector3(i * 6, 0.5, 1500))
    }
    // approach lights: white barrette array extending 600m before each threshold
    for (let d = 60; d <= 600; d += 60) {
      for (let i = -2; i <= 2; i++) {
        white.push(new THREE.Vector3(i * 6, 0.5, -1500 - d))
        white.push(new THREE.Vector3(i * 6, 0.5, 1500 + d))
      }
    }

    this.group.add(instancedSpheres(white, 0xffffff, 0xffffcc, 0.5))
    this.group.add(instancedSpheres(green, 0x20ff40, 0x10aa20, 0.5))
    this.group.add(instancedSpheres(red, 0xff2020, 0xaa1010, 0.5))
  }

  private buildStaticAircraft() {
    for (const z of [-150, 0, 150]) {
      const a = new THREE.Group()
      const fus = new THREE.Mesh(
        new THREE.CylinderGeometry(1.6, 1.6, 28, 10),
        new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.5 })
      )
      fus.rotation.x = Math.PI / 2
      fus.castShadow = true
      a.add(fus)
      const wing = new THREE.Mesh(
        new THREE.BoxGeometry(28, 0.4, 3),
        new THREE.MeshStandardMaterial({ color: 0xeeeeee, roughness: 0.5 })
      )
      wing.castShadow = true
      a.add(wing)
      const tail = new THREE.Mesh(
        new THREE.BoxGeometry(0.3, 4, 2.5),
        new THREE.MeshStandardMaterial({ color: 0xeeeeee, roughness: 0.5 })
      )
      tail.position.set(0, 3, 13)
      a.add(tail)
      a.position.set(260, 2.5, z)
      a.rotation.y = Math.PI / 2
      this.group.add(a)
    }
  }

  private buildWindsock(x: number, y: number, z: number) {
    const pole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.15, 0.15, 8, 6),
      new THREE.MeshStandardMaterial({ color: 0x888888 })
    )
    pole.position.set(x, y + 4, z)
    this.windsock.add(pole)
    const sockGeo = new THREE.ConeGeometry(1.2, 4, 8, 1, true)
    const sock = new THREE.Mesh(
      sockGeo,
      new THREE.MeshStandardMaterial({ color: 0xff6020, side: THREE.DoubleSide, roughness: 0.8 })
    )
    sock.rotation.z = Math.PI / 2
    sock.position.set(x + 2.5, y + 7.2, z)
    this.windsock.add(sock)
    this.windsock.userData.sock = sock
    this.windsock.userData.baseX = x
    this.windsock.userData.baseY = y + 7.2
    this.windsock.userData.baseZ = z
  }

  update(dt: number, weather?: { windX: number; windZ: number; windSpeed: number }) {
    this.windsockPhase += dt * 4
    const sock = this.windsock.userData.sock as THREE.Mesh
    if (sock) {
      // Windsock points in the direction the wind blows TOWARD.
      const wx = weather?.windX ?? 0
      const wz = weather?.windZ ?? 0
      const windAngle = Math.atan2(wx, -wz) // 0 = north
      // base orientation: cone points along +X after rotation.z=PI/2 (toward +X = east)
      // align the sock's pointing axis with the wind direction
      sock.rotation.y = windAngle
      sock.rotation.z = Math.PI / 2 + Math.sin(this.windsockPhase) * 0.06
      // inflate: stretch with stronger wind
      const speed = weather?.windSpeed ?? 0
      const inflate = THREE.MathUtils.clamp(speed / 15, 0.3, 1)
      sock.scale.set(inflate, 1, 1)
    }
  }

  /** Dispose all GPU resources (geometries, materials) held by this airport.
   * Called from FlightEngine.dispose() to prevent memory leaks. */
  dispose() {
    this.group.traverse((o) => {
      const mesh = o as THREE.Mesh
      if (mesh.geometry) mesh.geometry.dispose()
      if (mesh.material) {
        const mat = mesh.material as THREE.Material | THREE.Material[]
        if (Array.isArray(mat)) mat.forEach((m) => m.dispose())
        else mat.dispose()
      }
    })
  }
}
