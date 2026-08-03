// Procedural low-poly airplanes — supports multiple types (airliner, fighter,
// stunt, cargo). Forward = -Z. Provides update(state) for fans, gear, afterburner.
import * as THREE from 'three'
import type { FlightState } from '../types'
import type { AircraftConfig, AircraftType } from '../aircraft-config'

const whiteMat = new THREE.MeshStandardMaterial({ color: 0xeef1f5, roughness: 0.55, metalness: 0.15 })
const grayMat = new THREE.MeshStandardMaterial({ color: 0x8b9097, roughness: 0.6, metalness: 0.3 })
const darkMat = new THREE.MeshStandardMaterial({ color: 0x20242a, roughness: 0.5, metalness: 0.2 })
const glassMat = new THREE.MeshStandardMaterial({ color: 0x101820, roughness: 0.2, metalness: 0.6 })
const redMat = new THREE.MeshStandardMaterial({ color: 0xc03030, roughness: 0.6 })
const tireMat = new THREE.MeshStandardMaterial({ color: 0x16181c, roughness: 0.9 })

function cyl(rTop: number, rBot: number, h: number, seg = 10) {
  return new THREE.CylinderGeometry(rTop, rBot, h, seg)
}

export class Airplane {
  group: THREE.Group
  type: AircraftType
  private config: AircraftConfig
  private fans: THREE.Group[] = []
  private gearGroups: THREE.Group[] = []
  private gearRetract = 0
  private fanAngle = 0
  private smokeGroup: THREE.Group | null = null
  private smokeTimer = 0
  private smokePuffs: { mesh: THREE.Mesh; vel: THREE.Vector3; life: number }[] = []
  // afterburner flame
  private afterburnerFlames: THREE.Mesh[] = []
  private afterburnerIntensity = 0

  constructor(config: AircraftConfig) {
    this.config = config
    this.type = config.type
    this.group = new THREE.Group()
    this.group.scale.setScalar(config.scale)

    // Build the right model for the aircraft type
    switch (config.type) {
      case 'fighter':
        this.buildFighter()
        break
      case 'stunt':
        this.buildStunt()
        break
      case 'cargo':
        this.buildCargo()
        break
      default:
        this.buildAirliner()
    }
  }

  /** Boeing 737-style airliner (default). */
  private buildAirliner() {
    const fus = cyl(1.8, 1.8, 38, 12)
    fus.rotateX(Math.PI / 2) // axis along Z
    const fusMesh = new THREE.Mesh(fus, whiteMat)
    fusMesh.castShadow = true
    this.group.add(fusMesh)

    // nose cone
    const nose = new THREE.ConeGeometry(1.8, 4, 12)
    nose.rotateX(-Math.PI / 2) // point toward -Z
    const noseMesh = new THREE.Mesh(nose, whiteMat)
    noseMesh.position.set(0, 0, -21)
    noseMesh.castShadow = true
    this.group.add(noseMesh)

    // tail cone (tapered up)
    const tail = new THREE.ConeGeometry(1.8, 7, 12)
    tail.rotateX(Math.PI / 2) // point toward +Z
    const tailMesh = new THREE.Mesh(tail, whiteMat)
    tailMesh.position.set(0, 0.6, 22.5)
    tailMesh.castShadow = true
    this.group.add(tailMesh)

    // cockpit windshield (slanted dark pane)
    const cockpitGeo = new THREE.BoxGeometry(2.6, 1.4, 2.2)
    const cockpit = new THREE.Mesh(cockpitGeo, glassMat)
    cockpit.position.set(0, 1.4, -17)
    cockpit.rotation.x = -0.35
    this.group.add(cockpit)

    // window strip (two thin dark boxes along the sides)
    const winGeo = new THREE.BoxGeometry(0.2, 0.55, 14)
    const winL = new THREE.Mesh(winGeo, darkMat)
    winL.position.set(-1.75, 0.6, -2)
    this.group.add(winL)
    const winR = winL.clone()
    winR.position.x = 1.75
    this.group.add(winR)

    // --- Wings ---
    const wingShape = new THREE.BoxGeometry(34, 0.5, 4.2)
    const wing = new THREE.Mesh(wingShape, whiteMat)
    wing.position.set(0, -0.6, 1.5)
    wing.castShadow = true
    this.group.add(wing)

    // winglets (small vertical tips)
    const wletGeo = new THREE.BoxGeometry(0.3, 1.6, 1.8)
    const wletL = new THREE.Mesh(wletGeo, whiteMat)
    wletL.position.set(-17, 0.2, 1.5)
    this.group.add(wletL)
    const wletR = wletL.clone()
    wletR.position.x = 17
    this.group.add(wletR)

    // --- Tail: vertical stabilizer ---
    const vtail = new THREE.Mesh(new THREE.BoxGeometry(0.4, 6, 4), whiteMat)
    vtail.position.set(0, 4.5, 24)
    vtail.castShadow = true
    this.group.add(vtail)
    // red stripe on tail top
    const vstripe = new THREE.Mesh(new THREE.BoxGeometry(0.42, 1.5, 4), redMat)
    vstripe.position.set(0, 7, 24)
    this.group.add(vstripe)

    // --- Horizontal stabilizers ---
    const htail = new THREE.Mesh(new THREE.BoxGeometry(11, 0.35, 2.6), whiteMat)
    htail.position.set(0, 2.2, 25.5)
    htail.castShadow = true
    this.group.add(htail)

    // --- Engines (two, under wings) ---
    const enginePos = [
      { x: -7, z: 0 },
      { x: 7, z: 0 },
    ]
    for (const ep of enginePos) {
      const engGroup = new THREE.Group()
      engGroup.position.set(ep.x, -1.8, ep.z)
      const nacelle = cyl(1.25, 1.15, 4.5, 12)
      nacelle.rotateX(Math.PI / 2)
      const nacelleMesh = new THREE.Mesh(nacelle, grayMat)
      nacelleMesh.castShadow = true
      engGroup.add(nacelleMesh)
      // fan disc + blades
      const fanGroup = new THREE.Group()
      fanGroup.position.set(0, 0, -2.25)
      const hub = new THREE.Mesh(cyl(0.45, 0.45, 0.4, 8), darkMat)
      hub.rotation.x = Math.PI / 2
      fanGroup.add(hub)
      for (let b = 0; b < 8; b++) {
        const blade = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.8, 0.1), grayMat)
        blade.position.y = 0.7
        const wrap = new THREE.Group()
        wrap.rotation.z = (b / 8) * Math.PI * 2
        wrap.add(blade)
        fanGroup.add(wrap)
      }
      engGroup.add(fanGroup)
      this.fans.push(fanGroup)
      this.group.add(engGroup)
    }

    // --- Landing gear (nose + 2 main) ---
    this.gearGroups.push(this.buildGear(0, -16, 0.7, 2)) // nose
    this.gearGroups.push(this.buildGear(-6, 2, 1.0, 2.4)) // main L
    this.gearGroups.push(this.buildGear(6, 2, 1.0, 2.4)) // main R
    for (const g of this.gearGroups) this.group.add(g)

    // navigation lights (small emissive spheres)
    const navL = new THREE.Mesh(new THREE.SphereGeometry(0.18, 6, 6), new THREE.MeshStandardMaterial({ color: 0xff3030, emissive: 0xff0000, emissiveIntensity: 1.5 }))
    navL.position.set(-17, 0, 1.5)
    this.group.add(navL)
    const navR = new THREE.Mesh(new THREE.SphereGeometry(0.18, 6, 6), new THREE.MeshStandardMaterial({ color: 0x30ff30, emissive: 0x00ff00, emissiveIntensity: 1.5 }))
    navR.position.set(17, 0, 1.5)
    this.group.add(navR)
    const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.2, 6, 6), new THREE.MeshStandardMaterial({ color: 0xff8000, emissive: 0xff4000, emissiveIntensity: 2 }))
    beacon.position.set(0, 1.5, 24)
    this.group.add(beacon)
  }

  /** F-16-style fighter jet — sleek, single engine, afterburner. */
  private buildFighter() {
    const bodyMat = new THREE.MeshStandardMaterial({ color: this.config.color, roughness: 0.4, metalness: 0.5 })
    // Fuselage — long pointed nose
    const fus = cyl(0.8, 0.6, 16, 8)
    fus.rotateX(Math.PI / 2)
    const fusMesh = new THREE.Mesh(fus, bodyMat)
    fusMesh.castShadow = true
    this.group.add(fusMesh)
    // sharp nose cone
    const nose = new THREE.ConeGeometry(0.8, 4, 8)
    nose.rotateX(-Math.PI / 2)
    const noseMesh = new THREE.Mesh(nose, bodyMat)
    noseMesh.position.set(0, 0, -10)
    noseMesh.castShadow = true
    this.group.add(noseMesh)
    // bubble canopy
    const canopy = new THREE.Mesh(
      new THREE.SphereGeometry(0.7, 8, 6, 0, Math.PI * 2, 0, Math.PI / 2),
      glassMat
    )
    canopy.position.set(0, 0.5, -4)
    canopy.scale.set(1, 1.2, 1.5)
    this.group.add(canopy)
    // delta wings (swept back, large triangle-ish via box)
    const wing = new THREE.Mesh(new THREE.BoxGeometry(9, 0.25, 5), bodyMat)
    wing.position.set(0, -0.2, 2)
    wing.rotation.x = 0
    wing.castShadow = true
    this.group.add(wing)
    // leading edge sweep (visual hint)
    const leL = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.3, 4), darkMat)
    leL.position.set(-4, -0.1, 2.5)
    leL.rotation.y = 0.35
    this.group.add(leL)
    const leR = leL.clone()
    leR.position.x = 4
    leR.rotation.y = -0.35
    this.group.add(leR)
    // twin vertical stabilizers (canted)
    for (const sx of [-0.6, 0.6]) {
      const vtail = new THREE.Mesh(new THREE.BoxGeometry(0.15, 2, 1.5), bodyMat)
      vtail.position.set(sx, 1.2, 7)
      vtail.rotation.z = sx * 0.15
      vtail.castShadow = true
      this.group.add(vtail)
    }
    // horizontal stabilizers
    const htail = new THREE.Mesh(new THREE.BoxGeometry(5, 0.2, 1.5), bodyMat)
    htail.position.set(0, 0.5, 7.5)
    htail.castShadow = true
    this.group.add(htail)
    // single engine exhaust (rear)
    const exhaust = new THREE.Mesh(cyl(0.5, 0.45, 1, 8), darkMat)
    exhaust.rotation.x = Math.PI / 2
    exhaust.position.set(0, 0, 8.5)
    this.group.add(exhaust)
    // afterburner flame (hidden by default)
    const flameMat = new THREE.MeshStandardMaterial({
      color: 0x00aaff,
      emissive: 0x0088ff,
      emissiveIntensity: 3,
      transparent: true,
      opacity: 0.8,
    })
    const flame = new THREE.Mesh(new THREE.ConeGeometry(0.4, 4, 8), flameMat)
    flame.rotation.x = Math.PI / 2
    flame.position.set(0, 0, 11)
    flame.visible = false
    this.group.add(flame)
    this.afterburnerFlames.push(flame)
    // fan (inside exhaust)
    const fanGroup = new THREE.Group()
    fanGroup.position.set(0, 0, 8)
    const hub = new THREE.Mesh(cyl(0.2, 0.2, 0.3, 6), darkMat)
    hub.rotation.x = Math.PI / 2
    fanGroup.add(hub)
    for (let b = 0; b < 6; b++) {
      const blade = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.7, 0.06), grayMat)
      blade.position.y = 0.3
      const wrap = new THREE.Group()
      wrap.rotation.z = (b / 6) * Math.PI * 2
      wrap.add(blade)
      fanGroup.add(wrap)
    }
    this.fans.push(fanGroup)
    this.group.add(fanGroup)
    // landing gear (lightweight, 3)
    this.gearGroups.push(this.buildGear(0, -8, 0.5, 0.8))
    this.gearGroups.push(this.buildGear(-3, 1, 0.7, 1.0))
    this.gearGroups.push(this.buildGear(3, 1, 0.7, 1.0))
    for (const g of this.gearGroups) this.group.add(g)
    // nav lights
    const navL = new THREE.Mesh(new THREE.SphereGeometry(0.1, 6, 6), new THREE.MeshStandardMaterial({ color: 0xff0000, emissive: 0xff0000, emissiveIntensity: 2 }))
    navL.position.set(-4.5, 0, 2)
    this.group.add(navL)
    const navR = new THREE.Mesh(new THREE.SphereGeometry(0.1, 6, 6), new THREE.MeshStandardMaterial({ color: 0x00ff00, emissive: 0x00ff00, emissiveIntensity: 2 }))
    navR.position.set(4.5, 0, 2)
    this.group.add(navR)
  }

  /** Extra 300-style aerobatic stunt plane — small, bright red, propeller. */
  private buildStunt() {
    const bodyMat = new THREE.MeshStandardMaterial({ color: this.config.color, roughness: 0.4, metalness: 0.3 })
    const fus = cyl(0.5, 0.4, 6, 8)
    fus.rotateX(Math.PI / 2)
    const fusMesh = new THREE.Mesh(fus, bodyMat)
    fusMesh.castShadow = true
    this.group.add(fusMesh)
    // nose cone + spinner
    const nose = new THREE.ConeGeometry(0.5, 1.5, 8)
    nose.rotateX(-Math.PI / 2)
    const noseMesh = new THREE.Mesh(nose, bodyMat)
    noseMesh.position.set(0, 0, -3.75)
    this.group.add(noseMesh)
    // canopy
    const canopy = new THREE.Mesh(
      new THREE.SphereGeometry(0.4, 8, 6, 0, Math.PI * 2, 0, Math.PI / 2),
      glassMat
    )
    canopy.position.set(0, 0.35, -1)
    canopy.scale.set(1, 1.3, 1.5)
    this.group.add(canopy)
    // wings (mid, symmetrical)
    const wing = new THREE.Mesh(new THREE.BoxGeometry(7, 0.15, 1.2), bodyMat)
    wing.position.set(0, 0, 0.5)
    wing.castShadow = true
    this.group.add(wing)
    // tail
    const vtail = new THREE.Mesh(new THREE.BoxGeometry(0.1, 1, 0.8), bodyMat)
    vtail.position.set(0, 0.6, 2.8)
    vtail.castShadow = true
    this.group.add(vtail)
    const htail = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.1, 0.7), bodyMat)
    htail.position.set(0, 0.3, 2.8)
    htail.castShadow = true
    this.group.add(htail)
    // propeller (2 blades)
    const propGroup = new THREE.Group()
    propGroup.position.set(0, 0, -4.2)
    const hub = new THREE.Mesh(cyl(0.1, 0.1, 0.2, 6), darkMat)
    hub.rotation.x = Math.PI / 2
    propGroup.add(hub)
    for (let b = 0; b < 2; b++) {
      const blade = new THREE.Mesh(new THREE.BoxGeometry(0.05, 1.8, 0.15), darkMat)
      blade.position.y = 0.9
      const wrap = new THREE.Group()
      wrap.rotation.z = (b / 2) * Math.PI * 2
      wrap.add(blade)
      propGroup.add(wrap)
    }
    this.fans.push(propGroup)
    this.group.add(propGroup)
    // fixed landing gear (no retraction on stunt planes)
    this.gearGroups.push(this.buildGear(0, -2.5, 0.4, 0.4))
    this.gearGroups.push(this.buildGear(-1.5, 1, 0.5, 0.5))
    this.gearGroups.push(this.buildGear(1.5, 1, 0.5, 0.5))
    for (const g of this.gearGroups) this.group.add(g)
  }

  /** C-130-style cargo plane — large, 4 turboprops, high wing. */
  private buildCargo() {
    const bodyMat = new THREE.MeshStandardMaterial({ color: this.config.color, roughness: 0.5, metalness: 0.2 })
    const fus = cyl(2.5, 2.5, 28, 10)
    fus.rotateX(Math.PI / 2)
    const fusMesh = new THREE.Mesh(fus, bodyMat)
    fusMesh.castShadow = true
    this.group.add(fusMesh)
    // blunt nose
    const nose = new THREE.Mesh(new THREE.SphereGeometry(2.5, 10, 6), bodyMat)
    nose.position.set(0, 0, -14)
    nose.scale.z = 1.2
    nose.castShadow = true
    this.group.add(nose)
    // cockpit window
    const cockpit = new THREE.Mesh(new THREE.BoxGeometry(4, 1.5, 1.5), glassMat)
    cockpit.position.set(0, 1.5, -12)
    this.group.add(cockpit)
    // high wings (cargo planes have high wing)
    const wing = new THREE.Mesh(new THREE.BoxGeometry(40, 0.6, 5), bodyMat)
    wing.position.set(0, 1.5, 0)
    wing.castShadow = true
    this.group.add(wing)
    // tail (T-tail)
    const vtail = new THREE.Mesh(new THREE.BoxGeometry(0.5, 8, 5), bodyMat)
    vtail.position.set(0, 6, 14)
    vtail.castShadow = true
    this.group.add(vtail)
    const htail = new THREE.Mesh(new THREE.BoxGeometry(14, 0.4, 3), bodyMat)
    htail.position.set(0, 9, 14)
    htail.castShadow = true
    this.group.add(htail)
    // 4 engines on wings
    const enginePos = [
      { x: -16, z: 0 }, { x: -8, z: 0 },
      { x: 8, z: 0 }, { x: 16, z: 0 },
    ]
    for (const ep of enginePos) {
      const engGroup = new THREE.Group()
      engGroup.position.set(ep.x, 1.0, ep.z)
      const nacelle = cyl(0.8, 0.7, 3, 8)
      nacelle.rotateX(Math.PI / 2)
      const nacelleMesh = new THREE.Mesh(nacelle, grayMat)
      nacelleMesh.castShadow = true
      engGroup.add(nacelleMesh)
      // 4-blade prop
      const fanGroup = new THREE.Group()
      fanGroup.position.set(0, 0, -1.5)
      const hub = new THREE.Mesh(cyl(0.3, 0.3, 0.3, 6), darkMat)
      hub.rotation.x = Math.PI / 2
      fanGroup.add(hub)
      for (let b = 0; b < 4; b++) {
        const blade = new THREE.Mesh(new THREE.BoxGeometry(0.1, 1.5, 0.1), grayMat)
        blade.position.y = 0.8
        const wrap = new THREE.Group()
        wrap.rotation.z = (b / 4) * Math.PI * 2
        wrap.add(blade)
        fanGroup.add(wrap)
      }
      engGroup.add(fanGroup)
      this.fans.push(fanGroup)
      this.group.add(engGroup)
    }
    // landing gear (large, fixed-ish)
    this.gearGroups.push(this.buildGear(0, -10, 1.2, 1.5))
    this.gearGroups.push(this.buildGear(-5, 2, 1.5, 1.8))
    this.gearGroups.push(this.buildGear(5, 2, 1.5, 1.8))
    for (const g of this.gearGroups) this.group.add(g)
  }


  private buildGear(x: number, z: number, strutLen: number, wheelR: number): THREE.Group {
    const g = new THREE.Group()
    g.position.set(x, 0, z)
    // strut
    const strut = new THREE.Mesh(cyl(0.18, 0.18, strutLen, 6), grayMat)
    strut.position.y = -strutLen / 2
    strut.castShadow = true
    g.add(strut)
    // wheel
    const wheel = new THREE.Mesh(cyl(wheelR, wheelR, 0.5, 10), tireMat)
    wheel.rotation.z = Math.PI / 2
    wheel.position.y = -strutLen
    wheel.castShadow = true
    g.add(wheel)
    return g
  }

  update(state: FlightState, dt: number, afterburnerActive = false) {
    // spin fans proportional to rpm
    this.fanAngle += (8 + state.rpmNorm * 60) * dt
    for (const f of this.fans) f.rotation.z = this.fanAngle

    // gear retraction target
    const target = state.gearDown ? 0 : 1
    this.gearRetract += (target - this.gearRetract) * (1 - Math.exp(-dt * 3))
    for (const g of this.gearGroups) {
      g.position.y = this.gearRetract * 2.4
      g.scale.y = 1 - this.gearRetract * 0.9
      g.visible = this.gearRetract < 0.98
    }

    // afterburner flame (fighter only)
    if (this.afterburnerFlames.length > 0) {
      const targetIntensity = afterburnerActive ? 1 : 0
      this.afterburnerIntensity += (targetIntensity - this.afterburnerIntensity) * (1 - Math.exp(-dt * 8))
      for (const flame of this.afterburnerFlames) {
        flame.visible = this.afterburnerIntensity > 0.05
        flame.scale.z = 0.5 + this.afterburnerIntensity * 1.5
        flame.scale.x = flame.scale.y = 0.7 + this.afterburnerIntensity * 0.6
      }
    }

    // update crash smoke puffs
    if (this.smokeGroup) {
      this.smokeTimer += dt
      // spawn new puffs while crashed
      if (state.crashed && this.smokeTimer > 0.15 && this.smokePuffs.length < 40) {
        this.smokeTimer = 0
        this.spawnSmoke()
      }
      // animate existing puffs
      for (let i = this.smokePuffs.length - 1; i >= 0; i--) {
        const p = this.smokePuffs[i]
        p.mesh.position.x += p.vel.x * dt
        p.mesh.position.y += p.vel.y * dt
        p.mesh.position.z += p.vel.z * dt
        p.life -= dt
        const scale = 1 + (1 - p.life / 2.5) * 2
        p.mesh.scale.setScalar(scale)
        const mat = p.mesh.material as THREE.MeshStandardMaterial
        mat.opacity = Math.max(0, p.life / 2.5) * 0.6
        if (p.life <= 0) {
          this.smokeGroup.remove(p.mesh)
          p.mesh.geometry.dispose()
          ;(p.mesh.material as THREE.Material).dispose()
          this.smokePuffs.splice(i, 1)
        }
      }
    }
  }

  private spawnSmoke() {
    if (!this.smokeGroup) return
    const geo = new THREE.SphereGeometry(1.5, 6, 6)
    const mat = new THREE.MeshStandardMaterial({
      color: 0x333333,
      transparent: true,
      opacity: 0.6,
      roughness: 1,
    })
    const mesh = new THREE.Mesh(geo, mat)
    // spawn near the fuselage (world-relative to airplane group origin)
    mesh.position.set(
      (Math.random() - 0.5) * 6,
      Math.random() * 3,
      (Math.random() - 0.5) * 10
    )
    this.smokeGroup.add(mesh)
    this.smokePuffs.push({
      mesh,
      vel: new THREE.Vector3(
        (Math.random() - 0.5) * 3,
        2 + Math.random() * 3,
        (Math.random() - 0.5) * 3
      ),
      life: 2.5,
    })
  }

  /** Trigger crash smoke effect. */
  crash() {
    if (this.smokeGroup) return
    this.smokeGroup = new THREE.Group()
    this.group.add(this.smokeGroup)
  }
}
